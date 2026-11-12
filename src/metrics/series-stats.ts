import { formatInteger } from "#utils/number.ts";

import { quantile } from "./distribution.ts";
import { latestRate } from "./intervals.ts";
import { formatMetricRate, formatMetricValue } from "./metric-value.ts";
import type { Metric, MetricType } from "./metric.ts";
import type { Series } from "./series.ts";

type StatKey = "rate" | "total" | "last" | "min" | "max" | "count" | "p50" | "p95" | "p99";

export const PERCENTILES = [
  { key: "p50", quantile: 0.5 },
  { key: "p95", quantile: 0.95 },
  { key: "p99", quantile: 0.99 },
] as const;

const STAT_KEYS = {
  gauge: ["last", "min", "max"],
  counter: ["rate", "total"],
  updowncounter: ["last", "min", "max"],
  histogram: ["count", "p50", "p95", "p99", "max"],
  exponential_histogram: ["count", "p50", "p95", "p99", "max"],
} as const satisfies Record<MetricType, readonly StatKey[]>;

const STAT_LABELS = {
  rate: "Rate",
  total: "Total",
  last: "Last",
  min: "Min",
  max: "Max",
  count: "Count",
  p50: "p50",
  p95: "p95",
  p99: "p99",
} satisfies Record<StatKey, string>;

export function statKeys(type: MetricType) {
  return STAT_KEYS[type];
}

export function statLabel(key: StatKey) {
  return STAT_LABELS[key];
}

export function seriesStats(metric: Metric, { stats }: Series): Partial<Record<StatKey, string>> {
  function format(value: number | null) {
    return value === null ? "" : formatMetricValue(value, metric.unit);
  }

  if (stats.kind === "distribution") {
    const { distribution } = stats;
    return {
      count: formatInteger(distribution.count),
      ...Object.fromEntries(
        PERCENTILES.map(({ key, quantile: q }) => [key, format(quantile(distribution, q))]),
      ),
      max: format(distribution.max),
    };
  }
  if (metric.type === "counter") {
    const rate = latestRate(metric, stats.latestPoints);
    return {
      rate: rate === null ? "" : formatMetricRate(rate, metric.unit),
      total: format(stats.value),
    };
  }
  return { last: format(stats.value), min: format(stats.min), max: format(stats.max) };
}
