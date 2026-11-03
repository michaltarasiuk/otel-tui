import { describe, expect, test } from "bun:test";

import { clamp, wrapIndex } from "./math.ts";

describe("clamp", () => {
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
});

describe("wrapIndex", () => {
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
});
