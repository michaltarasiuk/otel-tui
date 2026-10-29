import type { ColorInput } from "@opentui/core";

import { THEME } from "../theme.ts";

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

const SEVERITY_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;

const SEVERITY_NUMBERS_PER_LEVEL = 4;

const SEVERITY_COLORS = {
  TRACE: THEME.textMuted,
  DEBUG: THEME.textMuted,
  INFO: THEME.text,
  WARN: THEME.textWarning,
  ERROR: THEME.textError,
  FATAL: THEME.textError,
} satisfies Record<SeverityLevel, ColorInput>;

export function severityLevel(severityNumber: number | null) {
  if (severityNumber === null) {
    return null;
  }
  return SEVERITY_LEVELS[Math.floor((severityNumber - 1) / SEVERITY_NUMBERS_PER_LEVEL)] ?? null;
}

export function lowestSeverityNumber(level: SeverityLevel) {
  return SEVERITY_LEVELS.indexOf(level) * SEVERITY_NUMBERS_PER_LEVEL + 1;
}

export function isErrorLevel(level: SeverityLevel | null) {
  return level === "ERROR" || level === "FATAL";
}

export function severityColor(level: SeverityLevel | null) {
  return level === null ? THEME.textMuted : SEVERITY_COLORS[level];
}
