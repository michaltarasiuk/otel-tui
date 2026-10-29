import { expect, test } from "bun:test";

import { formatShownCount } from "./format-shown-count.ts";

test("shows only the total when everything is shown", () => {
  expect(formatShownCount(3, 3, "log")).toBe("3 logs");
  expect(formatShownCount(1, 1, "log")).toBe("1 log");
});

test("shows how many of the total are shown", () => {
  expect(formatShownCount(2, 1_500, "log")).toBe("2 of 1,500 logs");
});
