import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions } from "@tanstack/react-query";

import { POLL_INTERVAL_MS } from "#query/polling.ts";

import type { Metric } from "./metric.ts";
import {
  type MetricQuery,
  readMetricCount,
  readMetricList,
  readMetricSeries,
  readSeriesExemplars,
  readSeriesPoints,
} from "./read-metrics.ts";

export function metricListQuery(connection: DuckDBConnection, query: MetricQuery) {
  return queryOptions({
    queryKey: ["metrics", query],
    queryFn: async () => {
      const [metrics, totalCount] = await Promise.all([
        readMetricList(connection, query),
        readMetricCount(connection),
      ]);
      return { metrics, totalCount };
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function metricSeriesQuery(connection: DuckDBConnection, metric: Metric) {
  return queryOptions({
    queryKey: ["metrics", metric.metric_id, "series"],
    queryFn: () => readMetricSeries(connection, metric),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function seriesPointsQuery(connection: DuckDBConnection, metric: Metric, seriesId: string) {
  return queryOptions({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "points"],
    queryFn: () => readSeriesPoints(connection, metric, seriesId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function seriesExemplarsQuery(
  connection: DuckDBConnection,
  metric: Metric,
  seriesId: string | undefined,
) {
  return queryOptions({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "exemplars"],
    queryFn: () =>
      seriesId === undefined ? [] : readSeriesExemplars(connection, metric, seriesId),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });
}
