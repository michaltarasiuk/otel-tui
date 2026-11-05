import { expect, test } from "bun:test";

import { roundToTenths } from "./round-to-tenths.ts";

test("rounds to the nearest tenth", () => {
  expect(roundToTenths(12.34)).toBe(12.3);
  expect(roundToTenths(12.35)).toBe(12.4);
  expect(roundToTenths(999.96)).toBe(1000);
});
