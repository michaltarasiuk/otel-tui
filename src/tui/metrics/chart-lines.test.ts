import { describe, expect, test } from "bun:test";

import { type ChartWindow, gapSlots, meanLine, quantileLines, rateLine } from "./chart-lines.ts";
import { type Distribution, explicitBuckets } from "./distribution.ts";

const SECOND_SLOTS: ChartWindow = { start: 0, end: 10_000, slotCount: 10 };

function distribution(counts: number[]): Distribution {
  return {
    count: counts.reduce((total, count) => total + count, 0),
    sum: null,
    min: 0,
    max: 100,
    buckets: explicitBuckets([10, 100], counts),
  };
}

describe("meanLine", () => {
  test("averages the samples in each slot", () => {
    const samples = [
      { time: 0, value: 2 },
      { time: 500, value: 4 },
      { time: 1500, value: 10 },
    ];

    expect(meanLine(samples, SECOND_SLOTS).slice(0, 3)).toEqual([3, 10, null]);
  });

  test("puts a sample at the window end in the last slot", () => {
    expect(meanLine([{ time: 10_000, value: 7 }], SECOND_SLOTS).at(-1)).toBe(7);
  });

  test("drops samples outside the window", () => {
    const samples = [
      { time: -1, value: 1 },
      { time: 10_001, value: 1 },
    ];

    expect(meanLine(samples, SECOND_SLOTS)).toEqual(Array.from({ length: 10 }, () => null));
  });
});

describe("rateLine", () => {
  test("divides the increases ending in each slot by their length", () => {
    const intervals = [
      { start: 0, end: 1000, value: 5 },
      { start: 1000, end: 1500, value: 10 },
      { start: 1500, end: 4500, value: 3 },
    ];

    expect(rateLine(intervals, SECOND_SLOTS).slice(0, 5)).toEqual([null, 10, null, null, 1]);
  });
});

describe("quantileLines", () => {
  test("merges the distributions ending in each slot before taking quantiles", () => {
    const intervals = [
      { start: 0, end: 100, value: distribution([2, 0, 0]) },
      { start: 100, end: 200, value: distribution([0, 2, 0]) },
      { start: 1000, end: 1200, value: distribution([0, 0, 4]) },
    ];

    const [median, max] = quantileLines(intervals, [0.5, 1], SECOND_SLOTS);

    expect(median?.slice(0, 3)).toEqual([10, 100, null]);
    expect(max?.slice(0, 3)).toEqual([100, 100, null]);
  });

  test("keeps the first distribution of a slot when the next has other bounds", () => {
    const otherBounds = { ...distribution([0, 0, 0]), buckets: explicitBuckets([50], [0, 9]) };
    const intervals = [
      { start: 0, end: 100, value: distribution([4, 0, 0]) },
      { start: 100, end: 200, value: otherBounds },
    ];

    const [median] = quantileLines(intervals, [0.5], SECOND_SLOTS);

    expect(median?.[0]).toBe(5);
  });
});

describe("gapSlots", () => {
  test("allows three missed exports before breaking the line", () => {
    expect(gapSlots([0, 1000, 2000, 3000, 9000], SECOND_SLOTS)).toBe(3);
  });

  test("allows at least one slot", () => {
    expect(gapSlots([], SECOND_SLOTS)).toBe(1);
    expect(gapSlots([500], SECOND_SLOTS)).toBe(1);
    expect(gapSlots([500, 500], SECOND_SLOTS)).toBe(1);
  });
});
