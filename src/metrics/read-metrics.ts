import type { DuckDBConnection } from "@duckdb/node-api";
import { z } from "zod";

import exponentialHistogramPoints from "#metrics/sql/exponential-histogram-points.sql" with { type: "text" };
import exponentialHistogramSeries from "#metrics/sql/exponential-histogram-series.sql" with { type: "text" };
import histogramPoints from "#metrics/sql/histogram-points.sql" with { type: "text" };
import histogramSeries from "#metrics/sql/histogram-series.sql" with { type: "text" };
import metricCount from "#metrics/sql/metric-count.sql" with { type: "text" };
import metricList from "#metrics/sql/metric-list.sql" with { type: "text" };
import numberPoints from "#metrics/sql/number-points.sql" with { type: "text" };
import numberSeries from "#metrics/sql/number-series.sql" with { type: "text" };
import seriesExemplars from "#metrics/sql/series-exemplars.sql" with { type: "text" };
import { searchParams } from "#telemetry/search.ts";

import { Metric, type MetricSort } from "./metric.ts";
import {
  Exemplar,
  ExponentialHistogramPoint,
  ExponentialHistogramSeries,
  HistogramPoint,
  HistogramSeries,
  NumberPoint,
  NumberSeries,
} from "./series.ts";

const METRIC_LIMIT = 500;
const EXEMPLAR_LIMIT = 10;

function metricIdentity(metric: Metric) {
  return {
    name: metric.name,
    unit: metric.unit,
    serviceName: metric.service_name,
    temporality: metric.temporality,
  };
}

export interface MetricQuery {
  search: string;
  sort: MetricSort;
}

export async function readMetricList(connection: DuckDBConnection, { search, sort }: MetricQuery) {
  const reader = await connection.runAndReadAll(metricList, {
    limit: METRIC_LIMIT,
    ...searchParams(search),
    sortBy: sort.column,
    direction: sort.descending ? -1 : 1,
  });
  return Metric.array().parse(reader.getRowObjectsJS());
}

export async function readMetricCount(connection: DuckDBConnection) {
  const reader = await connection.runAndReadAll(metricCount);
  return z.number().parse(reader.value(0, 0));
}

export async function readMetricSeries(connection: DuckDBConnection, metric: Metric) {
  const identity = metricIdentity(metric);
  switch (metric.type) {
    case "gauge":
    case "counter":
    case "updowncounter": {
      const reader = await connection.runAndReadAll(numberSeries, {
        ...identity,
        type: metric.type,
      });
      return NumberSeries.array().parse(reader.getRowObjectsJS());
    }
    case "histogram": {
      const reader = await connection.runAndReadAll(histogramSeries, identity);
      return HistogramSeries.array().parse(reader.getRowObjectsJS());
    }
    case "exponential_histogram": {
      const reader = await connection.runAndReadAll(exponentialHistogramSeries, identity);
      return ExponentialHistogramSeries.array().parse(reader.getRowObjectsJS());
    }
    default:
      metric.type satisfies never;
      throw new Error(`Unknown metric type: ${metric.type}`);
  }
}

export async function readSeriesPoints(
  connection: DuckDBConnection,
  metric: Metric,
  seriesId: string,
) {
  const identity = { ...metricIdentity(metric), seriesId };
  switch (metric.type) {
    case "gauge":
    case "counter":
    case "updowncounter": {
      const reader = await connection.runAndReadAll(numberPoints, {
        ...identity,
        type: metric.type,
      });
      return {
        kind: "number" as const,
        points: NumberPoint.array().parse(reader.getRowObjectsJS()),
      };
    }
    case "histogram": {
      const reader = await connection.runAndReadAll(histogramPoints, identity);
      return {
        kind: "distribution" as const,
        points: HistogramPoint.array().parse(reader.getRowObjectsJS()),
      };
    }
    case "exponential_histogram": {
      const reader = await connection.runAndReadAll(exponentialHistogramPoints, identity);
      return {
        kind: "distribution" as const,
        points: ExponentialHistogramPoint.array().parse(reader.getRowObjectsJS()),
      };
    }
    default:
      metric.type satisfies never;
      throw new Error(`Unknown metric type: ${metric.type}`);
  }
}

export async function readSeriesExemplars(
  connection: DuckDBConnection,
  metric: Metric,
  seriesId: string,
) {
  const reader = await connection.runAndReadAll(seriesExemplars, {
    ...metricIdentity(metric),
    type: metric.type,
    seriesId,
    limit: EXEMPLAR_LIMIT,
  });
  return Exemplar.array().parse(reader.getRowObjectsJS());
}
