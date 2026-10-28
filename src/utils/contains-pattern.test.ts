import { expect, test } from "bun:test";

import { containsPattern } from "./contains-pattern.ts";

test("matches the search anywhere in the text", () => {
  expect(containsPattern("cart")).toBe("%cart%");
});

test("matches everything for an empty search", () => {
  expect(containsPattern("")).toBe("%%");
});

test("escapes like wildcards and the escape character", () => {
  expect(containsPattern("100%")).toBe("%100\\%%");
  expect(containsPattern("user_id")).toBe("%user\\_id%");
  expect(containsPattern("C:\\temp")).toBe("%C:\\\\temp%");
});
