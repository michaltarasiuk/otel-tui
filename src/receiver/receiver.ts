import { tmpdir } from "node:os";
import { join } from "node:path";

import { DuckDBConnection, DuckDBInstance, type DuckDBValue } from "@duckdb/node-api";
import dedent from "dedent";
import { z } from "zod";

import { SECOND_MS } from "#utils/time-units.ts";

import { StartupError } from "../startup-error.ts";
import attributeEntries from "./attribute-entries.sql" with { type: "text" };
import searchFilters from "./search-filters.sql" with { type: "text" };

const OtlpServeRows = z.tuple([
  z.object({ transport: z.literal("http"), listen_url: z.url() }),
  z.object({ transport: z.literal("grpc"), listen_url: z.url() }),
]);

const TABLE_TIME_COLUMNS = {
  otlp_traces: "start_time_unix_nano",
  otlp_logs: "coalesce(time_unix_nano, observed_time_unix_nano, 'epoch'::TIMESTAMP)",
  otlp_metrics_gauge: "time_unix_nano",
  otlp_metrics_sum: "time_unix_nano",
  otlp_metrics_histogram: "time_unix_nano",
  otlp_metrics_exp_histogram: "time_unix_nano",
};

export const PRUNE_INTERVAL_MS = 5 * SECOND_MS;

const TRIM_WHEN_MEMORY_ABOVE = 0.8;
const TRIM_MEMORY_DOWN_TO = 0.6;

export interface ReceiverUrls {
  http: string;
  grpc: string;
}

function firstLine(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0];
}

async function loadOtlpExtension(connection: DuckDBConnection) {
  try {
    await connection.run("INSTALL otlp FROM community");
    await connection.run("LOAD otlp");
  } catch (error) {
    throw new StartupError(
      dedent`
        couldn't install DuckDB's otlp extension; the first run downloads it, so it needs network access once
        ${firstLine(error)}
      `,
      { cause: error },
    );
  }
}

interface ServeOptions {
  host: string;
  httpPort: number;
  grpcPort: number;
}

async function serveOtlp(
  connection: DuckDBConnection,
  { host, httpPort, grpcPort }: ServeOptions,
): Promise<ReceiverUrls> {
  let reader;
  try {
    reader = await connection.runAndReadAll(
      `SELECT transport, listen_url FROM otlp_serve(
        [$httpUri, $grpcUri],
        transport := ['http', 'grpc'],
        disable_auth := true,
        allow_other_hostname := true,
        seal_max_age_ms := $sealMaxAgeMs,
        max_buffered_bytes := $maxBufferedBytes
      )`,
      {
        httpUri: `otlp:${host}:${httpPort}`,
        grpcUri: `otlp:${host}:${grpcPort}`,
        sealMaxAgeMs: 500,
        maxBufferedBytes: 32 * 1024 * 1024,
      },
    );
  } catch (error) {
    throw new StartupError(
      dedent`
        couldn't listen on ${host}:${httpPort} and ${host}:${grpcPort}; another OTLP receiver may be using them, so pick other ports with --http-port and --grpc-port
        ${firstLine(error)}
      `,
      { cause: error },
    );
  }
  const [http, grpc] = OtlpServeRows.parse(reader.getRowObjectsJS());
  return { http: http.listen_url, grpc: grpc.listen_url };
}

interface ReceiverOptions {
  host: string;
  httpPort: number;
  grpcPort: number;
  retentionMs: number;
  memoryLimitBytes: number;
}

export async function startReceiver({
  host,
  httpPort,
  grpcPort,
  retentionMs,
  memoryLimitBytes,
}: ReceiverOptions) {
  const instance = await DuckDBInstance.create(":memory:", {
    memory_limit: `${memoryLimitBytes}B`,
    temp_directory: join(tmpdir(), `otel-tui-${crypto.randomUUID()}`),
  });
  const connection = await instance.connect();

  let urls: ReceiverUrls;
  try {
    await loadOtlpExtension(connection);
    await connection.run(attributeEntries);
    await connection.run(searchFilters);
    urls = await serveOtlp(connection, { host, httpPort, grpcPort });
  } catch (error) {
    connection.closeSync();
    instance.closeSync();
    throw error;
  }

  const connections = new Set<DuckDBConnection>();

  async function connect() {
    const connection = await instance.connect();
    connections.add(connection);
    return connection;
  }

  async function releaseDeletedRows() {
    await connection.run("CHECKPOINT");
  }

  async function deleteTelemetryUpTo(cutoff: DuckDBValue) {
    for (const [table, time] of Object.entries(TABLE_TIME_COLUMNS)) {
      await connection.run(`DELETE FROM ${table} WHERE ${time} <= $cutoff`, { cutoff });
    }
  }

  async function deleteAllTelemetry() {
    for (const table of Object.keys(TABLE_TIME_COLUMNS)) {
      await connection.run(`DELETE FROM ${table}`);
    }
    await releaseDeletedRows();
  }

  async function retentionCutoff() {
    const reader = await connection.runAndReadAll(
      "SELECT (now() AT TIME ZONE 'UTC') - to_milliseconds($retentionMs)",
      { retentionMs },
    );
    return reader.value(0, 0);
  }

  async function storedBytes() {
    const reader = await connection.runAndReadAll(
      "SELECT sum(memory_usage_bytes + temporary_storage_bytes)::FLOAT FROM duckdb_memory()",
    );
    return z.number().parse(reader.value(0, 0));
  }

  async function oldestTelemetryCutoff(share: number) {
    const times = Object.entries(TABLE_TIME_COLUMNS)
      .map(([table, time]) => `SELECT ${time} AS time FROM ${table}`)
      .join(" UNION ALL ");
    const reader = await connection.runAndReadAll(
      `SELECT approx_quantile(time, $share::FLOAT) FROM (${times})`,
      { share },
    );
    return reader.value(0, 0);
  }

  async function trimOldestTelemetry() {
    const bytes = await storedBytes();
    if (bytes <= TRIM_WHEN_MEMORY_ABOVE * memoryLimitBytes) {
      return;
    }

    const targetBytes = TRIM_MEMORY_DOWN_TO * memoryLimitBytes;
    await deleteTelemetryUpTo(await oldestTelemetryCutoff(1 - targetBytes / bytes));
    await releaseDeletedRows();
  }

  async function pruneTelemetry() {
    try {
      await deleteTelemetryUpTo(await retentionCutoff());
      await releaseDeletedRows();
      await trimOldestTelemetry();
    } catch (error) {
      console.error("Failed to prune telemetry", error);
    }
  }

  let deleting: Promise<void> | undefined;

  function startDeleting(task: () => Promise<void>) {
    deleting = task().finally(() => {
      deleting = undefined;
    });
    return deleting;
  }

  async function finishDeleting() {
    while (deleting !== undefined) {
      await Promise.allSettled([deleting]);
    }
  }

  const pruneInterval = setInterval(() => {
    if (deleting === undefined) {
      void startDeleting(() => pruneTelemetry());
    }
  }, PRUNE_INTERVAL_MS);
  pruneInterval.unref();

  async function clear() {
    await finishDeleting();
    await startDeleting(() => deleteAllTelemetry());
  }

  async function close() {
    clearInterval(pruneInterval);
    await finishDeleting();

    await connection.run("SELECT * FROM otlp_stop()");

    for (const connection of connections) {
      connection.closeSync();
    }
    connection.closeSync();
    instance.closeSync();
  }

  return {
    urls,
    connect,
    clear,
    [Symbol.asyncDispose]: close,
  };
}

export type Receiver = Awaited<ReturnType<typeof startReceiver>>;
