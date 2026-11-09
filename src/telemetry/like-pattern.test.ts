import { expect, test } from "bun:test";

import { substringPattern } from "./like-pattern.ts";

test("matches the search anywhere in the text", () => {
  expect(substringPattern("cart")).toBe("%cart%");
});

test("matches everything for an empty search", () => {
  expect(substringPattern("")).toBe("%%");
});

test("escapes like wildcards and the escape character", () => {
  expect(substringPattern("100%")).toBe("%100\\%%");
  expect(substringPattern("get_product_list")).toBe("%get\\_product\\_list%");
  expect(substringPattern("C:\\temp")).toBe("%C:\\\\temp%");
});
