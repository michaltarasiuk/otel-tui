import { expect, test } from "bun:test";

import { parseSearch } from "./search.ts";

test("keeps plain words as text", () => {
  expect(parseSearch("GET  /api/cart")).toEqual({ text: "GET /api/cart", attributes: [] });
});

test("reads key=value terms as attribute filters", () => {
  expect(parseSearch("http.route=/api/cart checkout service.name=cart")).toEqual({
    text: "checkout",
    attributes: [
      { key: "http.route", operator: "=", value: "/api/cart", number: null },
      { key: "service.name", operator: "=", value: "cart", number: null },
    ],
  });
});

test("matches an empty value", () => {
  expect(parseSearch("error=")).toEqual({
    text: "",
    attributes: [{ key: "error", operator: "=", value: "", number: null }],
  });
});

test("treats a term that starts with an operator as text", () => {
  expect(parseSearch("=x >5")).toEqual({ text: "=x >5", attributes: [] });
});

test("reads != as a filter on a different value", () => {
  expect(parseSearch("service.name!=cart").attributes).toEqual([
    { key: "service.name", operator: "!=", value: "cart", number: null },
  ]);
});

test("compares numbers with >, >=, <, and <=", () => {
  expect(parseSearch("http.status_code>=500 retries>1 size<1.5 items<=0").attributes).toEqual([
    { key: "http.status_code", operator: ">=", value: "500", number: 500 },
    { key: "retries", operator: ">", value: "1", number: 1 },
    { key: "size", operator: "<", value: "1.5", number: 1.5 },
    { key: "items", operator: "<=", value: "0", number: 0 },
  ]);
});

test("reads duration comparisons in milliseconds", () => {
  expect(parseSearch("duration>1.5s duration<=250us").attributes).toEqual([
    { key: "duration", operator: ">", value: "1.5s", number: 1500 },
    { key: "duration", operator: "<=", value: "250us", number: 0.25 },
  ]);
});

test("treats a comparison with something other than a number as text", () => {
  expect(parseSearch("a>b duration>soon status>")).toEqual({
    text: "a>b duration>soon status>",
    attributes: [],
  });
});
