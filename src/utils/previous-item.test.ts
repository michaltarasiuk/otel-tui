import { expect, test } from "bun:test";

import { previousItem } from "./previous-item.ts";

const VIEWS = ["traces", "metrics", "logs"] as const;

test("steps to the preceding item", () => {
  expect(previousItem(VIEWS, "logs")).toBe("metrics");
});

test("wraps around to the last item", () => {
  expect(previousItem(VIEWS, "traces")).toBe("logs");
});

test("enters at the last item when the current item is missing", () => {
  const names: [string, ...string[]] = ["a", "b", "c"];

  expect(previousItem(names, "z")).toBe("c");
});

test("treats undefined as an item", () => {
  const levels = [undefined, "WARN", "ERROR"] as const;

  expect(previousItem(levels, undefined)).toBe("ERROR");
});
