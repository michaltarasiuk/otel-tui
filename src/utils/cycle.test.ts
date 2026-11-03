import { expect, test } from "bun:test";

import { cycle } from "./cycle.ts";

const VIEWS = ["traces", "metrics", "logs"] as const;

test("steps to the next or previous item", () => {
  expect(cycle(VIEWS, "metrics", 1)).toBe("logs");
  expect(cycle(VIEWS, "metrics", -1)).toBe("traces");
});

test("wraps around both ends", () => {
  expect(cycle(VIEWS, "logs", 1)).toBe("traces");
  expect(cycle(VIEWS, "traces", -1)).toBe("logs");
});

test("treats undefined as an item", () => {
  const levels = [undefined, "WARN", "ERROR"] as const;

  expect(cycle(levels, undefined, 1)).toBe("WARN");
  expect(cycle(levels, "ERROR", 1)).toBeUndefined();
});
