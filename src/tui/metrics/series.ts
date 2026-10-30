import { z } from "zod";

import { Attributes } from "../attributes.ts";
import { Timestamp } from "../timestamp.ts";
import { type Distribution, explicitBuckets, exponentialBuckets } from "./distribution.ts";

const IndexedCounts = z
  .array(z.object({ index: z.number(), count: z.number() }))
  .nullish()
  .transform((counts) => counts ?? []);

const ExplicitDistribution = z
  .object({
    count: z.number(),
    sum: z.number().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    bounds: z.array(z.number()),
    bucket_counts: z.array(z.number()),
  })
  .transform(({ bounds, bucket_counts, ...distribution }) => ({
    ...distribution,
    buckets: explicitBuckets(bounds, bucket_counts),
  }));

const ExponentialDistribution = z
  .object({
    count: z.number(),
    sum: z.number().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    scale: z.number(),
    zero_count: z.number(),
    zero_threshold: z.number(),
    positive_buckets: IndexedCounts,
    negative_buckets: IndexedCounts,
  })
  .transform(
    ({
      scale,
      zero_count,
      zero_threshold,
      positive_buckets,
      negative_buckets,
      ...distribution
    }) => ({
      ...distribution,
      buckets: exponentialBuckets(
        scale,
        zero_count,
        zero_threshold,
        positive_buckets,
        negative_buckets,
      ),
    }),
  );

export const NumberPoint = z.object({
  time: Timestamp,
  start_time: Timestamp.nullable(),
  value: z.number(),
});
export type NumberPoint = z.infer<typeof NumberPoint>;

export interface DistributionPoint {
  time: number;
  start_time: number | null;
  distribution: Distribution;
}

export const HistogramPoint = z.object({
  time: Timestamp,
  start_time: Timestamp.nullable(),
  distribution: ExplicitDistribution,
});

export const ExponentialHistogramPoint = z.object({
  time: Timestamp,
  start_time: Timestamp.nullable(),
  distribution: ExponentialDistribution,
});

export type SeriesPoints =
  | { kind: "number"; points: NumberPoint[] }
  | { kind: "distribution"; points: DistributionPoint[] };

const SeriesIdentity = z.object({
  series_id: z.string(),
  scope_name: z.string().nullable(),
  scope_version: z.string().nullable(),
  attributes: Attributes,
  resource_attributes: Attributes,
  first_time: Timestamp,
  last_time: Timestamp,
});

export const NumberSeries = SeriesIdentity.extend({
  stats: z
    .object({
      value: z.number(),
      min: z.number(),
      max: z.number(),
      latest_points: z.array(NumberPoint),
    })
    .transform(({ latest_points, ...stats }) => ({
      kind: "number" as const,
      ...stats,
      latestPoints: latest_points.toReversed(),
    })),
});

export const HistogramSeries = SeriesIdentity.extend({
  stats: ExplicitDistribution.transform((distribution) => ({
    kind: "distribution" as const,
    distribution,
  })),
});

export const ExponentialHistogramSeries = SeriesIdentity.extend({
  stats: ExponentialDistribution.transform((distribution) => ({
    kind: "distribution" as const,
    distribution,
  })),
});

export type Series =
  | z.infer<typeof NumberSeries>
  | z.infer<typeof HistogramSeries>
  | z.infer<typeof ExponentialHistogramSeries>;

export const Exemplar = z.object({
  time: Timestamp,
  value: z.number(),
  trace_id: z.string().nullable(),
  span_id: z.string().nullable(),
});
export type Exemplar = z.infer<typeof Exemplar>;
