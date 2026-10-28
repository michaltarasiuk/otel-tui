import { describe, expect, test } from "bun:test";

import {
  addDistributions,
  bucketsOf,
  coarsen,
  type Distribution,
  explicitBuckets,
  exponentialBuckets,
  hasNegativeCounts,
  quantile,
  subtractDistributions,
} from "./distribution.ts";

type Extremes = Partial<Pick<Distribution, "sum" | "min" | "max">>;

function sumOf(counts: number[]) {
  return counts.reduce((total, count) => total + count, 0);
}

function explicit(bounds: number[], counts: number[], extremes: Extremes = {}): Distribution {
  return {
    count: sumOf(counts),
    sum: null,
    min: null,
    max: null,
    ...extremes,
    buckets: explicitBuckets(bounds, counts),
  };
}

function exponential(
  scale: number,
  positive: Record<number, number>,
  {
    negative = {},
    zeroCount = 0,
    zeroThreshold = 0,
    ...extremes
  }: Extremes & {
    negative?: Record<number, number>;
    zeroCount?: number;
    zeroThreshold?: number;
  } = {},
): Distribution {
  function indexedCounts(counts: Record<number, number>) {
    return Object.entries(counts).map(([index, count]) => ({ index: Number(index), count }));
  }

  return {
    count: zeroCount + sumOf(Object.values(positive)) + sumOf(Object.values(negative)),
    sum: null,
    min: null,
    max: null,
    ...extremes,
    buckets: exponentialBuckets(
      scale,
      zeroCount,
      zeroThreshold,
      indexedCounts(positive),
      indexedCounts(negative),
    ),
  };
}

describe("bucketsOf", () => {
  test("opens the first and last explicit buckets to infinity", () => {
    expect(bucketsOf(explicit([10, 20], [1, 2, 3]))).toEqual([
      { lower: -Infinity, upper: 10, count: 1 },
      { lower: 10, upper: 20, count: 2 },
      { lower: 20, upper: Infinity, count: 3 },
    ]);
  });

  test("orders exponential buckets from negative through zero to positive", () => {
    const distribution = exponential(0, { 0: 2, 2: 3 }, { negative: { 0: 4 }, zeroCount: 1 });

    expect(bucketsOf(distribution)).toEqual([
      { lower: -2, upper: -1, count: 4 },
      { lower: -0, upper: 0, count: 1 },
      { lower: 1, upper: 2, count: 2 },
      { lower: 2, upper: 4, count: 0 },
      { lower: 4, upper: 8, count: 3 },
    ]);
  });

  test("widens the zero bucket to the zero threshold", () => {
    const [, zero] = bucketsOf(exponential(0, {}, { negative: { 0: 1 }, zeroThreshold: 0.5 }));

    expect(zero).toEqual({ lower: -0.5, upper: 0.5, count: 0 });
  });
});

describe("quantile", () => {
  const latencies = explicit([10, 20, 50], [0, 4, 4, 2], { min: 12, max: 80 });

  test("interpolates inside the bucket that holds the rank", () => {
    expect(quantile(latencies, 0.5)).toBe(27.5);
    expect(quantile(latencies, 0.95)).toBe(72.5);
  });

  test("keeps quantiles between the recorded min and max", () => {
    expect(quantile(latencies, 0)).toBe(12);
    expect(quantile(latencies, 1)).toBe(80);
  });

  test("uses the finite edge of an unbounded bucket without a recorded extreme", () => {
    expect(quantile(explicit([10, 20, 50], [0, 4, 4, 2]), 0.95)).toBe(50);
    expect(quantile(explicit([10], [4, 0]), 0.5)).toBe(10);
  });

  test("has no quantile for an empty distribution", () => {
    expect(quantile(explicit([10], [0, 0]), 0.5)).toBeNull();
  });

  test("has no quantile for a single unbounded bucket", () => {
    expect(quantile(explicit([], [5]), 0.5)).toBeNull();
  });

  test("interpolates exponential buckets", () => {
    expect(quantile(exponential(0, { 1: 4 }), 0.5)).toBe(3);
    expect(quantile(exponential(0, { 1: 4 }, { max: 3.5 }), 1)).toBe(3.5);
  });

  test("reaches negative values through the negative buckets", () => {
    const distribution = exponential(0, { 1: 2 }, { negative: { 1: 2 } });

    expect(quantile(distribution, 0.5)).toBe(-2);
    expect(quantile(distribution, 0.75)).toBe(3);
  });
});

describe("addDistributions", () => {
  test("adds explicit buckets with the same bounds", () => {
    const a = explicit([10], [1, 2], { sum: 30, min: 4, max: 15 });
    const b = explicit([10], [3, 4], { sum: 70, min: 2, max: 12 });

    expect(addDistributions(a, b)).toEqual(explicit([10], [4, 6], { sum: 100, min: 2, max: 15 }));
  });

  test("leaves sum, min, and max unknown when either side lacks them", () => {
    const sum = addDistributions(explicit([10], [1, 2], { sum: 30 }), explicit([10], [3, 4]));

    expect(sum).toMatchObject({ count: 10, sum: null, min: null, max: null });
  });

  test("cannot add explicit buckets with different bounds", () => {
    expect(addDistributions(explicit([10], [1, 2]), explicit([20], [1, 2]))).toBeNull();
  });

  test("cannot add explicit and exponential buckets", () => {
    expect(addDistributions(explicit([10], [1, 2]), exponential(0, { 0: 3 }))).toBeNull();
  });

  test("adds exponential buckets at the coarser of the two scales", () => {
    const fine = exponential(1, { 0: 1, 1: 1, 2: 1, 3: 1 }, { zeroCount: 1, zeroThreshold: 0.1 });
    const coarse = exponential(0, { 0: 2 }, { zeroCount: 2, zeroThreshold: 0.2 });

    expect(addDistributions(fine, coarse)).toEqual(
      exponential(0, { 0: 4, 1: 2 }, { zeroCount: 3, zeroThreshold: 0.2 }),
    );
  });
});

describe("subtractDistributions", () => {
  test("subtracts counts and sums, and drops min and max", () => {
    const later = explicit([10], [5, 7], { sum: 120, min: 1, max: 30 });
    const earlier = explicit([10], [2, 3], { sum: 50, min: 1, max: 20 });

    expect(subtractDistributions(later, earlier)).toEqual({
      count: 7,
      sum: 70,
      min: null,
      max: null,
      buckets: explicitBuckets([10], [3, 4]),
    });
  });

  test("cannot subtract incompatible buckets", () => {
    expect(subtractDistributions(explicit([10], [5, 7]), explicit([10, 20], [1, 1, 1]))).toBeNull();
  });
});

describe("hasNegativeCounts", () => {
  test("is false for a distribution of observations", () => {
    expect(hasNegativeCounts(explicit([10], [1, 2]))).toBe(false);
    expect(hasNegativeCounts(exponential(0, { 0: 1 }, { negative: { 0: 1 } }))).toBe(false);
  });

  test("finds a negative count left by subtracting across a reset", () => {
    expect(hasNegativeCounts({ ...explicit([10], [0, 0]), count: -1 })).toBe(true);
    expect(hasNegativeCounts(explicit([10], [-1, 2]))).toBe(true);
    expect(hasNegativeCounts(exponential(0, { 0: 1 }, { zeroCount: -1 }))).toBe(true);
    expect(hasNegativeCounts(exponential(0, { 0: 2 }, { negative: { 3: -2 } }))).toBe(true);
  });
});

describe("coarsen", () => {
  function contiguous(first: number, last: number, count: number) {
    return Object.fromEntries(
      Array.from({ length: last - first + 1 }, (_, offset) => [first + offset, count]),
    );
  }

  test("halves exponential resolution until the buckets fit", () => {
    const coarsened = coarsen(exponential(3, contiguous(0, 19, 1)), 16);

    expect(coarsened.buckets).toEqual(exponential(2, contiguous(0, 9, 2)).buckets);
  });

  test("counts negative and positive buckets together", () => {
    const distribution = exponential(0, contiguous(0, 9, 1), { negative: contiguous(0, 9, 1) });
    const coarsened = coarsen(distribution, 16);

    expect(coarsened.buckets).toMatchObject({ scale: -1 });
    expect(bucketsOf(coarsened)).toHaveLength(5 + 1 + 5);
  });

  test("keeps bucket boundaries aligned for values below one", () => {
    const coarsened = coarsen(exponential(0, contiguous(-4, 15, 1)), 16);

    expect(bucketsOf(coarsened).slice(1, 3)).toEqual([
      { lower: 1 / 16, upper: 1 / 4, count: 2 },
      { lower: 1 / 4, upper: 1, count: 2 },
    ]);
  });

  test("keeps explicit buckets as they are", () => {
    const bounds = Array.from({ length: 30 }, (_, index) => index + 1);
    const distribution = explicit(
      bounds,
      Array.from({ length: bounds.length + 1 }, () => 1),
    );

    expect(coarsen(distribution, 16)).toEqual(distribution);
  });
});
