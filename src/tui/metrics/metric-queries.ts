import type { DuckDBConnection } from "@duckdb/node-api";
import { keepPreviousData, queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { Metric } from "#telemetry/metrics/metric.ts";
import {
  countMetrics,
  listMetrics,
  type MetricQuery,
  readMetricSeries,
  readSeriesExemplars,
  readSeriesPoints,
} from "#telemetry/metrics/read-metrics.ts";
import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

export function useMetricList({ search, sort }: MetricQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", { search, sort }],
    queryFn: () => listMetrics(connection, { search, sort }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useMetricTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", "count"],
    queryFn: () => countMetrics(connection),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

function metricSeriesQuery(connection: DuckDBConnection, metric: Metric) {
  return queryOptions({
    queryKey: ["metrics", metric.metric_id, "series"],
    queryFn: () => readMetricSeries(connection, metric),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMetricSeries(metric: Metric) {
  return useQuery(metricSeriesQuery(useConnection(), metric));
}

export function useSuspenseMetricSeries(metric: Metric) {
  return useSuspenseQuery(metricSeriesQuery(useConnection(), metric));
}

export function useSeriesPoints(metric: Metric, seriesId: string) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "points"],
    queryFn: () => readSeriesPoints(connection, metric, seriesId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSeriesExemplars(metric: Metric, seriesId: string | undefined) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "exemplars"],
    queryFn: () =>
      seriesId === undefined ? [] : readSeriesExemplars(connection, metric, seriesId),
    enabled: seriesId !== undefined,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
