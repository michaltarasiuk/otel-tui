import { expect, test } from "bun:test";

import { formatTime } from "./format-time.ts";

test("shows the time of day with milliseconds", () => {
  expect(formatTime(Date.parse("2026-10-28T13:05:09.007Z"))).toBe("13:05:09.007");
});

test("uses a 24-hour clock", () => {
  expect(formatTime(Date.parse("2026-10-28T00:00:00.000Z"))).toBe("00:00:00.000");
  expect(formatTime(Date.parse("2026-10-28T23:59:59.999Z"))).toBe("23:59:59.999");
});
