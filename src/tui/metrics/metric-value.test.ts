import { describe, expect, test } from "bun:test";

import { formatMetricRate, formatMetricValue } from "./metric-value.ts";

describe("formatMetricValue", () => {
  test.each([
    [1500, "ms", "1.50s"],
    [0.25, "s", "250.0ms"],
    [250, "us", "250µs"],
    [1_500_000, "ns", "1.5ms"],
    [2, "min", "120.00s"],
  ] as const)("shows %s %s as the duration %s", (value, unit, formatted) => {
    expect(formatMetricValue(value, unit)).toBe(formatted);
  });

  test.each([
    [512, "By", "512 B"],
    [1536, "By", "1.5 KiB"],
    [1, "kBy", "1000 B"],
    [1.5, "MBy", "1.4 MiB"],
    [2048, "KiBy", "2.0 MiB"],
    [2048, "TiBy", "2048.0 TiB"],
  ] as const)("shows %s %s as %s", (value, unit, formatted) => {
    expect(formatMetricValue(value, unit)).toBe(formatted);
  });

  test("moves to the next byte unit when rounding would reach 1024", () => {
    expect(formatMetricValue(1023.96, "By")).toBe("1.0 KiB");
  });

  test("shows plain numbers for dimensionless and annotation units", () => {
    expect(formatMetricValue(42, "")).toBe("42");
    expect(formatMetricValue(0.5, "1")).toBe("0.5");
    expect(formatMetricValue(1234.56, "{request}")).toBe("1,235");
  });

  test("keeps three significant digits of a fraction", () => {
    expect(formatMetricValue(3.14159, "")).toBe("3.14");
    expect(formatMetricValue(0.012345, "")).toBe("0.0123");
  });

  test("shows millions and more in compact notation", () => {
    expect(formatMetricValue(1_234_567, "{packet}")).toBe("1.23M");
  });

  test("appends percent and other units", () => {
    expect(formatMetricValue(12.5, "%")).toBe("12.5%");
    expect(formatMetricValue(21.456, "Cel")).toBe("21.5 Cel");
  });

  test("puts the sign before the converted value", () => {
    expect(formatMetricValue(-1500, "ms")).toBe("-1.50s");
    expect(formatMetricValue(-512, "By")).toBe("-512 B");
  });
});

test("formatMetricRate shows a value per second", () => {
  expect(formatMetricRate(2.5, "{request}")).toBe("2.5/s");
  expect(formatMetricRate(1536, "By")).toBe("1.5 KiB/s");
});
