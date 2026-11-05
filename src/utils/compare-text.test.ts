import { expect, test } from "bun:test";

import { compareText } from "./compare-text.ts";

test("orders numbers inside text by their value", () => {
  expect(compareText("2", "10")).toBeLessThan(0);
  expect(compareText("pod-10", "pod-9")).toBeGreaterThan(0);
  expect(compareText("SPAN_KIND_SERVER", "SPAN_KIND_CLIENT")).toBeGreaterThan(0);
  expect(compareText("cart", "cart")).toBe(0);
});
