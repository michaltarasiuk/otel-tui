import type { ScrollBoxRenderable } from "@opentui/core";

import type { Metric } from "#telemetry/metrics/metric.ts";
import type { Series } from "#telemetry/metrics/series.ts";
import { DetailsHeader, Id, Meta, ScopeName, Stat, Title } from "#tui/components/details.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { serviceColor, THEME } from "#tui/theme/theme.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import { BucketBars } from "./bucket-bars.tsx";
import { SeriesChart } from "./series-chart.tsx";
import { seriesStats, statKeys } from "./series-stats.ts";

interface SeriesDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  metric: Metric;
  series: Series;
  label: string;
  windowStart: number;
  windowMs: number | undefined;
  children: React.ReactNode;
}

export function SeriesDetails({
  ref,
  metric,
  series,
  label,
  windowStart,
  windowMs,
  children,
}: SeriesDetailsProps) {
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
        <SeriesChart
          metric={metric}
          series={series}
          color={color}
          windowStart={windowStart}
          windowMs={windowMs}
        />
        {series.stats.kind === "distribution" && series.stats.distribution.count > 0 && (
          <Section title="Buckets">
            <BucketBars distribution={series.stats.distribution} unit={metric.unit} color={color} />
          </Section>
        )}
        {children}
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
