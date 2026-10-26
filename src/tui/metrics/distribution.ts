export interface Bucket {
  lower: number;
  upper: number;
  count: number;
}

interface ExplicitBuckets {
  kind: "explicit";
  bounds: number[];
  counts: number[];
}

interface ExponentialBuckets {
  kind: "exponential";
  scale: number;
  zeroCount: number;
  zeroThreshold: number;
  positive: Map<number, number>;
  negative: Map<number, number>;
}

export interface Distribution {
  count: number;
  sum: number | null;
  min: number | null;
  max: number | null;
  buckets: ExplicitBuckets | ExponentialBuckets;
}

interface IndexedCount {
  index: number;
  count: number;
}

export function explicitBuckets(bounds: number[], counts: number[]) {
  return { kind: "explicit", bounds, counts } satisfies ExplicitBuckets;
}

export function exponentialBuckets(
  scale: number,
  zeroCount: number,
  zeroThreshold: number,
  positive: IndexedCount[],
  negative: IndexedCount[],
) {
  return {
    kind: "exponential",
    scale,
    zeroCount,
    zeroThreshold,
    positive: new Map(positive.map(({ index, count }) => [index, count])),
    negative: new Map(negative.map(({ index, count }) => [index, count])),
  } satisfies ExponentialBuckets;
}

function downscale(counts: Map<number, number>, by: number) {
  if (by === 0) {
    return counts;
  }
  const downscaled = new Map<number, number>();
  for (const [index, count] of counts) {
    const target = index >> by;
    downscaled.set(target, (downscaled.get(target) ?? 0) + count);
  }
  return downscaled;
}

function combineCounts(a: Map<number, number>, b: Map<number, number>, sign: 1 | -1) {
  const combined = new Map(a);
  for (const [index, count] of b) {
    combined.set(index, (combined.get(index) ?? 0) + sign * count);
  }
  return combined;
}

function haveSameBounds(a: ExplicitBuckets, b: ExplicitBuckets) {
  return a.bounds.length === b.bounds.length && a.bounds.every((bound, i) => bound === b.bounds[i]);
}

function combineBuckets(
  a: ExplicitBuckets | ExponentialBuckets,
  b: ExplicitBuckets | ExponentialBuckets,
  sign: 1 | -1,
) {
  if (a.kind === "explicit" && b.kind === "explicit") {
    if (!haveSameBounds(a, b)) {
      return null;
    }
    return explicitBuckets(
      a.bounds,
      a.counts.map((count, i) => count + sign * (b.counts[i] ?? 0)),
    );
  }
  if (a.kind === "exponential" && b.kind === "exponential") {
    const scale = Math.min(a.scale, b.scale);
    return {
      kind: "exponential",
      scale,
      zeroCount: a.zeroCount + sign * b.zeroCount,
      zeroThreshold: Math.max(a.zeroThreshold, b.zeroThreshold),
      positive: combineCounts(
        downscale(a.positive, a.scale - scale),
        downscale(b.positive, b.scale - scale),
        sign,
      ),
      negative: combineCounts(
        downscale(a.negative, a.scale - scale),
        downscale(b.negative, b.scale - scale),
        sign,
      ),
    } satisfies ExponentialBuckets;
  }
  return null;
}

export function hasNegativeCounts({ count, buckets }: Distribution) {
  if (count < 0) {
    return true;
  }
  if (buckets.kind === "explicit") {
    return buckets.counts.some((bucketCount) => bucketCount < 0);
  }
  return (
    buckets.zeroCount < 0 ||
    [...buckets.positive.values(), ...buckets.negative.values()].some(
      (bucketCount) => bucketCount < 0,
    )
  );
}

function combineKnown(
  a: number | null,
  b: number | null,
  combine: (a: number, b: number) => number,
) {
  return a === null || b === null ? null : combine(a, b);
}

export function addDistributions(a: Distribution, b: Distribution) {
  const buckets = combineBuckets(a.buckets, b.buckets, 1);
  if (buckets === null) {
    return null;
  }
  return {
    count: a.count + b.count,
    sum: combineKnown(a.sum, b.sum, (x, y) => x + y),
    min: combineKnown(a.min, b.min, (x, y) => Math.min(x, y)),
    max: combineKnown(a.max, b.max, (x, y) => Math.max(x, y)),
    buckets,
  };
}

export function subtractDistributions(a: Distribution, b: Distribution) {
  const buckets = combineBuckets(a.buckets, b.buckets, -1);
  if (buckets === null) {
    return null;
  }
  return {
    count: a.count - b.count,
    sum: combineKnown(a.sum, b.sum, (x, y) => x - y),
    min: null,
    max: null,
    buckets,
  };
}

function indexRange(counts: Map<number, number>) {
  if (counts.size === 0) {
    return [];
  }
  const indexes = [...counts.keys()];
  const first = Math.min(...indexes);
  return Array.from({ length: Math.max(...indexes) - first + 1 }, (_, offset) => first + offset);
}

export function coarsen(distribution: Distribution, maxBuckets: number) {
  let { buckets } = distribution;
  while (
    buckets.kind === "exponential" &&
    indexRange(buckets.positive).length + indexRange(buckets.negative).length > maxBuckets
  ) {
    buckets = {
      ...buckets,
      scale: buckets.scale - 1,
      positive: downscale(buckets.positive, 1),
      negative: downscale(buckets.negative, 1),
    };
  }
  return { ...distribution, buckets };
}

export function bucketsOf({ buckets }: Distribution) {
  if (buckets.kind === "explicit") {
    return buckets.counts.map((count, i) => ({
      lower: buckets.bounds[i - 1] ?? -Infinity,
      upper: buckets.bounds[i] ?? Infinity,
      count,
    }));
  }
  const base = 2 ** (2 ** -buckets.scale);
  return [
    ...indexRange(buckets.negative)
      .toReversed()
      .map((index) => ({
        lower: -(base ** (index + 1)),
        upper: -(base ** index),
        count: buckets.negative.get(index) ?? 0,
      })),
    { lower: -buckets.zeroThreshold, upper: buckets.zeroThreshold, count: buckets.zeroCount },
    ...indexRange(buckets.positive).map((index) => ({
      lower: base ** index,
      upper: base ** (index + 1),
      count: buckets.positive.get(index) ?? 0,
    })),
  ];
}

export function quantile(distribution: Distribution, q: number) {
  const buckets = bucketsOf(distribution);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total <= 0) {
    return null;
  }
  const min = distribution.min ?? -Infinity;
  const max = distribution.max ?? Infinity;
  const rank = q * total;
  let below = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0 && below + bucket.count >= rank) {
      const lower = Math.max(bucket.lower, min);
      const upper = Math.min(bucket.upper, max);
      if (!Number.isFinite(lower)) {
        return Number.isFinite(upper) ? upper : null;
      }
      if (!Number.isFinite(upper)) {
        return lower;
      }
      return lower + (upper - lower) * ((rank - below) / bucket.count);
    }
    below += bucket.count;
  }
  return distribution.max;
}
