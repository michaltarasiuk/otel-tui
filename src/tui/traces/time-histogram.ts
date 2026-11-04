import { z } from "zod";

import { formatTime } from "../../utils/time.ts";
import type { HistogramColumn, HistogramRange } from "./histogram.ts";

const LABEL_GAP = 2;
const LABEL_WIDTHS = {
  minute: "00:00".length,
  second: "00:00:00".length,
};

export const TIME_BUCKET_MS = 10 * 1000;
export const TIME_SCALE_LABEL = `${TIME_BUCKET_MS / 1000}s per column`;

const TICK_INTERVALS_MS = [
  1000,
  2 * 1000,
  5 * 1000,
  10 * 1000,
  15 * 1000,
  30 * 1000,
  60 * 1000,
  2 * 60 * 1000,
  5 * 60 * 1000,
  10 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
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
  return intervalMs < 60 * 1000 ? "second" : "minute";
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
  return `${formatTime(from, precision)}–${formatTime(to, precision)}`;
}

function tickInterval(columnWidth: number) {
  return (
    TICK_INTERVALS_MS.find(
      (interval) =>
        (interval / TIME_BUCKET_MS) * columnWidth >=
        LABEL_WIDTHS[clockPrecision(interval)] + LABEL_GAP,
    ) ?? 24 * 60 * 60 * 1000
  );
}

export function timeAxis(columns: HistogramColumn[], columnWidth: number) {
  const interval = tickInterval(columnWidth);
  const precision = clockPrecision(interval);
  const axisWidth = columns.length * columnWidth;
  let axis = "";
  for (const [position, { from }] of columns.entries()) {
    const localFrom = from - new Date(from).getTimezoneOffset() * 60 * 1000;
    const untilTick = (interval - (localFrom % interval)) % interval;
    if (untilTick >= TIME_BUCKET_MS) {
      continue;
    }
    const label = formatTime(from + untilTick, precision);
    const labelStart = position * columnWidth;
    if (labelStart + label.length <= axisWidth) {
      axis = axis.padEnd(labelStart) + label;
    }
  }
  return axis;
}
