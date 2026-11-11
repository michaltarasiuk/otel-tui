import type { SetStateAction } from "react";

import { Rows } from "#ui/rows.tsx";
import { Cell, Column, Row, TableHeader } from "#ui/table.tsx";

import type { Metric } from "./metric.ts";
import { type AttributeColumn, cellValue } from "./series-columns.ts";
import { seriesStats, statKeys, statLabel } from "./series-stats.ts";
import type { Series } from "./series.ts";

const COLUMN_STAT_WIDTH = 10;

interface SeriesTableProps {
  series: Series[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  metric: Metric;
  columns: AttributeColumn[];
}

export function SeriesTable({
  series,
  selectedIndex,
  onSelect,
  metric,
  columns,
}: SeriesTableProps) {
  return (
    <>
      <TableHeader>
        {columns.length === 0 && <Column grow={1}>Attributes</Column>}
        {columns.map(({ key, source, weight }) => (
          <Column key={`${source}.${key}`} grow={weight}>
            {key}
          </Column>
        ))}
        {statKeys(metric.type).map((key) => (
          <Column key={key} width={COLUMN_STAT_WIDTH} align="right">
            {statLabel(key)}
          </Column>
        ))}
      </TableHeader>
      <Rows
        items={series}
        getKey={(row) => row.series_id}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(row) => {
          const stats = seriesStats(metric, row);
          return (
            <Row>
              {columns.length === 0 && (
                <Cell grow={1} muted>
                  none
                </Cell>
              )}
              {columns.map((column) => (
                <Cell key={`${column.source}.${column.key}`} grow={column.weight}>
                  {cellValue(row, column)}
                </Cell>
              ))}
              {statKeys(metric.type).map((key) => (
                <Cell key={key} width={COLUMN_STAT_WIDTH} align="right">
                  {stats[key]}
                </Cell>
              ))}
            </Row>
          );
        }}
      </Rows>
    </>
  );
}
