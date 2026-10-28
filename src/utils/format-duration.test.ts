import { expect, test } from "bun:test";

import { formatDuration } from "./format-duration.ts";

test("shows durations under a millisecond in microseconds", () => {
  expect(formatDuration(0)).toBe("0µs");
  expect(formatDuration(0.25)).toBe("250µs");
  expect(formatDuration(0.9994)).toBe("999µs");
});

test("shows durations under ten seconds in milliseconds", () => {
  expect(formatDuration(12.34)).toBe("12.3ms");
  expect(formatDuration(999.94)).toBe("999.9ms");
});

test("shows longer durations in seconds", () => {
  expect(formatDuration(1500)).toBe("1.50s");
  expect(formatDuration(61_234)).toBe("61.23s");
});

test("rounds before choosing the unit", () => {
  expect(formatDuration(0.9996)).toBe("1.0ms");
  expect(formatDuration(999.96)).toBe("1.00s");
});
