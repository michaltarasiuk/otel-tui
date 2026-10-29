import { expect, test } from "bun:test";

import { collapseSpaces } from "./collapse-spaces.ts";

test("collapses runs of whitespace into one space", () => {
  expect(collapseSpaces("GET    /cart")).toBe("GET /cart");
});

test("joins lines and tabs into a single line", () => {
  expect(collapseSpaces("first\n\tsecond\r\nthird")).toBe("first second third");
});

test("trims leading and trailing whitespace", () => {
  expect(collapseSpaces("  padded \n")).toBe("padded");
  expect(collapseSpaces(" \n ")).toBe("");
});
