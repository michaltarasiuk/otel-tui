import type { ScrollBoxRenderable } from "@opentui/core";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import type { Attributes } from "#telemetry/attributes.ts";
import { Description, ScopeName } from "#ui/details.tsx";
import { ErrorBoundary } from "#ui/error-boundary.tsx";
import { KeyValueList } from "#ui/key-value-list.tsx";
import { ScrollBox } from "#ui/scroll-box.tsx";
import { Section } from "#ui/section.tsx";
import { THEME } from "#ui/theme.ts";
import { formatInteger } from "#utils/number.ts";

import { attributeValues } from "./attribute-values.ts";
import { MetricHeader } from "./metric-header.tsx";
import { metricSeriesQuery } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import type { Series } from "./series.ts";

const MAX_LISTED_VALUES = 3;

function describeValues(values: string[]) {
  const listed = values.slice(0, MAX_LISTED_VALUES).join(", ");
  const unlistedCount = values.length - MAX_LISTED_VALUES;
  return unlistedCount > 0 ? `${listed} and ${formatInteger(unlistedCount)} more` : listed;
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
  const connection = useConnection();
  const { data: series } = useSuspenseQuery(metricSeriesQuery(connection, metric));
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
          <SeriesSummary metric={metric} />
        </ErrorBoundary>
      </ScrollBox>
    </>
  );
}
