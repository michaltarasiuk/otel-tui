import { z } from "zod";

import { Timestamp } from "../timestamp.ts";

export type MetricType = (typeof METRIC_TYPES)[number];

const METRIC_TYPES = [
  "gauge",
  "counter",
  "updowncounter",
  "histogram",
  "exponential_histogram",
] as const;

const TYPE_LABELS = {
  gauge: "gauge",
  counter: "counter",
  updowncounter: "updowncounter",
  histogram: "histogram",
  exponential_histogram: "exp histogram",
} satisfies Record<MetricType, string>;

const DELTA_TEMPORALITY = 1;
const CUMULATIVE_TEMPORALITY = 2;

export const Metric = z.object({
  metric_id: z.string(),
  type: z.enum(METRIC_TYPES),
  temporality: z.number().nullable(),
  name: z.string(),
  unit: z.string(),
  service_name: z.string().nullable(),
  description: z.string(),
  last_time: Timestamp,
  series_count: z.number(),
});
export type Metric = z.infer<typeof Metric>;

export const METRIC_SORT_COLUMNS = ["name", "series_count", "last_time"] as const;
export type MetricSortColumn = (typeof METRIC_SORT_COLUMNS)[number];

export interface MetricSort {
  column: MetricSortColumn;
  descending: boolean;
}

export function typeLabel(type: MetricType) {
  return TYPE_LABELS[type];
}

export function isDelta(metric: Metric) {
  return metric.temporality === DELTA_TEMPORALITY;
}

export function temporalityLabel(metric: Metric) {
  switch (metric.temporality) {
    case DELTA_TEMPORALITY:
      return "delta";
    case CUMULATIVE_TEMPORALITY:
      return "cumulative";
    default:
      return null;
  }
}
