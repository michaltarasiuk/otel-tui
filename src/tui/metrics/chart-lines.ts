import { addDistributions, type Distribution, quantile } from "./distribution.ts";
import type { Interval } from "./intervals.ts";

const MILLISECONDS_PER_SECOND = 1000;
const MISSED_EXPORTS_BEFORE_GAP = 3;

export interface ChartWindow {
  start: number;
  end: number;
  slotCount: number;
}

function slotOf(time: number, { start, end, slotCount }: ChartWindow) {
  if (time < start || time > end) {
    return null;
  }
  return Math.min(slotCount - 1, Math.floor(((time - start) / (end - start)) * slotCount));
}

function emptySlots<T>({ slotCount }: ChartWindow, value: T) {
  return Array.from({ length: slotCount }, () => value);
}

export function meanLine(samples: { time: number; value: number }[], window: ChartWindow) {
  const sums = emptySlots(window, 0);
  const counts = emptySlots(window, 0);
  for (const { time, value } of samples) {
    const slot = slotOf(time, window);
    if (slot !== null) {
      sums[slot]! += value;
      counts[slot]!++;
    }
  }
  return sums.map((sum, slot) => (counts[slot]! > 0 ? sum / counts[slot]! : null));
}

export function rateLine(intervals: Interval<number>[], window: ChartWindow) {
  const increases = emptySlots(window, 0);
  const seconds = emptySlots(window, 0);
  for (const { start, end, value } of intervals) {
    const slot = slotOf(end, window);
    if (slot !== null) {
      increases[slot]! += value;
      seconds[slot]! += (end - start) / MILLISECONDS_PER_SECOND;
    }
  }
  return increases.map((increase, slot) => (seconds[slot]! > 0 ? increase / seconds[slot]! : null));
}

export function quantileLines(
  intervals: Interval<Distribution>[],
  quantiles: readonly number[],
  window: ChartWindow,
) {
  const merged = emptySlots<Distribution | null>(window, null);
  for (const { end, value } of intervals) {
    const slot = slotOf(end, window);
    if (slot !== null) {
      const current = merged[slot] ?? null;
      merged[slot] = current === null ? value : (addDistributions(current, value) ?? current);
    }
  }
  return quantiles.map((q) =>
    merged.map((distribution) => (distribution === null ? null : quantile(distribution, q))),
  );
}

export function gapSlots(times: number[], { start, end, slotCount }: ChartWindow) {
  const spacings = times
    .slice(1)
    .map((time, index) => time - times[index]!)
    .sort((a, b) => a - b);
  const medianSpacing = spacings[Math.floor(spacings.length / 2)] ?? 0;
  const slotDuration = (end - start) / slotCount;
  return Math.max(1, Math.ceil((MISSED_EXPORTS_BEFORE_GAP * medianSpacing) / slotDuration));
}
