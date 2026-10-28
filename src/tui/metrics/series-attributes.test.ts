import { expect, test } from "bun:test";

import { attributeValues, compareValues } from "./series-attributes.ts";

test("collects the distinct values of each attribute across sets", () => {
  const attributeSets = [
    [
      { key: "http.route", value: "/b" },
      { key: "status", value: "10" },
    ],
    [
      { key: "http.route", value: "/a" },
      { key: "status", value: "2" },
    ],
    [
      { key: "http.route", value: "/a" },
      { key: "error", value: null },
    ],
  ];

  expect(attributeValues(attributeSets)).toEqual([
    { key: "http.route", values: ["/a", "/b"], setCount: 3 },
    { key: "status", values: ["2", "10"], setCount: 2 },
    { key: "error", values: ["null"], setCount: 1 },
  ]);
});

test("orders numbers inside values by their value", () => {
  expect(compareValues("2", "10")).toBeLessThan(0);
  expect(compareValues("pod-10", "pod-9")).toBeGreaterThan(0);
  expect(compareValues("b", "a")).toBeGreaterThan(0);
});
