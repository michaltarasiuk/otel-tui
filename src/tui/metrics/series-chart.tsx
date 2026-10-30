import { RGBA } from "@opentui/core";

import { formatTime } from "../../utils/format-time.ts";
import { MILLISECONDS_PER_MINUTE } from "../../utils/time-units.ts";
import { COLUMN_GAP } from "../columns.ts";
import { Section } from "../section.tsx";
import { THEME } from "../theme.ts";
import { type ChartWindow, gapSlots, meanLine, quantileLines, rateLine } from "./chart-lines.ts";
import { counterIntervals, distributionIntervals } from "./intervals.ts";
import { LineChart } from "./line-chart.tsx";
import { useSeriesPoints } from "./metric-queries.ts";
import { formatMetricRate, formatMetricValue } from "./metric-value.ts";
import { isDelta, type Metric } from "./metric.ts";
import { PERCENTILES } from "./series-stats.ts";
import type { NumberPoint, Series, SeriesPoints } from "./series.ts";

const CHART_HEIGHT = 8;
const TIME_AXIS_HEIGHT = 1;
const MIN_WINDOW_MS = MILLISECONDS_PER_MINUTE;

const BLACK = RGBA.fromHex("#000000");
const WHITE = RGBA.fromHex("#FFFFFF");

const PERCENTILE_SHADES = {
  p50: { toward: BLACK, amount: 0.4 },
  p95: { toward: BLACK, amount: 0 },
  p99: { toward: WHITE, amount: 0.5 },
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
    const lines = quantileLines(
      intervals,
      PERCENTILES.map((percentile) => percentile.quantile),
      window,
    );
    return {
      lines: PERCENTILES.map(({ key }, index) => ({
        color: percentileColor(color, key),
        values: lines[index] ?? [],
      })),
      gapSlots: gapSlots(
        intervals.map((interval) => interval.end),
        window,
      ),
    };
  }
  if (metric.type === "counter") {
    const intervals = counterIntervals(data.points, delta);
    return {
      lines: [{ color, values: rateLine(intervals, window) }],
      gapSlots: gapSlots(
        intervals.map((interval) => interval.end),
        window,
      ),
    };
  }
  const samples = delta ? runningTotals(data.points) : data.points;
  return {
    lines: [{ color, values: meanLine(samples, window) }],
    gapSlots: gapSlots(
      samples.map((sample) => sample.time),
      window,
    ),
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

interface SeriesChartProps {
  metric: Metric;
  series: Series;
  color: string;
  windowStart: number;
}

export function SeriesChart({ metric, series, color, windowStart }: SeriesChartProps) {
  const seriesPoints = useSeriesPoints(metric, series.series_id);

  const { data, dataUpdatedAt } = seriesPoints;

  function renderChart() {
    if (seriesPoints.isError) {
      return <text fg={THEME.textError}>Failed to load data points</text>;
    }
    if (data === undefined) {
      return <box height={CHART_HEIGHT + TIME_AXIS_HEIGHT} />;
    }

    const end = dataUpdatedAt;
    const start = Math.min(windowStart, end - MIN_WINDOW_MS);

    return (
      <LineChart
        height={CHART_HEIGHT}
        includeZero={metric.type !== "gauge" && metric.type !== "updowncounter"}
        startLabel={formatTime(start)}
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

  return (
    <Section title={chartTitle(metric)}>
      {series.stats.kind === "distribution" && <PercentileLegend color={color} />}
      {renderChart()}
    </Section>
  );
}
