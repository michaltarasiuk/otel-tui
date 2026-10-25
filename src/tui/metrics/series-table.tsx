import { useState } from "react";

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
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>();

  const columns = attributeColumns(series);
  const rows = sortByColumns(series, columns);

  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => row.series_id === selectedSeriesId),
  );
  const selectedSeries = rows[selectedIndex];
  const windowStart = Math.min(...series.map((row) => row.first_time.getTime()));

  return (
    <box flexGrow={1}>
      <SeriesHeaderRow metric={metric} columns={columns} />
      <WindowedRows
        rows={rows}
        selectedIndex={selectedIndex}
        getKey={(row) => row.series_id}
        renderRow={(row, selected) => (
          <SeriesRow metric={metric} columns={columns} series={row} selected={selected} />
        )}
        onSelect={(index) => setSelectedSeriesId(rows[index]?.series_id)}
      />
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
