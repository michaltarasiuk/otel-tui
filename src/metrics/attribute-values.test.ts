import { expect, test } from "bun:test";

import { attributeValues } from "./attribute-values.ts";

test("collects the distinct values of each attribute across sets", () => {
  const attributeSets = [
    [
      { key: "http.route", value: "/api/currency" },
      { key: "rpc.grpc.status_code", value: "14" },
    ],
    [
      { key: "http.route", value: "/api/cart" },
      { key: "rpc.grpc.status_code", value: "2" },
    ],
    [
      { key: "http.route", value: "/api/cart" },
      { key: "error.type", value: null },
    ],
  ];

  expect(attributeValues(attributeSets)).toEqual([
    { key: "http.route", values: ["/api/cart", "/api/currency"], setCount: 3 },
    { key: "rpc.grpc.status_code", values: ["2", "14"], setCount: 2 },
    { key: "error.type", values: ["null"], setCount: 1 },
  ]);
});
