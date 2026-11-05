import { expect, test } from "bun:test";

import { collapseWhitespace } from "./collapse-whitespace.ts";

test("collapses runs of whitespace into one space", () => {
  expect(collapseWhitespace("GET    /api/cart")).toBe("GET /api/cart");
});

test("joins lines and tabs into a single line", () => {
  expect(
    collapseWhitespace(
      '<_InactiveRpcError of RPC that terminated with:\n\tstatus = StatusCode.INTERNAL\r\n\tdetails = "Product Catalog Fail Feature Flag Enabled">',
    ),
  ).toBe(
    '<_InactiveRpcError of RPC that terminated with: status = StatusCode.INTERNAL details = "Product Catalog Fail Feature Flag Enabled">',
  );
});

test("trims leading and trailing whitespace", () => {
  expect(collapseWhitespace("  GET /api/cart \n")).toBe("GET /api/cart");
  expect(collapseWhitespace(" \n ")).toBe("");
});
