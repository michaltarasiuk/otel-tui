import type { ScrollBoxRenderable } from "@opentui/core";
import { Suspense } from "react";

import type { Attributes } from "#telemetry/attributes.ts";
import type { Metric } from "#telemetry/metrics/metric.ts";
import type { Series } from "#telemetry/metrics/series.ts";
import { Description, ScopeName } from "#tui/components/details.tsx";
import { ErrorBoundary } from "#tui/components/error-boundary.tsx";
import { KeyValueList } from "#tui/components/key-value-list.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { Section } from "#tui/components/section.tsx";
import { THEME } from "#tui/theme/theme.ts";

import { attributeValues } from "./attribute-values.ts";
import { MetricHeader } from "./metric-header.tsx";
import { useSuspenseMetricSeries } from "./metric-queries.ts";

const MAX_LISTED_VALUES = 3;

function describeValues(values: string[]) {
  const listed = values.slice(0, MAX_LISTED_VALUES).join(", ");
  const unlistedCount = values.length - MAX_LISTED_VALUES;
  return unlistedCount > 0 ? `${listed} and ${unlistedCount.toLocaleString()} more` : listed;
}

function summarize(attributeSets: Attributes[]) {
  return attributeValues(attributeSets)
    .sort((a, b) => b.values.length - a.values.length || a.key.localeCompare(b.key))
    .map(({ key, values }) => ({ key, value: describeValues(values) }));
}

function distinctScopes(series: Series[]) {
  const scopes = new Map<string, { name: string; version: string | null }>();

  for (const { scope_name, scope_version } of series) {
    if (scope_name !== null) {
      scopes.set(`${scope_name} ${scope_version}`, { name: scope_name, version: scope_version });
    }
  }

  return [...scopes.values()];
}

interface SeriesSummaryProps {
  metric: Metric;
}

function SeriesSummary({ metric }: SeriesSummaryProps) {
  const { data: series } = useSuspenseMetricSeries(metric);
  const attributes = summarize(series.map(({ attributes }) => attributes));
  const resourceAttributes = summarize(
    series.map(({ resource_attributes }) => resource_attributes),
  );
  const scopes = distinctScopes(series);

  return (
    <>
      {attributes.length > 0 && (
        <Section title="Attributes">
          <KeyValueList entries={attributes} />
        </Section>
      )}
      {resourceAttributes.length > 0 && (
        <Section title="Resource">
          <KeyValueList entries={resourceAttributes} />
        </Section>
      )}
      {scopes.length > 0 && (
        <Section title="Scope">
          {scopes.map(({ name, version }) => (
            <ScopeName key={`${name} ${version}`} name={name} version={version} />
          ))}
        </Section>
      )}
    </>
  );
}

interface MetricDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  metric: Metric;
}

export function MetricDetails({ ref, metric }: MetricDetailsProps) {
  return (
    <>
      <MetricHeader metric={metric} seriesCount={metric.series_count} />
      <ScrollBox ref={ref}>
        <ErrorBoundary
          fallback={<Description color={THEME.textError}>Failed to load series</Description>}
        >
          <Suspense>
            <SeriesSummary metric={metric} />
          </Suspense>
        </ErrorBoundary>
      </ScrollBox>
    </>
  );
}
