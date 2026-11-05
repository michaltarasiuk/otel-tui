import { expect, test } from "bun:test";

import { wrapIndex } from "./wrap-index.ts";

test("wraps an index into the range from either end", () => {
  expect(wrapIndex(2, 3)).toBe(2);
  expect(wrapIndex(7, 3)).toBe(1);
  expect(wrapIndex(-1, 3)).toBe(2);
  expect(wrapIndex(-4, 3)).toBe(2);
});
