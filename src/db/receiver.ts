import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";

import { MILLISECONDS_PER_SECOND } from "../utils/time-units.ts";
import ATTRIBUTE_ENTRIES_SQL from "./attribute-entries.sql" with { type: "text" };

const OtlpServeRows = z.tuple([
  z.object({ transport: z.literal("http"), listen_url: z.url() }),
  z.object({ transport: z.literal("grpc"), listen_url: z.url() }),
]);

const RETENTION_TIMES = {
  otlp_traces: "start_time_unix_nano",
  otlp_logs: "coalesce(time_unix_nano, observed_time_unix_nano)",
  otlp_metrics_gauge: "time_unix_nano",
  otlp_metrics_sum: "time_unix_nano",
  otlp_metrics_histogram: "time_unix_nano",
  otlp_metrics_exp_histogram: "time_unix_nano",
};

const HOST = "127.0.0.1";
const SEAL_MAX_AGE_MS = 500;
export const PRUNE_INTERVAL_MS = 30 * MILLISECONDS_PER_SECOND;

export interface ReceiverUrls {
  http: string;
  grpc: string;
}

interface ReceiverOptions {
  httpPort: number;
  grpcPort: number;
  retentionMs: number;
}

export async function startReceiver({ httpPort, grpcPort, retentionMs }: ReceiverOptions) {
  const instance = await DuckDBInstance.create(":memory:");
  const control = await instance.connect();

  await control.run("INSTALL otlp FROM community");
  await control.run("LOAD otlp");
  await control.run(ATTRIBUTE_ENTRIES_SQL);

  const reader = await control.runAndReadAll(
    `SELECT transport, listen_url FROM otlp_serve(
      [$httpUri, $grpcUri],
      transport := ['http', 'grpc'],
      disable_auth := true,
      seal_max_age_ms := $sealMaxAgeMs
    )`,
    {
      httpUri: `otlp:${HOST}:${httpPort}`,
      grpcUri: `otlp:${HOST}:${grpcPort}`,
      sealMaxAgeMs: SEAL_MAX_AGE_MS,
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

  async function prune() {
    for (const [table, time] of Object.entries(RETENTION_TIMES)) {
      await control.run(
        `DELETE FROM ${table} WHERE ${time} < (now() AT TIME ZONE 'UTC') - to_milliseconds($retentionMs)`,
        { retentionMs },
      );
    }
  }

  let pruning: Promise<void> | undefined;
  const pruneInterval = setInterval(() => {
    pruning ??= prune()
      .catch((error) => console.error("Failed to prune expired telemetry", error))
      .finally(() => (pruning = undefined));
  }, PRUNE_INTERVAL_MS);
  pruneInterval.unref();

  async function close() {
    clearInterval(pruneInterval);
    await pruning;
    await control.run("SELECT * FROM otlp_stop()");
    for (const connection of connections) {
      connection.closeSync();
    }
    control.closeSync();
    instance.closeSync();
  }

  return {
    urls,
    connect,
    [Symbol.asyncDispose]: close,
  };
}
