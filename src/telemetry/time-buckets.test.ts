import { expect, test } from "bun:test";

import { bucketStart, TIME_BUCKET_MS, TimeBucket } from "./time-buckets.ts";

const noon = Date.parse("2026-10-28T12:00:00.000Z");

test("starts a bucket at the last multiple of its width", () => {
  expect(bucketStart(noon)).toBe(noon);
  expect(bucketStart(noon + 9_999)).toBe(noon);
  expect(bucketStart(noon + 10_000)).toBe(noon + 10_000);
});

test("reads a bucket row as a column one bucket wide", () => {
  const row = { bucket_start_ms: noon, count: 2, error_count: 1 };

  expect(TimeBucket.parse(row)).toEqual({
    from: noon,
    to: noon + TIME_BUCKET_MS,
    count: 2,
    errorCount: 1,
  });
});
