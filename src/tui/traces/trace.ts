import { z } from "zod";

import { wrapIndex } from "../../utils/wrap-index.ts";

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

const TRACE_SORT_COLUMNS = ["start_time", "span_count", "error_count", "duration_ms"] as const;
export type TraceSortColumn = (typeof TRACE_SORT_COLUMNS)[number];

export interface TraceSort {
  column: TraceSortColumn;
  descending: boolean;
}

export function nextSortColumn(column: TraceSortColumn) {
  return TRACE_SORT_COLUMNS[
    wrapIndex(TRACE_SORT_COLUMNS.indexOf(column) + 1, TRACE_SORT_COLUMNS.length)
  ]!;
}
