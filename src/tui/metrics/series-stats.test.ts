import { describe, expect, test } from "bun:test";

import type { Metric, MetricType } from "./metric.ts";
import { seriesStats, statKeys, statLabel } from "./series-stats.ts";
import { HistogramSeries, NumberSeries } from "./series.ts";

const SERIES_IDENTITY = {
  series_id: "1",
  scope_name: null,
  scope_version: null,
  attributes: [],
  resource_attributes: [],
  first_time: new Date(0),
  last_time: new Date(0),
};

function metric(type: MetricType, unit: string, temporality: number | null = 2): Metric {
  return {
    metric_id: "1",
    type,
    temporality,
    name: "metric",
    unit,
    service_name: "checkout",
    description: "",
    last_time: new Date(0),
    series_count: 1,
  };
}

function point(seconds: number, value: number, startSeconds = 0) {
  return { time: new Date(seconds * 1000), start_time: new Date(startSeconds * 1000), value };
}

test("lists the stats that suit each metric type", () => {
  expect(statKeys("gauge")).toEqual(["last", "min", "max"]);
  expect(statKeys("counter")).toEqual(["rate", "total"]);
  expect(statKeys("histogram")).toEqual(["count", "p50", "p95", "p99", "max"]);
  expect(statLabel("total")).toBe("Total");
  expect(statLabel("p95")).toBe("p95");
});

describe("seriesStats", () => {
  test("shows a gauge's last, lowest, and highest values in its unit", () => {
    const series = NumberSeries.parse({
      ...SERIES_IDENTITY,
      stats: { value: 1536, min: 512, max: 2048, latest_points: [] },
    });

    expect(seriesStats(metric("gauge", "By", null), series)).toEqual({
      last: "1.5 KiB",
      min: "512 B",
      max: "2.0 KiB",
    });
  });

  test("shows a cumulative counter's rate over the last export", () => {
    const series = NumberSeries.parse({
      ...SERIES_IDENTITY,
      stats: { value: 150, min: 100, max: 150, latest_points: [point(20, 150), point(10, 100)] },
    });

    expect(seriesStats(metric("counter", "{request}"), series)).toEqual({
      rate: "5/s",
      total: "150",
    });
  });

  test("shows a delta counter's rate from its last point", () => {
    const series = NumberSeries.parse({
      ...SERIES_IDENTITY,
      stats: { value: 70, min: 30, max: 70, latest_points: [point(20, 40, 10), point(10, 30)] },
    });

    expect(seriesStats(metric("counter", "{request}", 1), series)).toEqual({
      rate: "4/s",
      total: "70",
    });
  });

  test("leaves the rate blank before a cumulative counter's second export", () => {
    const series = NumberSeries.parse({
      ...SERIES_IDENTITY,
      stats: { value: 100, min: 100, max: 100, latest_points: [point(10, 100)] },
    });

    expect(seriesStats(metric("counter", "{request}"), series)).toMatchObject({ rate: "" });
  });

  test("shows a histogram's count, percentiles, and max", () => {
    const series = HistogramSeries.parse({
      ...SERIES_IDENTITY,
      stats: {
        count: 10,
        sum: null,
        min: 12,
        max: 80,
        bounds: [10, 20, 50],
        bucket_counts: [0, 4, 4, 2],
      },
    });

    expect(seriesStats(metric("histogram", "ms"), series)).toEqual({
      count: "10",
      p50: "27.5ms",
      p95: "72.5ms",
      p99: "78.5ms",
      max: "80.0ms",
    });
  });

  test("leaves percentiles blank when the buckets cannot place them", () => {
    const series = HistogramSeries.parse({
      ...SERIES_IDENTITY,
      stats: { count: 5, sum: null, min: null, max: null, bounds: [], bucket_counts: [5] },
    });

    expect(seriesStats(metric("histogram", "ms"), series)).toEqual({
      count: "5",
      p50: "",
      p95: "",
      p99: "",
      max: "",
    });
  });
});
