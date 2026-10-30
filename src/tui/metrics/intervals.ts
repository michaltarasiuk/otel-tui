import { MILLISECONDS_PER_SECOND } from "../../utils/time-units.ts";
import { type Distribution, hasNegativeCounts, subtractDistributions } from "./distribution.ts";
import type { DistributionPoint, NumberPoint } from "./series.ts";

export interface Interval<T> {
  start: number;
  end: number;
  value: T;
}

interface TimedPoint {
  time: number;
  start_time: number | null;
}

function sameStart(a: TimedPoint, b: TimedPoint) {
  return a.start_time === b.start_time;
}

function intervalsOf<P extends TimedPoint, T>(
  points: P[],
  delta: boolean,
  ownValue: (point: P) => T,
  increaseSince: (point: P, previous: P) => T | null,
) {
  const intervals: Interval<T>[] = [];
  for (const [index, point] of points.entries()) {
    const previous = points[index - 1];
    const end = point.time;
    if (!delta) {
      if (previous === undefined) {
        continue;
      }
      const increase = sameStart(point, previous) ? increaseSince(point, previous) : null;
      if (increase !== null) {
        intervals.push({ start: previous.time, end, value: increase });
        continue;
      }
    }
    const start = Math.max(point.start_time ?? -Infinity, previous?.time ?? -Infinity);
    if (Number.isFinite(start) && start < end) {
      intervals.push({ start, end, value: ownValue(point) });
    }
  }
  return intervals;
}

export function counterIntervals(points: NumberPoint[], delta: boolean) {
  return intervalsOf(
    points,
    delta,
    (point) => point.value,
    (point, previous) => (point.value >= previous.value ? point.value - previous.value : null),
  );
}

export function distributionIntervals(points: DistributionPoint[], delta: boolean) {
  return intervalsOf<DistributionPoint, Distribution>(
    points,
    delta,
    (point) => point.distribution,
    (point, previous) => {
      const increase = subtractDistributions(point.distribution, previous.distribution);
      return increase === null || hasNegativeCounts(increase) ? null : increase;
    },
  );
}

export function perSecond(interval: Interval<number>) {
  return (interval.value * MILLISECONDS_PER_SECOND) / (interval.end - interval.start);
}
