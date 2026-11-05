import { expect, test } from "bun:test";

import { formatCount } from "./format-count.ts";

test("pluralizes the noun and groups thousands", () => {
  expect(formatCount(1, "span")).toBe("1 span");
  expect(formatCount(0, "span")).toBe("0 spans");
  expect(formatCount(12_345, "span")).toBe("12,345 spans");
  expect(formatCount(4, "series", "series")).toBe("4 series");
});
