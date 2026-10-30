import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";

import ATTRIBUTE_ENTRIES_SQL from "./attribute-entries.sql" with { type: "text" };

const OtlpServeRow = z.object({ listen_url: z.url() });

const RETENTION_COLUMNS = {
  otlp_traces: "start_time_unix_nano",
  otlp_logs: "time_unix_nano",
  otlp_metrics_gauge: "time_unix_nano",
  otlp_metrics_sum: "time_unix_nano",
  otlp_metrics_histogram: "time_unix_nano",
  otlp_metrics_exp_histogram: "time_unix_nano",
};

const HOST = "127.0.0.1";
const SEAL_MAX_AGE_MS = 500;
const PRUNE_INTERVAL_MS = 30 * 1000;

interface ReceiverOptions {
  port?: number;
  retentionMs?: number;
}

interface Receiver extends AsyncDisposable {
  readonly url: string;
  connect(): Promise<DuckDBConnection>;
}

export async function startReceiver({
  port = 4318,
  retentionMs = 60 * 60 * 1000,
}: ReceiverOptions = {}): Promise<Receiver> {
  const instance = await DuckDBInstance.create(":memory:");
  const control = await instance.connect();

  await control.run("INSTALL otlp FROM community");
  await control.run("LOAD otlp");
  await control.run(ATTRIBUTE_ENTRIES_SQL);

  const uri = `otlp:${HOST}:${port}`;
  const reader = await control.runAndReadAll(
    `SELECT listen_url FROM otlp_serve($uri, disable_auth := true, seal_max_age_ms := $sealMaxAgeMs)`,
    { uri, sealMaxAgeMs: SEAL_MAX_AGE_MS },
  );

  const [otlpServeRow] = reader.getRowObjectsJS();
  const { listen_url: url } = OtlpServeRow.parse(otlpServeRow);

  const connections = new Set<DuckDBConnection>();

  async function connect() {
    const connection = await instance.connect();
    connections.add(connection);
    return connection;
  }

  async function prune() {
    for (const [table, column] of Object.entries(RETENTION_COLUMNS)) {
      await control.run(
        `DELETE FROM ${table} WHERE ${column} < (now() AT TIME ZONE 'UTC') - to_milliseconds($retentionMs)`,
        { retentionMs },
      );
    }
  }

  let pruning: Promise<void> | undefined;
  const pruneInterval = setInterval(() => {
    pruning ??= prune().finally(() => (pruning = undefined));
  }, PRUNE_INTERVAL_MS);
  pruneInterval.unref();

  async function close() {
    clearInterval(pruneInterval);
    await pruning;
    await control.run("SELECT * FROM otlp_stop($uri)", { uri });
    for (const connection of connections) {
      connection.closeSync();
    }
    control.closeSync();
    instance.closeSync();
  }

  return {
    url,
    connect,
    [Symbol.asyncDispose]: close,
  };
}
