import { ServiceName } from "#tui/components/service-name.tsx";
import { TableRow } from "#tui/components/table-row.tsx";
import {
  HEADER_CELL_PROPS,
  secondaryCellColor,
  COLUMN_SERVICE_WIDTH,
  COLUMN_SORT_ARROW_WIDTH,
  sortArrow,
  COLUMN_TIME_WIDTH,
} from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import { type Metric, type MetricSort, typeLabel } from "./metric.ts";

const COLUMN_TYPE_WIDTH = 13;
const COLUMN_UNIT_WIDTH = 10;
const COLUMN_SERIES_WIDTH = 6 + COLUMN_SORT_ARROW_WIDTH;

interface MetricHeaderRowProps {
  sort: MetricSort;
}

export function MetricHeaderRow({ sort }: MetricHeaderRowProps) {
  return (
    <TableRow>
      <text {...HEADER_CELL_PROPS} width={COLUMN_TIME_WIDTH}>
        Time {sortArrow(sort, "last_time")}
      </text>
      <text {...HEADER_CELL_PROPS} width={COLUMN_SERVICE_WIDTH}>
        Service
      </text>
      <text {...HEADER_CELL_PROPS} flexGrow={1}>
        Name {sortArrow(sort, "name")}
      </text>
      <text {...HEADER_CELL_PROPS} width={COLUMN_TYPE_WIDTH}>
        Type
      </text>
      <text {...HEADER_CELL_PROPS} width={COLUMN_UNIT_WIDTH}>
        Unit
      </text>
      <text {...HEADER_CELL_PROPS} width={COLUMN_SERIES_WIDTH} textAlign="right">
        {sortArrow(sort, "series_count")} Series
      </text>
    </TableRow>
  );
}

interface MetricRowProps {
  metric: Metric;
  selected: boolean;
}

export function MetricRow({ metric, selected }: MetricRowProps) {
  const secondaryColor = secondaryCellColor(selected);

  return (
    <TableRow selected={selected}>
      <text width={COLUMN_TIME_WIDTH} fg={secondaryColor}>
        {formatTimeOfDay(metric.last_time)}
      </text>
      <text width={COLUMN_SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {metric.service_name !== null && <ServiceName name={metric.service_name} />}
      </text>
      <text flexGrow={1} fg={THEME.text} wrapMode="none" truncate>
        {metric.name}
      </text>
      <text width={COLUMN_TYPE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {typeLabel(metric.type)}
      </text>
      <text width={COLUMN_UNIT_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {metric.unit}
      </text>
      <text width={COLUMN_SERIES_WIDTH} textAlign="right" fg={THEME.text}>
        {metric.series_count.toLocaleString()}
      </text>
    </TableRow>
  );
}
