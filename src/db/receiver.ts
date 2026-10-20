import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";

const otlpServeRowSchema = z.object({ listen_url: z.url() });

const RETENTION_COLUMNS = {
  otlp_traces: "start_time_unix_nano",
  otlp_logs: "time_unix_nano",
  otlp_metrics_gauge: "time_unix_nano",
  otlp_metrics_sum: "time_unix_nano",
  otlp_metrics_histogram: "time_unix_nano",
  otlp_metrics_exp_histogram: "time_unix_nano",
};

// Auth is off because this is a local dev viewer, so stay on loopback.
const HOST = "localhost";
/** Max age of buffered rows before they are committed to the tables. */
const SEAL_MAX_AGE_MS = 500;
const PRUNE_INTERVAL_MS = 30 * 1000;

export interface ReceiverOptions {
  port?: number;
  retentionMs?: number;
}

export interface Receiver {
  readonly connection: DuckDBConnection;
  readonly url: string;
  /** Commits buffered rows so they are visible to queries right away. */
  flush(): Promise<void>;
  prune(): Promise<void>;
  /** Commits remaining rows, stops listening and closes the database. */
  close(): Promise<void>;
}

/**
 * Opens an in-memory DuckDB and lets its `otlp` extension receive OTLP/HTTP
 * on `localhost:port`. Data lands in the `otlp_*` tables.
 */
export async function startReceiver({
  port = 4318,
  retentionMs = 60 * 60 * 1000,
}: ReceiverOptions = {}): Promise<Receiver> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  // Downloads the extension on first use, so the first start needs network access.
  await connection.run("INSTALL otlp FROM community");
  await connection.run("LOAD otlp");

  // The uri doubles as the handle for otlp_flush/otlp_stop.
  const uri = `otlp:${HOST}:${port}`;
  const reader = await connection.runAndReadAll(
    `SELECT listen_url FROM otlp_serve($uri, disable_auth := true, seal_max_age_ms := $sealMaxAgeMs)`,
    { uri, sealMaxAgeMs: SEAL_MAX_AGE_MS },
  );
  const rowObjects = reader.getRowObjects();
  const { listen_url: url } = otlpServeRowSchema.parse(rowObjects[0]);

  async function prune() {
    for (const [table, column] of Object.entries(RETENTION_COLUMNS)) {
      // Timestamps are stored as UTC without a time zone.
      await connection.run(
        `DELETE FROM ${table} WHERE ${column} < (now() AT TIME ZONE 'UTC') - to_milliseconds($retentionMs)`,
        { retentionMs },
      );
    }
  }

  let pruning: Promise<void> | undefined;
  const pruneTimer = setInterval(() => {
    // Skip a tick rather than queue up when a prune runs long.
    pruning ??= prune()
      .catch((error) => console.error("Pruning old data failed:", error))
      .finally(() => (pruning = undefined));
  }, PRUNE_INTERVAL_MS);
  pruneTimer.unref();

  return {
    connection,
    url,
    async flush() {
      await connection.run("SELECT * FROM otlp_flush($uri)", { uri });
    },
    prune,
    async close() {
      clearInterval(pruneTimer);
      await pruning;
      await connection.run("SELECT * FROM otlp_stop($uri)", { uri });
      connection.closeSync();
      instance.closeSync();
    },
  };
}
