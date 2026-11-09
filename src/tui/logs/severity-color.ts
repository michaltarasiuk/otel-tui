import type { ColorInput } from "@opentui/core";

import type { SeverityLevel } from "#telemetry/logs/severity.ts";
import { THEME } from "#tui/theme/theme.ts";

const SEVERITY_COLORS = {
  TRACE: THEME.textMuted,
  DEBUG: THEME.textMuted,
  INFO: THEME.text,
  WARN: THEME.textWarning,
  ERROR: THEME.textError,
  FATAL: THEME.textError,
} satisfies Record<SeverityLevel, ColorInput>;

export function severityColor(level: SeverityLevel | null) {
  return level === null ? THEME.textMuted : SEVERITY_COLORS[level];
}
