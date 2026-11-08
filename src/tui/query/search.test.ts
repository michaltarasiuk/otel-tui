import { expect, test } from "bun:test";

import { parseSearch } from "./search.ts";

test("keeps plain words as text", () => {
  expect(parseSearch("GET  /api/cart")).toEqual({ text: "GET /api/cart", attributes: [] });
});

test("reads key=value terms as attribute filters", () => {
  expect(parseSearch("http.route=/api/cart checkout service.name=cart")).toEqual({
    text: "checkout",
    attributes: [
      { key: "http.route", value: "/api/cart" },
      { key: "service.name", value: "cart" },
    ],
  });
});

test("matches an empty value", () => {
  expect(parseSearch("error=")).toEqual({ text: "", attributes: [{ key: "error", value: "" }] });
});

test("treats a term that starts with = as text", () => {
  expect(parseSearch("=x")).toEqual({ text: "=x", attributes: [] });
});
