import { TextAttributes } from "@opentui/core";

import { serviceColor, THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";

import type { Span } from "./span.ts";

const TIMELINE_GROW_TOTAL = 1000;

function barColor(span: Span) {
  if (span.is_error) {
    return THEME.textError;
  }
  return span.service_name === null ? THEME.textMuted : serviceColor(span.service_name);
}

interface ScaleProps {
  grow: number;
  durationMs: number;
}

export function Scale({ grow, durationMs }: ScaleProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" flexGrow={grow} flexBasis={0}>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        0
      </text>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        {formatDuration(durationMs)}
      </text>
    </box>
  );
}

interface WaterfallBarProps {
  grow: number;
  span: Span;
  traceDurationMs: number;
}

export function WaterfallBar({ grow, span, traceDurationMs }: WaterfallBarProps) {
  function toGrow(ms: number) {
    return traceDurationMs > 0 ? (ms / traceDurationMs) * TIMELINE_GROW_TOTAL : 0;
  }

  const before = toGrow(span.offset_ms);
  const during = toGrow(span.duration_ms);
  const after = Math.max(0, TIMELINE_GROW_TOTAL - before - during);

  return (
    <box flexDirection="row" flexGrow={grow} flexBasis={0}>
      <box flexGrow={before} flexBasis={0} />
      <box flexGrow={during} flexBasis={0} minWidth={1} backgroundColor={barColor(span)} />
      <box flexGrow={after} flexBasis={0} />
    </box>
  );
}
