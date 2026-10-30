import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { containsPattern } from "../../utils/contains-pattern.ts";
import { useConnection } from "../connection.ts";
import EXPONENTIAL_HISTOGRAM_POINTS_SQL from "./exponential-histogram-points.sql" with { type: "text" };
import EXPONENTIAL_HISTOGRAM_SERIES_SQL from "./exponential-histogram-series.sql" with { type: "text" };
import HISTOGRAM_POINTS_SQL from "./histogram-points.sql" with { type: "text" };
import HISTOGRAM_SERIES_SQL from "./histogram-series.sql" with { type: "text" };
import METRIC_COUNT_SQL from "./metric-count.sql" with { type: "text" };
import METRIC_LIST_SQL from "./metric-list.sql" with { type: "text" };
import { Metric, type MetricSort } from "./metric.ts";
import NUMBER_POINTS_SQL from "./number-points.sql" with { type: "text" };
import NUMBER_SERIES_SQL from "./number-series.sql" with { type: "text" };
import SERIES_EXEMPLARS_SQL from "./series-exemplars.sql" with { type: "text" };
import {
  Exemplar,
  ExponentialHistogramPoint,
  ExponentialHistogramSeries,
  HistogramPoint,
  HistogramSeries,
  NumberPoint,
  NumberSeries,
  type Series,
} from "./series.ts";

const POLL_INTERVAL_MS = 1000;
const MAX_METRICS = 500;
const MAX_EXEMPLARS = 10;

interface MetricQuery {
  search: string;
  sort: MetricSort;
}

export function useMetricList({ search, sort }: MetricQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", { search, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(METRIC_LIST_SQL, {
        limit: MAX_METRICS,
        pattern: containsPattern(search),
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      const rows = reader.getRowObjectsJS();
      return Metric.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useMetricTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(METRIC_COUNT_SQL);
      return z.number().parse(reader.value(0, 0));
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMetricSeries(metric: Metric) {
  const connection = useConnection();

  return useQuery<Series[]>({
    queryKey: ["metrics", metric.metric_id, "series"],
    queryFn: async () => {
      const identity = {
        name: metric.name,
        unit: metric.unit,
        serviceName: metric.service_name,
        temporality: metric.temporality,
      };
      switch (metric.type) {
        case "gauge":
        case "counter":
        case "updowncounter": {
          const reader = await connection.runAndReadAll(NUMBER_SERIES_SQL, {
            ...identity,
            type: metric.type,
          });
          return NumberSeries.array().parse(reader.getRowObjectsJS());
        }
        case "histogram": {
          const reader = await connection.runAndReadAll(HISTOGRAM_SERIES_SQL, identity);
          return HistogramSeries.array().parse(reader.getRowObjectsJS());
        }
        case "exponential_histogram": {
          const reader = await connection.runAndReadAll(EXPONENTIAL_HISTOGRAM_SERIES_SQL, identity);
          return ExponentialHistogramSeries.array().parse(reader.getRowObjectsJS());
        }
        default:
          metric.type satisfies never;
          throw new Error(`Unknown metric type: ${metric.type}`);
      }
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSeriesPoints(metric: Metric, seriesId: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "points"],
    queryFn: async () => {
      const identity = {
        name: metric.name,
        unit: metric.unit,
        serviceName: metric.service_name,
        temporality: metric.temporality,
        seriesId,
      };
      switch (metric.type) {
        case "gauge":
        case "counter":
        case "updowncounter": {
          const reader = await connection.runAndReadAll(NUMBER_POINTS_SQL, {
            ...identity,
            type: metric.type,
          });
          return {
            kind: "number" as const,
            points: NumberPoint.array().parse(reader.getRowObjectsJS()),
          };
        }
        case "histogram": {
          const reader = await connection.runAndReadAll(HISTOGRAM_POINTS_SQL, identity);
          return {
            kind: "distribution" as const,
            points: HistogramPoint.array().parse(reader.getRowObjectsJS()),
          };
        }
        case "exponential_histogram": {
          const reader = await connection.runAndReadAll(EXPONENTIAL_HISTOGRAM_POINTS_SQL, identity);
          return {
            kind: "distribution" as const,
            points: ExponentialHistogramPoint.array().parse(reader.getRowObjectsJS()),
          };
        }
        default:
          metric.type satisfies never;
          throw new Error(`Unknown metric type: ${metric.type}`);
      }
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSeriesExemplars(metric: Metric, seriesId: string) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["metrics", metric.metric_id, "series", seriesId, "exemplars"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(SERIES_EXEMPLARS_SQL, {
        type: metric.type,
        name: metric.name,
        unit: metric.unit,
        serviceName: metric.service_name,
        temporality: metric.temporality,
        seriesId,
        limit: MAX_EXEMPLARS,
      });
      return Exemplar.array().parse(reader.getRowObjectsJS());
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
