import { expect, test } from "bun:test";

import { findNextIndex } from "./find-next-index.ts";

const ITEMS = [1, 2, 3, 4, 5];

function isEven(value: number) {
  return value % 2 === 0;
}

test("finds the next matching item after the current one", () => {
  expect(findNextIndex(ITEMS, 1, 1, (value) => isEven(value))).toBe(3);
});

test("finds the previous matching item before the current one", () => {
  expect(findNextIndex(ITEMS, 3, -1, (value) => isEven(value))).toBe(1);
});

test("wraps around the ends", () => {
  expect(findNextIndex(ITEMS, 3, 1, (value) => isEven(value))).toBe(1);
  expect(findNextIndex(ITEMS, 1, -1, (value) => isEven(value))).toBe(3);
});

test("stays put when nothing matches", () => {
  expect(findNextIndex(ITEMS, 2, 1, (value) => value > 10)).toBe(2);
});
