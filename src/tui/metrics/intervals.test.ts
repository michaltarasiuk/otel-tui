import { describe, expect, test } from "bun:test";

import { type Distribution, explicitBuckets } from "./distribution.ts";
import { counterIntervals, distributionIntervals, perSecond } from "./intervals.ts";
import type { DistributionPoint, NumberPoint } from "./series.ts";

function atSecond(seconds: number) {
  return new Date(seconds * 1000);
}

function point(time: number, value: number, startTime: number | null = 0): NumberPoint {
  return {
    time: atSecond(time),
    start_time: startTime === null ? null : atSecond(startTime),
    value,
  };
}

function histogramPoint(time: number, counts: number[], startTime = 0): DistributionPoint {
  const distribution: Distribution = {
    count: counts.reduce((total, count) => total + count, 0),
    sum: null,
    min: null,
    max: null,
    buckets: explicitBuckets([10], counts),
  };
  return { time: atSecond(time), start_time: atSecond(startTime), distribution };
}

describe("counterIntervals", () => {
  test("turns cumulative points into increases between exports", () => {
    const points = [point(10, 5), point(20, 8), point(30, 15)];

    expect(counterIntervals(points, false)).toEqual([
      { start: 10_000, end: 20_000, value: 3 },
      { start: 20_000, end: 30_000, value: 7 },
    ]);
  });

  test("counts a cumulative value since the previous export after a reset", () => {
    expect(counterIntervals([point(10, 5), point(20, 2)], false)).toEqual([
      { start: 10_000, end: 20_000, value: 2 },
    ]);
  });

  test("counts a cumulative value from its new start time", () => {
    expect(counterIntervals([point(10, 5), point(20, 3, 15)], false)).toEqual([
      { start: 15_000, end: 20_000, value: 3 },
    ]);
  });

  test("uses each delta point's own value from its start time", () => {
    expect(counterIntervals([point(10, 5), point(20, 3, 10)], true)).toEqual([
      { start: 0, end: 10_000, value: 5 },
      { start: 10_000, end: 20_000, value: 3 },
    ]);
  });

  test("starts a delta interval no earlier than the previous export", () => {
    expect(counterIntervals([point(10, 5), point(20, 3)], true)).toEqual([
      { start: 0, end: 10_000, value: 5 },
      { start: 10_000, end: 20_000, value: 3 },
    ]);
  });

  test("skips delta points without a known or positive length", () => {
    expect(counterIntervals([point(10, 5, null), point(20, 3, 20)], true)).toEqual([]);
  });
});

describe("distributionIntervals", () => {
  test("subtracts cumulative distributions between exports", () => {
    const [interval] = distributionIntervals(
      [histogramPoint(10, [1, 2]), histogramPoint(20, [4, 2])],
      false,
    );

    expect(interval).toMatchObject({ start: 10_000, end: 20_000 });
    expect(interval?.value.buckets).toEqual(explicitBuckets([10], [3, 0]));
  });

  test("keeps the whole distribution after a reset", () => {
    const [interval] = distributionIntervals(
      [histogramPoint(10, [4, 2]), histogramPoint(20, [1, 1])],
      false,
    );

    expect(interval?.value.buckets).toEqual(explicitBuckets([10], [1, 1]));
  });

  test("uses each delta distribution as it is", () => {
    const intervals = distributionIntervals([histogramPoint(10, [1, 2])], true);

    expect(intervals).toEqual([
      { start: 0, end: 10_000, value: histogramPoint(10, [1, 2]).distribution },
    ]);
  });
});

test("perSecond divides an interval's value by its length", () => {
  expect(perSecond({ start: 0, end: 2000, value: 10 })).toBe(5);
});
