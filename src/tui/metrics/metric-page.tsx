import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef } from "react";

import { Key, KeyHints } from "#tui/components/key-hints.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { Split } from "#tui/components/split.tsx";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";

import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { attributeColumns, seriesLabel, sortByColumns } from "./series-columns.ts";
import { SeriesDetails } from "./series-details.tsx";
import { SeriesTable } from "./series-table.tsx";

interface MetricPageProps {
  metric: Metric;
  onBack: () => void;
}

export function MetricPage({ metric, onBack }: MetricPageProps) {
  const metricSeries = useMetricSeries(metric);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const { data: series = [] } = metricSeries;

  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);
  const [selectedIndex, select] = useSelection(rows, (row) => row.series_id);
  const selected = rows[selectedIndex];
  const windowStart = Math.min(...series.map((row) => row.first_time));

  return (
    <box flexGrow={1}>
      {metricSeries.isError ? (
        <Placeholder text="Failed to load metric" variant="error" />
      ) : selected === undefined ? (
        <Placeholder
          text={metricSeries.isPending ? "Loading metric..." : "This metric is no longer available"}
        />
      ) : (
        <>
          <box paddingX={1}>
            <MetricHeader metric={metric} seriesCount={series.length} />
          </box>
          <Split>
            <SeriesTable
              series={rows}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
              metric={metric}
              columns={columns}
            />
            <SeriesDetails
              key={selected.series_id}
              ref={detailsRef}
              metric={metric}
              series={selected}
              label={seriesLabel(selected, columns)}
              windowStart={windowStart}
            />
          </Split>
        </>
      )}
      <KeyHints>
        <Key name="escape" onPress={() => onBack()}>
          back
        </Key>
        {selected !== undefined && <ScrollKeys target={detailsRef} />}
        <PauseKey />
      </KeyHints>
    </box>
  );
}
