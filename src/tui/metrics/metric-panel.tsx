import { EntryList } from "../components/entry-list.tsx";
import { Panel, PanelBody } from "../components/panel.tsx";
import { Section } from "../components/section.tsx";
import type { Attributes } from "../query/attributes.ts";
import { THEME } from "../theme/theme.ts";
import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeValues } from "./series-attributes.ts";
import type { Series } from "./series.ts";

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
  series: Series[];
}

function SeriesSummary({ series }: SeriesSummaryProps) {
  const attributes = summarize(series.map(({ attributes }) => attributes));
  const resourceAttributes = summarize(
    series.map(({ resource_attributes }) => resource_attributes),
  );
  const scopes = distinctScopes(series);

  return (
    <>
      {attributes.length > 0 && (
        <Section title="Attributes">
          <EntryList entries={attributes} />
        </Section>
      )}
      {resourceAttributes.length > 0 && (
        <Section title="Resource">
          <EntryList entries={resourceAttributes} />
        </Section>
      )}
      {scopes.length > 0 && (
        <Section title="Scope">
          {scopes.map(({ name, version }) => (
            <text key={`${name} ${version}`} fg={THEME.text}>
              {name} <span fg={THEME.textMuted}>{version}</span>
            </text>
          ))}
        </Section>
      )}
    </>
  );
}

interface MetricPanelProps {
  metric: Metric;
}

export function MetricPanel({ metric }: MetricPanelProps) {
  const metricSeries = useMetricSeries(metric);

  return (
    <Panel>
      <MetricHeader metric={metric} seriesCount={metric.series_count} />
      <PanelBody contentKey={metric.metric_id}>
        {metricSeries.isError && <text fg={THEME.textError}>Failed to load series</text>}
        {metricSeries.data !== undefined && <SeriesSummary series={metricSeries.data} />}
      </PanelBody>
    </Panel>
  );
}
