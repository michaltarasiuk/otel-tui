import { z } from "zod";

import { formatTimeOfDay } from "#utils/format-time-of-day.ts";
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from "#utils/time-units.ts";

import type { HistogramColumn, HistogramRange } from "./histogram.ts";

const LABEL_GAP = 2;
const LABEL_WIDTHS = {
  minute: "00:00".length,
  second: "00:00:00".length,
};

export const TIME_BUCKET_MS = 10 * SECOND_MS;
export const TIME_SCALE_LABEL = `${TIME_BUCKET_MS / SECOND_MS}s per column`;

const TICK_INTERVALS_MS = [
  SECOND_MS,
  2 * SECOND_MS,
  5 * SECOND_MS,
  10 * SECOND_MS,
  15 * SECOND_MS,
  30 * SECOND_MS,
  MINUTE_MS,
  2 * MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  2 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
];

export const TimeBucket = z
  .object({
    bucket_start_ms: z.number(),
    trace_count: z.number(),
    error_count: z.number(),
  })
  .transform(
    (row) =>
      ({
        from: row.bucket_start_ms,
        to: row.bucket_start_ms + TIME_BUCKET_MS,
        traceCount: row.trace_count,
        errorCount: row.error_count,
      }) satisfies HistogramColumn,
  );

export function bucketStart(timeMs: number) {
  return Math.floor(timeMs / TIME_BUCKET_MS) * TIME_BUCKET_MS;
}

function clockPrecision(intervalMs: number) {
  return intervalMs < MINUTE_MS ? "second" : "minute";
}

export function timeColumns(
  occupied: HistogramColumn[],
  newestBucketMs: number,
  columnCount: number,
  selected: HistogramRange | undefined,
) {
  const centered =
    (selected?.from ?? newestBucketMs) + Math.floor(columnCount / 2) * TIME_BUCKET_MS;
  const end = Math.min(newestBucketMs, centered);
  const start = end - (columnCount - 1) * TIME_BUCKET_MS;
  const occupiedByStart = new Map(occupied.map((column) => [column.from, column]));

  return Array.from({ length: columnCount }, (_, offset) => {
    const from = start + offset * TIME_BUCKET_MS;
    return (
      occupiedByStart.get(from) ??
      ({ from, to: from + TIME_BUCKET_MS, traceCount: 0, errorCount: 0 } satisfies HistogramColumn)
    );
  });
}

export function hiddenTraces(occupied: HistogramColumn[], columns: HistogramColumn[]) {
  const first = columns.at(0);
  const last = columns.at(-1);
  if (first === undefined || last === undefined) {
    return { earlier: false, later: false };
  }

  return {
    earlier: occupied.some((column) => column.to <= first.from),
    later: occupied.some((column) => column.from >= last.to),
  };
}

export function timeRangeLabel({ from, to }: HistogramRange) {
  const precision = clockPrecision(to - from);
  return `${formatTimeOfDay(from, precision)}–${formatTimeOfDay(to, precision)}`;
}

function tickInterval(columnWidth: number) {
  return (
    TICK_INTERVALS_MS.find(
      (interval) =>
        (interval / TIME_BUCKET_MS) * columnWidth >=
        LABEL_WIDTHS[clockPrecision(interval)] + LABEL_GAP,
    ) ?? DAY_MS
  );
}

export function timeAxis(columns: HistogramColumn[], columnWidth: number) {
  const interval = tickInterval(columnWidth);
  const precision = clockPrecision(interval);
  const axisWidth = columns.length * columnWidth;
  let axis = "";

  for (const [position, { from }] of columns.entries()) {
    const localFrom = from - new Date(from).getTimezoneOffset() * MINUTE_MS;
    const untilTick = (interval - (localFrom % interval)) % interval;
    if (untilTick >= TIME_BUCKET_MS) {
      continue;
    }
    const label = formatTimeOfDay(from + untilTick, precision);
    const labelStart = position * columnWidth;
    if (labelStart + label.length <= axisWidth) {
      axis = axis.padEnd(labelStart) + label;
    }
  }

  return axis;
}
