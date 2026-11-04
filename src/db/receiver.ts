import { tmpdir } from "node:os";
import { join } from "node:path";

import { DuckDBConnection, DuckDBInstance, type DuckDBValue } from "@duckdb/node-api";
import { z } from "zod";

import attributeEntries from "./attribute-entries.sql" with { type: "text" };

const OtlpServeRows = z.tuple([
  z.object({ transport: z.literal("http"), listen_url: z.url() }),
  z.object({ transport: z.literal("grpc"), listen_url: z.url() }),
]);

const TELEMETRY_TIMES = {
  otlp_traces: "start_time_unix_nano",
  otlp_logs: "coalesce(time_unix_nano, observed_time_unix_nano)",
  otlp_metrics_gauge: "time_unix_nano",
  otlp_metrics_sum: "time_unix_nano",
  otlp_metrics_histogram: "time_unix_nano",
  otlp_metrics_exp_histogram: "time_unix_nano",
};

const HOST = "127.0.0.1";

export const PRUNE_INTERVAL_MS = 5 * 1000;

const TRIM_START_SHARE = 0.8;
const TRIM_TARGET_SHARE = 0.6;

export interface ReceiverUrls {
  http: string;
  grpc: string;
}

interface ReceiverOptions {
  httpPort: number;
  grpcPort: number;
  retentionMs: number;
  memoryLimitBytes: number;
}

export async function startReceiver({
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

  await connection.run("INSTALL otlp FROM community");
  await connection.run("LOAD otlp");
  await connection.run(attributeEntries);

  const reader = await connection.runAndReadAll(
    `SELECT transport, listen_url FROM otlp_serve(
      [$httpUri, $grpcUri],
      transport := ['http', 'grpc'],
      disable_auth := true,
      seal_max_age_ms := $sealMaxAgeMs,
      max_buffered_bytes := $maxBufferedBytes
    )`,
    {
      httpUri: `otlp:${HOST}:${httpPort}`,
      grpcUri: `otlp:${HOST}:${grpcPort}`,
      sealMaxAgeMs: 500,
      maxBufferedBytes: 32 * 1024 * 1024,
    },
  );
  const [http, grpc] = OtlpServeRows.parse(reader.getRowObjectsJS());
  const urls: ReceiverUrls = { http: http.listen_url, grpc: grpc.listen_url };

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
    for (const [table, time] of Object.entries(TELEMETRY_TIMES)) {
      await connection.run(`DELETE FROM ${table} WHERE ${time} <= $cutoff`, { cutoff });
    }
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
    const times = Object.entries(TELEMETRY_TIMES)
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
    if (bytes <= TRIM_START_SHARE * memoryLimitBytes) {
      return;
    }

    const targetBytes = TRIM_TARGET_SHARE * memoryLimitBytes;
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

  let pruning: Promise<void> | undefined;
  const pruneInterval = setInterval(() => {
    if (pruning !== undefined) {
      return;
    }
    pruning = pruneTelemetry().finally(() => {
      pruning = undefined;
    });
  }, PRUNE_INTERVAL_MS);
  pruneInterval.unref();

  async function close() {
    clearInterval(pruneInterval);
    await pruning;
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
    [Symbol.asyncDispose]: close,
  };
}
