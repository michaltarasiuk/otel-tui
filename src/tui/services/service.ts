import { z } from "zod";

export const SERVICE_SORT_COLUMNS = ["rate", "error_ratio", "p95_ms"] as const;
type ServiceSortColumn = (typeof SERVICE_SORT_COLUMNS)[number];

export interface ServiceSort {
  column: ServiceSortColumn;
  descending: boolean;
}

export const Service = z.object({
  service_name: z.string(),
  span_count: z.number(),
  rate: z.number(),
  error_ratio: z.number(),
  p50_ms: z.number(),
  p95_ms: z.number(),
  p99_ms: z.number(),
});
export type Service = z.infer<typeof Service>;

export const Operation = z.object({
  name: z.string(),
  span_count: z.number(),
  rate: z.number(),
  error_ratio: z.number(),
  p95_ms: z.number(),
});
export type Operation = z.infer<typeof Operation>;
