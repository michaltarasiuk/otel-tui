import { expect, test } from "bun:test";

import { formatTime } from "./format-time.ts";

const afternoon = Date.parse("2026-10-28T13:05:09.007Z");
const midnight = Date.parse("2026-10-28T00:00:00.000Z");
const lastMillisecondOfDay = Date.parse("2026-10-28T23:59:59.999Z");

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
