import { describe, expect, test } from "bun:test";

import { formatDuration, formatTime, formatTimeAgo } from "./time.ts";

const afternoon = Date.parse("2026-10-28T13:05:09.007Z");
const midnight = Date.parse("2026-10-28T00:00:00.000Z");
const lastMillisecondOfDay = Date.parse("2026-10-28T23:59:59.999Z");

describe("formatTime", () => {
  test("shows the time of day with milliseconds by default", () => {
    expect(formatTime(afternoon)).toBe("13:05:09.007");
  });

  test("shows the time of day down to the given precision", () => {
    expect(formatTime(afternoon, "minute")).toBe("13:05");
    expect(formatTime(afternoon, "second")).toBe("13:05:09");
    expect(formatTime(afternoon, "millisecond")).toBe("13:05:09.007");
  });

  test("uses a 24-hour clock at every precision", () => {
    expect(formatTime(midnight, "minute")).toBe("00:00");
    expect(formatTime(midnight, "second")).toBe("00:00:00");
    expect(formatTime(midnight, "millisecond")).toBe("00:00:00.000");
    expect(formatTime(lastMillisecondOfDay, "minute")).toBe("23:59");
    expect(formatTime(lastMillisecondOfDay, "second")).toBe("23:59:59");
    expect(formatTime(lastMillisecondOfDay, "millisecond")).toBe("23:59:59.999");
  });
});

describe("formatTimeAgo", () => {
  test("says just now under a second", () => {
    expect(formatTimeAgo(0)).toBe("just now");
    expect(formatTimeAgo(999)).toBe("just now");
  });

  test("rounds down to whole seconds, minutes, or hours", () => {
    expect(formatTimeAgo(1000)).toBe("1s ago");
    expect(formatTimeAgo(59_999)).toBe("59s ago");
    expect(formatTimeAgo(60_000)).toBe("1m ago");
    expect(formatTimeAgo(3_599_999)).toBe("59m ago");
    expect(formatTimeAgo(3_600_000)).toBe("1h ago");
    expect(formatTimeAgo(90_000_000)).toBe("25h ago");
  });
});

describe("formatDuration", () => {
  test("shows durations under a millisecond in microseconds", () => {
    expect(formatDuration(0)).toBe("0µs");
    expect(formatDuration(0.25)).toBe("250µs");
    expect(formatDuration(0.9994)).toBe("999µs");
  });

  test("shows durations under a second in milliseconds", () => {
    expect(formatDuration(12.34)).toBe("12.3ms");
    expect(formatDuration(999.94)).toBe("999.9ms");
  });

  test("shows longer durations in seconds", () => {
    expect(formatDuration(1500)).toBe("1.50s");
    expect(formatDuration(61_234)).toBe("61.23s");
  });

  test("rejects a negative duration", () => {
    expect(() => formatDuration(-5)).toThrow("Duration must not be negative: -5ms");
  });

  test("rounds before choosing the unit", () => {
    expect(formatDuration(0.9996)).toBe("1.0ms");
    expect(formatDuration(999.96)).toBe("1.00s");
  });
});
