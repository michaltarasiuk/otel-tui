import { expect, test } from "bun:test";

import { formatPercent } from "./format-percent.ts";

test("shows a ratio as a percentage with one decimal", () => {
  expect(formatPercent(0)).toBe("0.0%");
  expect(formatPercent(0.0842)).toBe("8.4%");
  expect(formatPercent(1)).toBe("100.0%");
});
