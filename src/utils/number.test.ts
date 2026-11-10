import { expect, test } from "bun:test";

import {
  clamp,
  formatCount,
  formatInteger,
  formatPercent,
  formatRate,
  formatShownCount,
  round,
} from "./number.ts";

test("clamp limits a value to the range", () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-3, 0, 10)).toBe(0);
  expect(clamp(12, 0, 10)).toBe(10);
});

test("clamp prefers the minimum when the range is empty", () => {
  expect(clamp(5, 0, -1)).toBe(0);
});

test("round keeps the given number of decimals", () => {
  expect(round(12.34, 1)).toBe(12.3);
  expect(round(12.35, 1)).toBe(12.4);
  expect(round(999.96, 1)).toBe(1000);
  expect(round(1.005, 0)).toBe(1);
});

test("formatInteger groups thousands", () => {
  expect(formatInteger(0)).toBe("0");
  expect(formatInteger(12_345)).toBe("12,345");
  expect(formatInteger(1234.6)).toBe("1,235");
});

test("formatCount pluralizes the noun", () => {
  expect(formatCount(1, "span")).toBe("1 span");
  expect(formatCount(0, "span")).toBe("0 spans");
  expect(formatCount(12_345, "span")).toBe("12,345 spans");
  expect(formatCount(4, "series", "series")).toBe("4 series");
});

test("formatShownCount names the total only when some are hidden", () => {
  expect(formatShownCount(3, 3, "log")).toBe("3 logs");
  expect(formatShownCount(1, 1, "log")).toBe("1 log");
  expect(formatShownCount(2, 1_500, "log")).toBe("2 of 1,500 logs");
  expect(formatShownCount(1, 5, "log")).toBe("1 of 5 logs");
});

test("formatPercent shows a ratio with one decimal", () => {
  expect(formatPercent(0)).toBe("0.0%");
  expect(formatPercent(0.0842)).toBe("8.4%");
  expect(formatPercent(1)).toBe("100.0%");
});

test("formatRate picks per minute, decimals, or whole numbers", () => {
  expect(formatRate(0)).toBe("0/s");
  expect(formatRate(1 / 300)).toBe("0.2/min");
  expect(formatRate(1.23)).toBe("1.2/s");
  expect(formatRate(1234.4)).toBe("1,234/s");
});
