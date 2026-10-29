import { useListState } from "../use-list-state.ts";
import { WindowedRows } from "../windowed-rows.tsx";
import type { Metric } from "./metric.ts";
import { attributeColumns, seriesLabel, sortByColumns } from "./series-columns.ts";
import { SeriesPanel } from "./series-panel.tsx";
import { SeriesHeaderRow, SeriesRow } from "./series-row.tsx";
import type { Series } from "./series.ts";

interface SeriesTableProps {
  metric: Metric;
  series: Series[];
}

export function SeriesTable({ metric, series }: SeriesTableProps) {
  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);

  const list = useListState({
    items: rows,
    getKey: (row) => row.series_id,
  });

  const selectedSeries = list.selectedItem;
  const windowStart = Math.min(...series.map((row) => row.first_time.getTime()));

  return (
    <box flexGrow={1}>
      <SeriesHeaderRow metric={metric} columns={columns} />
      <WindowedRows state={list}>
        {(row, selected) => (
          <SeriesRow metric={metric} columns={columns} series={row} selected={selected} />
        )}
      </WindowedRows>
      {selectedSeries !== undefined && (
        <SeriesPanel
          metric={metric}
          series={selectedSeries}
          label={seriesLabel(selectedSeries, columns)}
          windowStart={windowStart}
        />
      )}
    </box>
  );
}
