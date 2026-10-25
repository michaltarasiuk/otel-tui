import type { ScrollBoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";

import type { Attributes } from "../attributes.ts";
import { EntryList } from "../entry-list.tsx";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { useFocused } from "../focus.tsx";
import { Section } from "../section.tsx";
import { THEME } from "../theme.ts";
import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeValues } from "./series-attributes.ts";
import type { Series } from "./series.ts";

const HALF_VIEWPORT = 0.5;
const SCROLLBAR_WIDTH = 1;
const LISTED_VALUE_COUNT = 3;

function describeValues(values: string[]) {
  const listed = values.slice(0, LISTED_VALUE_COUNT).join(", ");
  const unlistedCount = values.length - LISTED_VALUE_COUNT;
  return unlistedCount > 0 ? `${listed} and ${unlistedCount.toLocaleString()} more` : listed;
}

function summarize(attributeSets: Attributes[]) {
  return attributeValues(attributeSets)
    .toSorted((a, b) => b.values.length - a.values.length || a.key.localeCompare(b.key))
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
  const focused = useFocused();

  const metricSeries = useMetricSeries(metric);

  const bodyRef = useRef<ScrollBoxRenderable>(null);

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "metric.scroll-down",
          desc: "scroll",
          run() {
            bodyRef.current?.scrollBy(HALF_VIEWPORT, "viewport");
          },
        },
        {
          name: "metric.scroll-up",
          run() {
            bodyRef.current?.scrollBy(-HALF_VIEWPORT, "viewport");
          },
        },
      ],
      bindings: [
        { key: "ctrl+d", cmd: "metric.scroll-down" },
        { key: "ctrl+u", cmd: "metric.scroll-up" },
      ],
    }),
    [focused],
  );

  return (
    <box
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      border={["top"]}
      borderColor={THEME.textMuted}
      paddingX={1}
    >
      <MetricHeader metric={metric} seriesCount={metric.series_count} />
      <scrollbox
        key={metric.metric_id}
        ref={bodyRef}
        flexGrow={1}
        flexBasis={IGNORE_CONTENT_SIZE}
        scrollbarOptions={{ showArrows: false }}
        contentOptions={{ paddingRight: SCROLLBAR_WIDTH }}
      >
        {metricSeries.isError && <text fg={THEME.textError}>Failed to load series</text>}
        {metricSeries.data !== undefined && <SeriesSummary series={metricSeries.data} />}
      </scrollbox>
    </box>
  );
}
