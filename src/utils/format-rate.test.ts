import { expect, test } from "bun:test";

import { formatRate } from "./format-rate.ts";

test("shows no traffic as zero per second", () => {
  expect(formatRate(0)).toBe("0/s");
});

test("switches to per minute below a tenth per second", () => {
  expect(formatRate(1 / 300)).toBe("0.2/min");
});

test("keeps one decimal below ten per second", () => {
  expect(formatRate(1.23)).toBe("1.2/s");
});

test("rounds to whole numbers from ten per second", () => {
  expect(formatRate(1234.4)).toBe("1,234/s");
});
