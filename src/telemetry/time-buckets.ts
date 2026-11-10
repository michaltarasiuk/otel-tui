import { z } from "zod";

import { SECOND_MS } from "#utils/time.ts";

export const TIME_BUCKET_MS = 10 * SECOND_MS;

export interface TimeRange {
  from: number;
  to: number;
}

export const TimeBucket = z
  .object({ bucket_start_ms: z.number(), count: z.number(), error_count: z.number() })
  .transform((row) => ({
    from: row.bucket_start_ms,
    to: row.bucket_start_ms + TIME_BUCKET_MS,
    count: row.count,
    errorCount: row.error_count,
  }));
export type TimeBucket = z.infer<typeof TimeBucket>;

export function bucketStart(timeMs: number) {
  return Math.floor(timeMs / TIME_BUCKET_MS) * TIME_BUCKET_MS;
}
