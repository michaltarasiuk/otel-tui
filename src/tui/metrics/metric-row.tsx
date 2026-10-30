import { formatTime } from "../../utils/format-time.ts";
import {
  HEADER_CELL_PROPS,
  secondaryCellColor,
  SERVICE_WIDTH,
  SORT_ARROW_WIDTH,
  sortArrow,
  TIME_WIDTH,
} from "../columns.ts";
import { ServiceName } from "../service-name.tsx";
import { TableRow } from "../table-row.tsx";
import { THEME } from "../theme.ts";
import { type Metric, type MetricSort, typeLabel } from "./metric.ts";

const TYPE_WIDTH = 13;
const UNIT_WIDTH = 10;
const SERIES_WIDTH = 6 + SORT_ARROW_WIDTH;

interface MetricHeaderRowProps {
  sort: MetricSort;
}

export function MetricHeaderRow({ sort }: MetricHeaderRowProps) {
  return (
    <TableRow>
      <text {...HEADER_CELL_PROPS} width={TIME_WIDTH}>
        Time {sortArrow(sort, "last_time")}
      </text>
      <text {...HEADER_CELL_PROPS} width={SERVICE_WIDTH}>
        Service
      </text>
      <text {...HEADER_CELL_PROPS} flexGrow={1}>
        Name {sortArrow(sort, "name")}
      </text>
      <text {...HEADER_CELL_PROPS} width={TYPE_WIDTH}>
        Type
      </text>
      <text {...HEADER_CELL_PROPS} width={UNIT_WIDTH}>
        Unit
      </text>
      <text {...HEADER_CELL_PROPS} width={SERIES_WIDTH} textAlign="right">
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
      <text width={TIME_WIDTH} fg={secondaryColor}>
        {formatTime(metric.last_time)}
      </text>
      <text width={SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {metric.service_name !== null && <ServiceName name={metric.service_name} />}
      </text>
      <text flexGrow={1} fg={THEME.text} wrapMode="none" truncate>
        {metric.name}
      </text>
      <text width={TYPE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {typeLabel(metric.type)}
      </text>
      <text width={UNIT_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {metric.unit}
      </text>
      <text width={SERIES_WIDTH} textAlign="right" fg={THEME.text}>
        {metric.series_count.toLocaleString()}
      </text>
    </TableRow>
  );
}
