import { z } from "zod";

import type { Sort } from "#utils/sort.ts";

export const SERVICE_SORT_COLUMNS = ["rate", "error_ratio", "p95_ms"] as const;
type ServiceSortColumn = (typeof SERVICE_SORT_COLUMNS)[number];

export type ServiceSort = Sort<ServiceSortColumn>;

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
  p50_ms: z.number(),
  p95_ms: z.number(),
  p99_ms: z.number(),
});
export type Operation = z.infer<typeof Operation>;

export const Call = z.object({
  call_id: z.string(),
  caller: z.string(),
  callee: z.string(),
  is_external: z.boolean(),
  span_count: z.number(),
  rate: z.number(),
  error_ratio: z.number(),
  p50_ms: z.number(),
  p95_ms: z.number(),
  p99_ms: z.number(),
});
export type Call = z.infer<typeof Call>;
