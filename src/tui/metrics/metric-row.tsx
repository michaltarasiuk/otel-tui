import { formatTime } from "../../utils/format-time.ts";
import {
  COLUMN_GAP,
  HEADER_CELL_PROPS,
  SERVICE_WIDTH,
  SORT_ARROW_WIDTH,
  sortArrow,
  TIME_WIDTH,
} from "../columns.ts";
import { useFocused } from "../focus.tsx";
import { ServiceName } from "../service-name.tsx";
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
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
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
    </box>
  );
}

interface MetricRowProps {
  metric: Metric;
  selected: boolean;
}

export function MetricRow({ metric, selected }: MetricRowProps) {
  const focused = useFocused();

  const secondaryColor = selected ? THEME.text : THEME.textMuted;

  return (
    <box
      flexDirection="row"
      gap={COLUMN_GAP}
      paddingX={1}
      backgroundColor={selected && focused ? THEME.backgroundSelected : THEME.background}
    >
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
    </box>
  );
}
