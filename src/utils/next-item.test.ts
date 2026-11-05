import { expect, test } from "bun:test";

import { nextItem } from "./next-item.ts";

const VIEWS = ["traces", "metrics", "logs"] as const;

test("steps to the following item", () => {
  expect(nextItem(VIEWS, "traces")).toBe("metrics");
});

test("wraps around to the first item", () => {
  expect(nextItem(VIEWS, "logs")).toBe("traces");
});

test("enters at the first item when the current item is missing", () => {
  const names: [string, ...string[]] = ["a", "b", "c"];

  expect(nextItem(names, "z")).toBe("a");
});

test("treats undefined as an item", () => {
  const levels = [undefined, "WARN", "ERROR"] as const;

  expect(nextItem(levels, undefined)).toBe("WARN");
  expect(nextItem(levels, "ERROR")).toBeUndefined();
});
