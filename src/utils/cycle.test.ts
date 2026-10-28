import { expect, test } from "bun:test";

import { cycle } from "./cycle.ts";

const SIZES = ["small", "medium", "large"] as const;

test("steps to the next or previous item", () => {
  expect(cycle(SIZES, "medium", 1)).toBe("large");
  expect(cycle(SIZES, "medium", -1)).toBe("small");
});

test("wraps around both ends", () => {
  expect(cycle(SIZES, "large", 1)).toBe("small");
  expect(cycle(SIZES, "small", -1)).toBe("large");
});

test("treats undefined as an item", () => {
  const levels = [undefined, "WARN", "ERROR"] as const;

  expect(cycle(levels, undefined, 1)).toBe("WARN");
  expect(cycle(levels, "ERROR", 1)).toBeUndefined();
});
