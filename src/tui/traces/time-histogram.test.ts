import { expect, test } from "bun:test";

import { MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND } from "../../utils/time.ts";
import type { HistogramColumn } from "./histogram.ts";
import {
  bucketStart,
  hiddenTraces,
  TIME_BUCKET_MS,
  TIME_SCALE_LABEL,
  TimeBucket,
  timeAxis,
  timeColumns,
  timeRangeLabel,
} from "./time-histogram.ts";

const SECOND = MILLISECONDS_PER_SECOND;

const noon = Date.parse("2026-10-28T12:00:00.000Z");

function column(startMs: number, traceCount = 0, errorCount = 0) {
  return {
    from: startMs,
    to: startMs + TIME_BUCKET_MS,
    traceCount,
    errorCount,
  } satisfies HistogramColumn;
}

function emptyColumns(startMs: number, count: number) {
  return Array.from({ length: count }, (_, offset) => column(startMs + offset * TIME_BUCKET_MS));
}

test("buckets the timeline in fixed slices and says so", () => {
  expect(TIME_BUCKET_MS).toBe(10_000);
  expect(TIME_SCALE_LABEL).toBe("10s per column");
});

test("starts a bucket at the last multiple of its width", () => {
  expect(bucketStart(noon)).toBe(noon);
  expect(bucketStart(noon + 9_999)).toBe(noon);
  expect(bucketStart(noon + 10_000)).toBe(noon + 10_000);
});

test("reads a bucket row as a column one bucket wide", () => {
  const row = { bucket_start_ms: noon, trace_count: 2, error_count: 1 };

  expect(TimeBucket.parse(row)).toEqual({
    from: noon,
    to: noon + TIME_BUCKET_MS,
    traceCount: 2,
    errorCount: 1,
  });
});

test("ends the columns at the newest bucket and fills the gaps", () => {
  const occupied = [column(noon, 2, 1), column(noon + 20 * SECOND, 3)];

  const columns = timeColumns(occupied, noon + 30 * SECOND, 5, undefined);

  expect(columns).toEqual([
    column(noon - 10 * SECOND),
    column(noon, 2, 1),
    column(noon + 10 * SECOND),
    column(noon + 20 * SECOND, 3),
    column(noon + 30 * SECOND),
  ]);
});

test("leaves out buckets before the first column", () => {
  const occupied = [column(noon - 60 * SECOND, 4), column(noon + 30 * SECOND, 1)];

  const columns = timeColumns(occupied, noon + 30 * SECOND, 3, undefined);

  expect(columns.map(({ traceCount }) => traceCount)).toEqual([0, 0, 1]);
});

test("centers the columns on the selected bucket, up to the newest bucket", () => {
  const occupied = [column(noon - 600 * SECOND, 1), column(noon, 1)];
  const newestBucketMs = noon + 30 * SECOND;
  const select = (from: number) => ({ from, to: from + TIME_BUCKET_MS });

  const older = timeColumns(occupied, newestBucketMs, 5, select(noon - 600 * SECOND));
  const newest = timeColumns(occupied, newestBucketMs, 5, select(newestBucketMs));

  expect(older.map(({ from }) => from)).toEqual(
    [-620, -610, -600, -590, -580].map((seconds) => noon + seconds * SECOND),
  );
  expect(newest.at(-1)?.from).toBe(newestBucketMs);
});

test("has no columns when there is no room for one", () => {
  expect(timeColumns([column(noon, 1)], noon, 0, undefined)).toEqual([]);
});

test("reports traces before and after the columns", () => {
  const columns = emptyColumns(noon, 3);

  expect(hiddenTraces([column(noon - 10 * SECOND, 1)], columns)).toEqual({
    earlier: true,
    later: false,
  });
  expect(hiddenTraces([column(noon + 30 * SECOND, 1)], columns)).toEqual({
    earlier: false,
    later: true,
  });
  expect(hiddenTraces([column(noon + 10 * SECOND, 1)], columns)).toEqual({
    earlier: false,
    later: false,
  });
  expect(hiddenTraces([], [])).toEqual({ earlier: false, later: false });
});

test("labels a range with the times it starts and ends, to the second under a minute", () => {
  expect(timeRangeLabel({ from: noon, to: noon + 10_000 })).toBe("12:00:00–12:00:10");
  expect(timeRangeLabel({ from: noon, to: noon + 5 * MILLISECONDS_PER_MINUTE })).toBe(
    "12:00–12:05",
  );
});

test("labels the axis to the minute at round times, far enough apart to read", () => {
  const columns = emptyColumns(noon - 30 * SECOND, 20);

  expect(timeAxis(columns, 2)).toBe(
    `${" ".repeat(6)}12:00${" ".repeat(7)}12:01${" ".repeat(7)}12:02`,
  );
});

test("widens the tick interval when the columns are narrower", () => {
  const columns = emptyColumns(noon - 30 * SECOND, 60);

  expect(timeAxis(columns, 1).trim().split(/\s+/)).toEqual([
    "12:00",
    "12:02",
    "12:04",
    "12:06",
    "12:08",
  ]);
});

test("skips a tick whose label would run past the last column", () => {
  const columns = emptyColumns(noon - 20 * SECOND, 4);

  expect(timeAxis(columns, 2)).toBe("");
});

test("has no axis without columns", () => {
  expect(timeAxis([], 2)).toBe("");
});
