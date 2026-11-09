import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import receiverCounters from "./receiver-counters.sql" with { type: "text" };

const ReceiverCounters = z.object({
  total_rows: z.number(),
  last_received_age_ms: z.number().nullable(),
});
export type ReceiverCounters = z.infer<typeof ReceiverCounters>;

export async function readReceiverCounters(connection: DuckDBConnection, listenUrl: string) {
  const reader = await connection.runAndReadAll(receiverCounters, { listenUrl });
  const [counters = null] = ReceiverCounters.array().parse(reader.getRowObjectsJS());
  return counters;
}
