import { expect, test } from "bun:test";

import { wrapIndex } from "./wrap-index.ts";

test("keeps an index inside the length", () => {
  expect(wrapIndex(2, 3)).toBe(2);
});

test("wraps an index past the end to the start", () => {
  expect(wrapIndex(3, 3)).toBe(0);
  expect(wrapIndex(7, 3)).toBe(1);
});

test("wraps a negative index from the end", () => {
  expect(wrapIndex(-1, 3)).toBe(2);
});

test("wraps an index more than one length below zero", () => {
  expect(wrapIndex(-4, 3)).toBe(2);
  expect(wrapIndex(-6, 3)).toBe(0);
});
