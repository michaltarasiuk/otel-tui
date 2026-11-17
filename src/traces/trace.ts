import { z } from "zod";

import { Timestamp } from "#telemetry/timestamp.ts";
import type { Sort } from "#utils/sort.ts";

export const Trace = z.object({
  trace_id: z.string(),
  start_time: Timestamp,
  service_name: z.string().nullable(),
  name: z.string(),
  span_count: z.number(),
  error_count: z.number(),
  duration_ms: z.number(),
  operation_span_id: z.string().nullable(),
});
export type Trace = z.infer<typeof Trace>;

type RootName = Pick<Trace, "service_name" | "name">;

export interface MarkedTrace {
  traceId: string;
  root: RootName;
}

export function sameRoot(a: RootName, b: RootName) {
  return a.service_name === b.service_name && a.name === b.name;
}

export const TRACE_SORT_COLUMNS = [
  "start_time",
  "span_count",
  "error_count",
  "duration_ms",
] as const;
export type TraceSortColumn = (typeof TRACE_SORT_COLUMNS)[number];

export type TraceSort = Sort<TraceSortColumn>;
