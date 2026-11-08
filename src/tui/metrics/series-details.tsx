import type { ScrollBoxRenderable } from "@opentui/core";
import { Suspense } from "react";

import {
  Description,
  DetailsHeader,
  Id,
  Meta,
  ScopeName,
  Stat,
  Title,
} from "#tui/components/details.tsx";
import { ErrorBoundary } from "#tui/components/error-boundary.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { COLUMN_GAP, COLUMN_TIME_WIDTH } from "#tui/theme/columns.ts";
import { serviceColor, THEME } from "#tui/theme/theme.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import { BucketBars } from "./bucket-bars.tsx";
import { useSeriesExemplars } from "./metric-queries.ts";
import { formatMetricValue } from "./metric-value.ts";
import type { Metric } from "./metric.ts";
import { SeriesChart } from "./series-chart.tsx";
import { seriesStats, statKeys } from "./series-stats.ts";
import type { Series } from "./series.ts";

interface ExemplarsProps {
  metric: Metric;
  seriesId: string;
}

function Exemplars({ metric, seriesId }: ExemplarsProps) {
  const { data: exemplars } = useSeriesExemplars(metric, seriesId);

  if (exemplars.length === 0) {
    return null;
  }

  return (
    <Section title="Exemplars">
      {exemplars.map((exemplar, index) => (
        <box key={index} flexDirection="row" gap={COLUMN_GAP}>
          <text width={COLUMN_TIME_WIDTH} flexShrink={0} fg={THEME.textMuted}>
            {formatTimeOfDay(exemplar.time)}
          </text>
          <text width={10} flexShrink={0} textAlign="right" fg={THEME.text}>
            {formatMetricValue(exemplar.value, metric.unit)}
          </text>
          <text fg={THEME.textMuted} wrapMode="none" truncate>
            {exemplar.trace_id ?? "no trace"} {exemplar.span_id}
          </text>
        </box>
      ))}
    </Section>
  );
}

interface SeriesDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  metric: Metric;
  series: Series;
  label: string;
  windowStart: number;
}

export function SeriesDetails({ ref, metric, series, label, windowStart }: SeriesDetailsProps) {
  const stats = seriesStats(metric, series);
  const color = metric.service_name === null ? THEME.text : serviceColor(metric.service_name);

  return (
    <>
      <DetailsHeader>
        <Title>{label}</Title>
        <Id>{formatTimeOfDay(series.last_time)}</Id>
      </DetailsHeader>
      <Meta>
        {statKeys(metric.type).map((key) => (
          <Stat key={key} label={key}>
            {stats[key]}
          </Stat>
        ))}
      </Meta>
      <ScrollBox ref={ref}>
        <SeriesChart metric={metric} series={series} color={color} windowStart={windowStart} />
        {series.stats.kind === "distribution" && series.stats.distribution.count > 0 && (
          <Section title="Buckets">
            <BucketBars distribution={series.stats.distribution} unit={metric.unit} color={color} />
          </Section>
        )}
        <ErrorBoundary
          fallback={<Description color={THEME.textError}>Failed to load exemplars</Description>}
        >
          <Suspense>
            <Exemplars metric={metric} seriesId={series.series_id} />
          </Suspense>
        </ErrorBoundary>
        {series.attributes.length > 0 && (
          <Section title="Attributes">
            <KeyValueList entries={series.attributes} />
          </Section>
        )}
        {series.resource_attributes.length > 0 && (
          <Section title="Resource">
            <KeyValueList entries={series.resource_attributes} />
          </Section>
        )}
        {series.scope_name !== null && (
          <Section title="Scope">
            <ScopeName name={series.scope_name} version={series.scope_version} />
          </Section>
        )}
      </ScrollBox>
    </>
  );
}
