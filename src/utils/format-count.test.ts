import { expect, test } from "bun:test";

import { formatCount } from "./format-count.ts";

test("uses the singular unit for one", () => {
  expect(formatCount(1, "span")).toBe("1 span");
});

test("uses the plural unit for any other count", () => {
  expect(formatCount(0, "span")).toBe("0 spans");
  expect(formatCount(3, "span")).toBe("3 spans");
});

test("groups thousands", () => {
  expect(formatCount(12_345, "span")).toBe("12,345 spans");
});
