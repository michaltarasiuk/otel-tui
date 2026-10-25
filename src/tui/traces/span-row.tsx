import { formatDuration } from "../../utils/format-duration.ts";
import { COLUMN_GAP, HEADER_CELL_PROPS, SERVICE_WIDTH } from "../columns.ts";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { useFocused } from "../focus.tsx";
import { ServiceName } from "../service-name.tsx";
import { serviceColor, THEME } from "../theme.ts";
import type { Span } from "./span.ts";

const DURATION_WIDTH = 8;
const INDENT_WIDTH = 2;
const NAME_GROW = 2;
const TIMELINE_GROW = 3;
const TIMELINE_GROW_TOTAL = 1000;

function barColor(span: Span) {
  if (span.is_error) {
    return THEME.textError;
  }
  return span.service_name === null ? THEME.textMuted : serviceColor(span.service_name);
}

interface SpanHeaderRowProps {
  traceDurationMs: number;
}

export function SpanHeaderRow({ traceDurationMs }: SpanHeaderRowProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      <text {...HEADER_CELL_PROPS} width={SERVICE_WIDTH}>
        Service
      </text>
      <text {...HEADER_CELL_PROPS} flexGrow={NAME_GROW} flexBasis={IGNORE_CONTENT_SIZE}>
        Name
      </text>
      <text {...HEADER_CELL_PROPS} width={DURATION_WIDTH} textAlign="right">
        Duration
      </text>
      <box
        flexDirection="row"
        justifyContent="space-between"
        flexGrow={TIMELINE_GROW}
        flexBasis={IGNORE_CONTENT_SIZE}
      >
        <text {...HEADER_CELL_PROPS}>0</text>
        <text {...HEADER_CELL_PROPS}>{formatDuration(traceDurationMs)}</text>
      </box>
    </box>
  );
}

interface SpanBarProps {
  span: Span;
  traceDurationMs: number;
}

function SpanBar({ span, traceDurationMs }: SpanBarProps) {
  function toGrow(ms: number) {
    return traceDurationMs > 0 ? (ms / traceDurationMs) * TIMELINE_GROW_TOTAL : 0;
  }

  const before = toGrow(span.offset_ms);
  const during = toGrow(span.duration_ms);
  const after = Math.max(0, TIMELINE_GROW_TOTAL - before - during);

  return (
    <box flexDirection="row" flexGrow={TIMELINE_GROW} flexBasis={IGNORE_CONTENT_SIZE}>
      <box flexGrow={before} flexBasis={IGNORE_CONTENT_SIZE} />
      <box
        flexGrow={during}
        flexBasis={IGNORE_CONTENT_SIZE}
        minWidth={1}
        backgroundColor={barColor(span)}
      />
      <box flexGrow={after} flexBasis={IGNORE_CONTENT_SIZE} />
    </box>
  );
}

interface SpanRowProps {
  span: Span;
  traceDurationMs: number;
  selected: boolean;
}

export function SpanRow({ span, traceDurationMs, selected }: SpanRowProps) {
  const focused = useFocused();

  const secondaryColor = selected ? THEME.text : THEME.textMuted;

  return (
    <box
      flexDirection="row"
      gap={COLUMN_GAP}
      paddingX={1}
      backgroundColor={selected && focused ? THEME.backgroundSelected : THEME.background}
    >
      <text width={SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {span.service_name !== null && <ServiceName name={span.service_name} />}
      </text>
      <text
        flexGrow={NAME_GROW}
        flexBasis={IGNORE_CONTENT_SIZE}
        fg={span.is_error ? THEME.textError : THEME.text}
        wrapMode="none"
        truncate
      >
        {`${" ".repeat(span.depth * INDENT_WIDTH)}${span.name}`}
      </text>
      <text width={DURATION_WIDTH} textAlign="right" fg={THEME.text}>
        {formatDuration(span.duration_ms)}
      </text>
      <SpanBar span={span} traceDurationMs={traceDurationMs} />
    </box>
  );
}
