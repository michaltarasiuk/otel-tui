import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";

const otlpServeRowSchema = z.object({ listen_url: z.url() });

export interface ReceiverOptions {
  host?: string;
  port?: number;
  /** Max age of buffered rows before they are committed to the tables. */
  sealMaxAgeMs?: number;
}

export interface Receiver {
  readonly connection: DuckDBConnection;
  readonly url: string;
  /** Commits buffered rows so they are visible to queries right away. */
  flush(): Promise<void>;
  /** Commits remaining rows, stops listening and closes the database. */
  close(): Promise<void>;
}

/**
 * Opens an in-memory DuckDB and lets its `otlp` extension receive OTLP/HTTP
 * on `host:port`. Data lands in the `otlp_*` tables.
 */
export async function startReceiver({
  host = "localhost",
  port = 4318,
  sealMaxAgeMs = 500,
}: ReceiverOptions = {}): Promise<Receiver> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  await connection.run("INSTALL otlp FROM community");
  await connection.run("LOAD otlp");

  const uri = `otlp:${host}:${port}`;
  const reader = await connection.runAndReadAll(
    `SELECT listen_url FROM otlp_serve($uri, disable_auth := true, seal_max_age_ms := $sealMaxAgeMs)`,
    { uri, sealMaxAgeMs },
  );
  const rowObjects = reader.getRowObjects();
  const { listen_url: url } = otlpServeRowSchema.parse(rowObjects[0]);

  return {
    connection,
    url,
    async flush() {
      await connection.run("SELECT * FROM otlp_flush($uri)", { uri });
    },
    async close() {
      await connection.run("SELECT * FROM otlp_stop($uri)", { uri });
      connection.closeSync();
      instance.closeSync();
    },
  };
}
