import type { SetStateAction } from "react";

import { type Metric, type MetricSort, typeLabel } from "#telemetry/metrics/metric.ts";
import { Rows } from "#tui/components/rows.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { Cell, Column, Row, sortDirection, TableHeader } from "#tui/components/table.tsx";
import {
  COLUMN_SERVICE_WIDTH,
  COLUMN_SORT_ARROW_WIDTH,
  COLUMN_TIME_WIDTH,
} from "#tui/theme/columns.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

const COLUMN_TYPE_WIDTH = 13;
const COLUMN_UNIT_WIDTH = 10;
const COLUMN_SERIES_WIDTH = 6 + COLUMN_SORT_ARROW_WIDTH;

interface MetricTableProps {
  metrics: Metric[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  sort: MetricSort;
}

export function MetricTable({ metrics, selectedIndex, onSelect, sort }: MetricTableProps) {
  return (
    <>
      <TableHeader>
        <Column width={COLUMN_TIME_WIDTH} sort={sortDirection(sort, "last_time")}>
          Time
        </Column>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={1} sort={sortDirection(sort, "name")}>
          Name
        </Column>
        <Column width={COLUMN_TYPE_WIDTH}>Type</Column>
        <Column width={COLUMN_UNIT_WIDTH}>Unit</Column>
        <Column
          width={COLUMN_SERIES_WIDTH}
          align="right"
          sort={sortDirection(sort, "series_count")}
        >
          Series
        </Column>
      </TableHeader>
      <Rows
        items={metrics}
        getKey={(metric) => metric.metric_id}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(metric) => (
          <Row>
            <Cell width={COLUMN_TIME_WIDTH} muted>
              {formatTimeOfDay(metric.last_time)}
            </Cell>
            <Cell width={COLUMN_SERVICE_WIDTH} muted>
              {metric.service_name !== null && <ServiceName name={metric.service_name} />}
            </Cell>
            <Cell grow={1}>{metric.name}</Cell>
            <Cell width={COLUMN_TYPE_WIDTH} muted>
              {typeLabel(metric.type)}
            </Cell>
            <Cell width={COLUMN_UNIT_WIDTH} muted>
              {metric.unit}
            </Cell>
            <Cell width={COLUMN_SERIES_WIDTH} align="right">
              {metric.series_count.toLocaleString()}
            </Cell>
          </Row>
        )}
      </Rows>
    </>
  );
}
