import { expect, test } from "bun:test";

import { formatTimeOfDay } from "./format-time-of-day.ts";

test("shows a 24-hour time down to the given precision", () => {
  const afternoon = Date.parse("2026-10-28T13:05:09.007Z");
  const midnight = Date.parse("2026-10-28T00:00:00.000Z");

  expect(formatTimeOfDay(afternoon)).toBe("13:05:09.007");
  expect(formatTimeOfDay(afternoon, "minute")).toBe("13:05");
  expect(formatTimeOfDay(afternoon, "second")).toBe("13:05:09");
  expect(formatTimeOfDay(midnight, "minute")).toBe("00:00");
  expect(formatTimeOfDay(Date.parse("2026-10-28T23:59:59.999Z"))).toBe("23:59:59.999");
});
