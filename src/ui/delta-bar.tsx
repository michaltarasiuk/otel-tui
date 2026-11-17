import { TextAttributes } from "@opentui/core";

import { formatDuration, formatOffset } from "#utils/time.ts";

import { THEME } from "./theme.ts";

const HALF_GROW_TOTAL = 1000;

interface DeltaBarProps {
  grow: number;
  deltaMs: number;
  maxDeltaMs: number;
}

export function DeltaBar({ grow, deltaMs, maxDeltaMs }: DeltaBarProps) {
  const size = maxDeltaMs > 0 ? (Math.abs(deltaMs) / maxDeltaMs) * HALF_GROW_TOTAL : 0;
  const faster = deltaMs < 0 ? size : 0;
  const slower = deltaMs > 0 ? size : 0;

  return (
    <box flexDirection="row" flexGrow={grow} flexBasis={0}>
      <box flexGrow={HALF_GROW_TOTAL - faster} flexBasis={0} />
      {faster > 0 && (
        <box flexGrow={faster} flexBasis={0} minWidth={1} backgroundColor={THEME.bar} />
      )}
      {slower > 0 && (
        <box flexGrow={slower} flexBasis={0} minWidth={1} backgroundColor={THEME.textError} />
      )}
      <box flexGrow={HALF_GROW_TOTAL - slower} flexBasis={0} />
    </box>
  );
}

interface DeltaScaleProps {
  grow: number;
  maxDeltaMs: number;
}

export function DeltaScale({ grow, maxDeltaMs }: DeltaScaleProps) {
  return (
    <box flexDirection="row" justifyContent="space-between" flexGrow={grow} flexBasis={0}>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        -{formatDuration(maxDeltaMs)}
      </text>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        0
      </text>
      <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
        {formatOffset(maxDeltaMs)}
      </text>
    </box>
  );
}
