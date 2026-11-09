import { RGBA } from "@opentui/core";
import { Suspense } from "react";

import { counterIntervals, distributionIntervals } from "#telemetry/metrics/intervals.ts";
import { isDelta, type Metric } from "#telemetry/metrics/metric.ts";
import type { NumberPoint, Series, SeriesPoints } from "#telemetry/metrics/series.ts";
import { ErrorBoundary } from "#tui/components/error-boundary.tsx";
import { Section } from "#tui/components/section.tsx";
import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";
import { MINUTE_MS } from "#utils/time-units.ts";

import { LineChart } from "./line-chart.tsx";
import { useSeriesPoints } from "./metric-queries.ts";
import { formatMetricRate, formatMetricValue } from "./metric-value.ts";
import { type ChartWindow, gapSlots, meanLine, quantileLines, rateLine } from "./series-lines.ts";
import { PERCENTILES } from "./series-stats.ts";

const CHART_HEIGHT = 8;
const CHART_TIME_AXIS_HEIGHT = 1;

const MIN_WINDOW_MS = MINUTE_MS;

const black = RGBA.fromHex("#000000");
const white = RGBA.fromHex("#FFFFFF");
const PERCENTILE_SHADES = {
  p50: { toward: black, amount: 0.4 },
  p95: { toward: black, amount: 0 },
  p99: { toward: white, amount: 0.5 },
} satisfies Record<(typeof PERCENTILES)[number]["key"], { toward: RGBA; amount: number }>;

function percentileColor(color: string, key: keyof typeof PERCENTILE_SHADES) {
  const { r, g, b } = RGBA.fromHex(color);
  const { toward, amount } = PERCENTILE_SHADES[key];
  return RGBA.fromValues(
    r + (toward.r - r) * amount,
    g + (toward.g - g) * amount,
    b + (toward.b - b) * amount,
  );
}

function runningTotals(points: NumberPoint[]) {
  let total = 0;
  return points.map(({ time, value }) => {
    total += value;
    return { time, value: total };
  });
}

function chartLines(metric: Metric, data: SeriesPoints, color: string, window: ChartWindow) {
  const delta = isDelta(metric);
  if (data.kind === "distribution") {
    const intervals = distributionIntervals(data.points, delta);
    const quantiles = PERCENTILES.map((percentile) => percentile.quantile);
    const lines = quantileLines(intervals, quantiles, window);
    const endTimes = intervals.map((interval) => interval.end);
    return {
      lines: PERCENTILES.map(({ key }, index) => ({
        color: percentileColor(color, key),
        values: lines[index] ?? [],
      })),
      gapSlots: gapSlots(endTimes, window),
    };
  }
  if (metric.type === "counter") {
    const intervals = counterIntervals(data.points, delta);
    const endTimes = intervals.map((interval) => interval.end);
    return {
      lines: [{ color, values: rateLine(intervals, window) }],
      gapSlots: gapSlots(endTimes, window),
    };
  }
  const samples = delta ? runningTotals(data.points) : data.points;
  const sampleTimes = samples.map((sample) => sample.time);
  return {
    lines: [{ color, values: meanLine(samples, window) }],
    gapSlots: gapSlots(sampleTimes, window),
  };
}

function chartTitle(metric: Metric) {
  switch (metric.type) {
    case "counter":
      return "Rate";
    case "histogram":
    case "exponential_histogram":
      return "Percentiles";
    default:
      return "Value";
  }
}

interface PercentileLegendProps {
  color: string;
}

function PercentileLegend({ color }: PercentileLegendProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP}>
      {PERCENTILES.map(({ key }) => (
        <text key={key} fg={THEME.textMuted}>
          <span fg={percentileColor(color, key)}>●</span> {key}
        </text>
      ))}
    </box>
  );
}

interface SeriesPlotProps {
  metric: Metric;
  series: Series;
  color: string;
  windowStart: number;
  windowMs: number | undefined;
}

function SeriesPlot({ metric, series, color, windowStart, windowMs }: SeriesPlotProps) {
  const { data, dataUpdatedAt } = useSeriesPoints(metric, series.series_id);

  const end = dataUpdatedAt;
  const start =
    windowMs === undefined ? Math.min(windowStart, end - MIN_WINDOW_MS) : end - windowMs;

  return (
    <LineChart
      height={CHART_HEIGHT}
      includeZero={metric.type !== "gauge" && metric.type !== "updowncounter"}
      startLabel={formatTimeOfDay(start)}
      endLabel="now"
      formatValue={(value) =>
        metric.type === "counter"
          ? formatMetricRate(value, metric.unit)
          : formatMetricValue(value, metric.unit)
      }
      getLines={(slotCount) => chartLines(metric, data, color, { start, end, slotCount })}
    />
  );
}

interface SeriesChartProps {
  metric: Metric;
  series: Series;
  color: string;
  windowStart: number;
  windowMs: number | undefined;
}

export function SeriesChart({ metric, series, color, windowStart, windowMs }: SeriesChartProps) {
  const title =
    windowMs === undefined
      ? chartTitle(metric)
      : `${chartTitle(metric)} · last ${windowMs / MINUTE_MS} min`;

  return (
    <Section title={title}>
      {series.stats.kind === "distribution" && <PercentileLegend color={color} />}
      <ErrorBoundary fallback={<text fg={THEME.textError}>Failed to load data points</text>}>
        <Suspense fallback={<box height={CHART_HEIGHT + CHART_TIME_AXIS_HEIGHT} />}>
          <SeriesPlot
            metric={metric}
            series={series}
            color={color}
            windowStart={windowStart}
            windowMs={windowMs}
          />
        </Suspense>
      </ErrorBoundary>
    </Section>
  );
}
