import { Fragment, type SetStateAction } from "react";

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
  const columnGroups = [...Map.groupBy(columns, (column) => column.source)];

  return (
    <>
      <TableHeader>
        {columns.length === 0 && <Column grow={1}>Attributes</Column>}
        {columnGroups.map(([source, group]) => (
          <Fragment key={source}>
            {group.map(({ key, weight }) => (
              <Column key={key} grow={weight}>
                {key}
              </Column>
            ))}
          </Fragment>
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
              {columnGroups.map(([source, group]) => (
                <Fragment key={source}>
                  {group.map((column) => (
                    <Cell key={column.key} grow={column.weight}>
                      {cellValue(row, column)}
                    </Cell>
                  ))}
                </Fragment>
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
