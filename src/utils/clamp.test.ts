import { expect, test } from "bun:test";

import { clamp } from "./clamp.ts";

test("limits a value to the range", () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-3, 0, 10)).toBe(0);
  expect(clamp(12, 0, 10)).toBe(10);
  expect(clamp(5, 0, -1)).toBe(0);
});
