import { expect, test } from "bun:test";

import { clamp } from "./clamp.ts";

test("keeps a value inside the range", () => {
  expect(clamp(5, 0, 10)).toBe(5);
});

test("limits a value to the nearest bound", () => {
  expect(clamp(-3, 0, 10)).toBe(0);
  expect(clamp(12, 0, 10)).toBe(10);
});

test("returns the lower bound when the range is empty", () => {
  expect(clamp(5, 0, -1)).toBe(0);
});
