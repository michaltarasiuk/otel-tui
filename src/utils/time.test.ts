import { expect, test } from "bun:test";

import { formatAgo, formatDuration, formatOffset, formatTime, parseDuration } from "./time.ts";

test("formatDuration picks microseconds, milliseconds, or seconds", () => {
  expect(formatDuration(0)).toBe("0µs");
  expect(formatDuration(0.25)).toBe("250µs");
  expect(formatDuration(12.34)).toBe("12.3ms");
  expect(formatDuration(1500)).toBe("1.50s");
  expect(formatDuration(61_234)).toBe("61.23s");
});

test("formatDuration rounds before choosing the unit", () => {
  expect(formatDuration(0.9996)).toBe("1.0ms");
  expect(formatDuration(999.96)).toBe("1.00s");
});

test("formatDuration rejects a negative duration", () => {
  expect(() => formatDuration(-5)).toThrow("Duration must not be negative: -5ms");
});

test("formatOffset signs the duration", () => {
  expect(formatOffset(0)).toBe("+0µs");
  expect(formatOffset(12.34)).toBe("+12.3ms");
  expect(formatOffset(-1500)).toBe("-1.50s");
});

test("parseDuration reads a duration in milliseconds", () => {
  expect(parseDuration("100ns")).toBeCloseTo(0.0001);
  expect(parseDuration("250us")).toBe(0.25);
  expect(parseDuration("250µs")).toBe(0.25);
  expect(parseDuration("500ms")).toBe(500);
  expect(parseDuration("1.5s")).toBe(1500);
  expect(parseDuration("2m")).toBe(120_000);
  expect(parseDuration("1h")).toBe(3_600_000);
});

test("parseDuration takes a bare number as milliseconds", () => {
  expect(parseDuration("500")).toBe(500);
});

test("parseDuration rejects anything else", () => {
  expect(parseDuration("")).toBeUndefined();
  expect(parseDuration("fast")).toBeUndefined();
  expect(parseDuration("5 ms")).toBeUndefined();
  expect(parseDuration("-5ms")).toBeUndefined();
  expect(parseDuration("5d")).toBeUndefined();
});

test("formatAgo rounds down to whole seconds, minutes, or hours", () => {
  expect(formatAgo(999)).toBe("just now");
  expect(formatAgo(1000)).toBe("1s ago");
  expect(formatAgo(59_999)).toBe("59s ago");
  expect(formatAgo(60_000)).toBe("1m ago");
  expect(formatAgo(3_599_999)).toBe("59m ago");
  expect(formatAgo(90_000_000)).toBe("25h ago");
});

test("formatTime shows a 24-hour time down to the given precision", () => {
  const afternoon = Date.parse("2026-10-28T13:05:09.007Z");
  const midnight = Date.parse("2026-10-28T00:00:00.000Z");
  const lastMoment = Date.parse("2026-10-28T23:59:59.999Z");

  expect(formatTime(afternoon)).toBe("13:05:09.007");
  expect(formatTime(afternoon, "second")).toBe("13:05:09");
  expect(formatTime(afternoon, "minute")).toBe("13:05");
  expect(formatTime(midnight, "minute")).toBe("00:00");
  expect(formatTime(lastMoment)).toBe("23:59:59.999");
});
