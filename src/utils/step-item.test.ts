import { expect, test } from "bun:test";

import { stepItem } from "./step-item.ts";

const VIEWS = ["traces", "metrics", "logs"] as const;

test("steps to the following and the preceding item", () => {
  expect(stepItem(VIEWS, "traces", 1)).toBe("metrics");
  expect(stepItem(VIEWS, "logs", -1)).toBe("metrics");
});

test("wraps around the ends", () => {
  expect(stepItem(VIEWS, "logs", 1)).toBe("traces");
  expect(stepItem(VIEWS, "traces", -1)).toBe("logs");
});

test("enters at the first or the last item when the current item is missing", () => {
  const names: [string, ...string[]] = ["a", "b", "c"];

  expect(stepItem(names, "z", 1)).toBe("a");
  expect(stepItem(names, "z", -1)).toBe("c");
});

test("treats undefined as an item", () => {
  const levels = [undefined, "WARN", "ERROR"] as const;

  expect(stepItem(levels, undefined, 1)).toBe("WARN");
  expect(stepItem(levels, "ERROR", 1)).toBeUndefined();
  expect(stepItem(levels, undefined, -1)).toBe("ERROR");
});
