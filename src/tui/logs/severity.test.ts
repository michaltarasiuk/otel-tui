import { expect, test } from "bun:test";

import { THEME } from "../theme.ts";
import { isErrorLevel, lowestSeverityNumber, severityColor, severityLevel } from "./severity.ts";

test.each([
  [1, "TRACE"],
  [4, "TRACE"],
  [5, "DEBUG"],
  [9, "INFO"],
  [13, "WARN"],
  [16, "WARN"],
  [17, "ERROR"],
  [21, "FATAL"],
  [24, "FATAL"],
] as const)("reads severity number %d as %s", (severityNumber, level) => {
  expect(severityLevel(severityNumber)).toBe(level);
});

test("has no level for an unset or out-of-range severity number", () => {
  expect(severityLevel(null)).toBeNull();
  expect(severityLevel(0)).toBeNull();
  expect(severityLevel(25)).toBeNull();
});

test("starts each level at its lowest severity number", () => {
  expect(lowestSeverityNumber("TRACE")).toBe(1);
  expect(lowestSeverityNumber("INFO")).toBe(9);
  expect(lowestSeverityNumber("ERROR")).toBe(17);
  expect(severityLevel(lowestSeverityNumber("FATAL"))).toBe("FATAL");
});

test("counts ERROR and FATAL as errors", () => {
  expect(isErrorLevel("ERROR")).toBe(true);
  expect(isErrorLevel("FATAL")).toBe(true);
  expect(isErrorLevel("WARN")).toBe(false);
  expect(isErrorLevel(null)).toBe(false);
});

test("colors severities by how urgent they are", () => {
  expect(severityColor("DEBUG")).toBe(THEME.textMuted);
  expect(severityColor("INFO")).toBe(THEME.text);
  expect(severityColor("WARN")).toBe(THEME.textWarning);
  expect(severityColor("FATAL")).toBe(THEME.textError);
  expect(severityColor(null)).toBe(THEME.textMuted);
});
