import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

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

async function readMetricList(connection: DuckDBConnection, query: MetricQuery) {
  const [metrics, totalCount] = await Promise.all([
    listMetrics(connection, query),
    countMetrics(connection),
  ]);
  return { metrics, totalCount };
}

export function useMetrics({ search, sort }: MetricQuery) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["metrics", { search, sort }],
    queryFn: () => readMetricList(connection, { search, sort }),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMetricSeries(metric: Metric) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["metrics", metric.metric_id, "series"],
    queryFn: () => readMetricSeries(connection, metric),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSeriesPoints(metric: Metric, seriesId: string) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "points"],
    queryFn: () => readSeriesPoints(connection, metric, seriesId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

function seriesExemplarsQuery(
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

export function useSeriesExemplars(metric: Metric, seriesId: string | undefined) {
  const options = seriesExemplarsQuery(useConnection(), metric, seriesId);

  return useQuery({ ...options, enabled: seriesId !== undefined });
}

export function useSuspenseSeriesExemplars(metric: Metric, seriesId: string) {
  return useSuspenseQuery(seriesExemplarsQuery(useConnection(), metric, seriesId));
}
