import { formatDuration } from "../../utils/format-duration.ts";
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
import type { Trace, TraceSort } from "./trace.ts";

const SPANS_WIDTH = 5 + SORT_ARROW_WIDTH;
const ERRORS_WIDTH = 6 + SORT_ARROW_WIDTH;
const DURATION_WIDTH = 8 + SORT_ARROW_WIDTH;

interface TraceHeaderRowProps {
  sort: TraceSort;
}

export function TraceHeaderRow({ sort }: TraceHeaderRowProps) {
  return (
    <TableRow>
      <text {...HEADER_CELL_PROPS} width={TIME_WIDTH}>
        Time {sortArrow(sort, "start_time")}
      </text>
      <text {...HEADER_CELL_PROPS} width={SERVICE_WIDTH}>
        Service
      </text>
      <text {...HEADER_CELL_PROPS} flexGrow={1}>
        Name
      </text>
      <text {...HEADER_CELL_PROPS} width={SPANS_WIDTH} textAlign="right">
        {sortArrow(sort, "span_count")} Spans
      </text>
      <text {...HEADER_CELL_PROPS} width={ERRORS_WIDTH} textAlign="right">
        {sortArrow(sort, "error_count")} Errors
      </text>
      <text {...HEADER_CELL_PROPS} width={DURATION_WIDTH} textAlign="right">
        {sortArrow(sort, "duration_ms")} Duration
      </text>
    </TableRow>
  );
}

interface TraceRowProps {
  trace: Trace;
  selected: boolean;
}

export function TraceRow({ trace, selected }: TraceRowProps) {
  const secondaryColor = secondaryCellColor(selected);

  return (
    <TableRow selected={selected}>
      <text width={TIME_WIDTH} fg={secondaryColor}>
        {formatTime(trace.start_time)}
      </text>
      <text width={SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {trace.service_name !== null && <ServiceName name={trace.service_name} />}
      </text>
      <text flexGrow={1} fg={THEME.text} wrapMode="none" truncate>
        {trace.name}
      </text>
      <text width={SPANS_WIDTH} textAlign="right" fg={secondaryColor}>
        {trace.span_count}
      </text>
      <text width={ERRORS_WIDTH} textAlign="right" fg={THEME.textError}>
        {trace.error_count > 0 ? trace.error_count : ""}
      </text>
      <text width={DURATION_WIDTH} textAlign="right" fg={THEME.text}>
        {formatDuration(trace.duration_ms)}
      </text>
    </TableRow>
  );
}
