import { z } from "zod";

export const Trace = z.object({
  trace_id: z.string(),
  start_time: z.date(),
  service_name: z.string().nullable(),
  name: z.string(),
  span_count: z.number(),
  error_count: z.number(),
  duration_ms: z.number(),
});
export type Trace = z.infer<typeof Trace>;

export const TRACE_SORT_COLUMNS = [
  "start_time",
  "span_count",
  "error_count",
  "duration_ms",
] as const;
export type TraceSortColumn = (typeof TRACE_SORT_COLUMNS)[number];

export interface TraceSort {
  column: TraceSortColumn;
  descending: boolean;
}
