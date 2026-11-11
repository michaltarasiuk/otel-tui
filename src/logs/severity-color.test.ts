import { expect, test } from "bun:test";

import { THEME } from "#ui/theme.ts";

import { severityColor } from "./severity-color.ts";

test("colors severities by how urgent they are", () => {
  expect(severityColor("DEBUG")).toBe(THEME.textMuted);
  expect(severityColor("INFO")).toBe(THEME.text);
  expect(severityColor("WARN")).toBe(THEME.textWarning);
  expect(severityColor("FATAL")).toBe(THEME.textError);
  expect(severityColor(null)).toBe(THEME.textMuted);
});
