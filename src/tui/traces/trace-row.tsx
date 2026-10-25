import { formatDuration } from "../../utils/format-duration.ts";
import { formatTime } from "../../utils/format-time.ts";
import { useFocused } from "../focus.tsx";
import { ServiceName } from "../service-name.tsx";
import { THEME } from "../theme.ts";
import { COLUMN_GAP, HEADER_CELL_PROPS, SERVICE_WIDTH } from "./columns.ts";
import type { Trace, TraceSort, TraceSortColumn } from "./trace.ts";

const SORT_ARROW_WIDTH = 2;
const TIME_WIDTH = 12;
const SPANS_WIDTH = 5 + SORT_ARROW_WIDTH;
const ERRORS_WIDTH = 6 + SORT_ARROW_WIDTH;
const DURATION_WIDTH = 8 + SORT_ARROW_WIDTH;

function sortArrow(sort: TraceSort, column: TraceSortColumn) {
  if (sort.column !== column) {
    return "";
  }
  return sort.descending ? "▼" : "▲";
}

interface TraceHeaderRowProps {
  sort: TraceSort;
}

export function TraceHeaderRow({ sort }: TraceHeaderRowProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
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
    </box>
  );
}

interface TraceRowProps {
  trace: Trace;
  selected: boolean;
}

export function TraceRow({ trace, selected }: TraceRowProps) {
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
    </box>
  );
}
