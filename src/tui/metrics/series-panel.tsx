import { TextAttributes } from "@opentui/core";

import { formatTime } from "../../utils/format-time.ts";
import { COLUMN_GAP, TIME_WIDTH } from "../columns.ts";
import { EntryList } from "../entry-list.tsx";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { PanelBody } from "../panel-body.tsx";
import { ScopeSection, Section } from "../section.tsx";
import { serviceColor, THEME } from "../theme.ts";
import { BucketBars } from "./bucket-bars.tsx";
import { useSeriesExemplars } from "./metric-queries.ts";
import { formatMetricValue } from "./metric-value.ts";
import type { Metric } from "./metric.ts";
import { SeriesChart } from "./series-chart.tsx";
import { seriesStats, statKeys } from "./series-stats.ts";
import type { Exemplar, Series } from "./series.ts";

const EXEMPLAR_VALUE_WIDTH = 10;

interface ExemplarListProps {
  exemplars: Exemplar[];
  unit: string;
}

function ExemplarList({ exemplars, unit }: ExemplarListProps) {
  return exemplars.map((exemplar, index) => (
    <box key={index} flexDirection="row" gap={COLUMN_GAP}>
      <text width={TIME_WIDTH} flexShrink={0} fg={THEME.textMuted}>
        {formatTime(exemplar.time)}
      </text>
      <text width={EXEMPLAR_VALUE_WIDTH} flexShrink={0} textAlign="right" fg={THEME.text}>
        {formatMetricValue(exemplar.value, unit)}
      </text>
      <text fg={THEME.textMuted} wrapMode="none" truncate>
        {exemplar.trace_id ?? "no trace"} {exemplar.span_id}
      </text>
    </box>
  ));
}

interface SeriesPanelProps {
  metric: Metric;
  series: Series;
  label: string;
  windowStart: number;
}

export function SeriesPanel({ metric, series, label, windowStart }: SeriesPanelProps) {
  const seriesExemplars = useSeriesExemplars(metric, series.series_id);

  const { data: exemplars = [] } = seriesExemplars;

  const stats = seriesStats(metric, series);
  const color = metric.service_name === null ? THEME.text : serviceColor(metric.service_name);

  return (
    <box
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      border={["top"]}
      borderColor={THEME.textMuted}
      paddingX={1}
    >
      <box flexDirection="row" gap={COLUMN_GAP}>
        <text
          flexGrow={1}
          flexBasis={IGNORE_CONTENT_SIZE}
          fg={THEME.text}
          attributes={TextAttributes.BOLD}
          wrapMode="none"
          truncate
        >
          {label}
        </text>
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatTime(series.last_time)}
        </text>
      </box>
      <box flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
        {statKeys(metric.type).map((key) => (
          <text key={key} fg={THEME.textMuted} flexShrink={0}>
            {key} <span fg={THEME.text}>{stats[key]}</span>
          </text>
        ))}
      </box>
      <PanelBody contentKey={series.series_id}>
        <SeriesChart metric={metric} series={series} color={color} windowStart={windowStart} />
        {series.stats.kind === "distribution" && series.stats.distribution.count > 0 && (
          <Section title="Buckets">
            <BucketBars distribution={series.stats.distribution} unit={metric.unit} color={color} />
          </Section>
        )}
        {seriesExemplars.isError && <text fg={THEME.textError}>Failed to load exemplars</text>}
        {exemplars.length > 0 && (
          <Section title="Exemplars">
            <ExemplarList exemplars={exemplars} unit={metric.unit} />
          </Section>
        )}
        {series.attributes.length > 0 && (
          <Section title="Attributes">
            <EntryList entries={series.attributes} />
          </Section>
        )}
        {series.resource_attributes.length > 0 && (
          <Section title="Resource">
            <EntryList entries={series.resource_attributes} />
          </Section>
        )}
        {series.scope_name !== null && (
          <ScopeSection name={series.scope_name} version={series.scope_version} />
        )}
      </PanelBody>
    </box>
  );
}
