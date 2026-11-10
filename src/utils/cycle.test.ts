import { expect, test } from "bun:test";

import { cycle, findNextIndex } from "./cycle.ts";

const VIEWS = ["traces", "metrics", "logs"] as const;

const STATUS_CODES = [200, 503, 200, 500, 200];

function isError(status: number) {
  return status >= 500;
}

test("cycle steps to the following and the preceding item", () => {
  expect(cycle(VIEWS, "traces", 1)).toBe("metrics");
  expect(cycle(VIEWS, "logs", -1)).toBe("metrics");
});

test("cycle wraps around the ends", () => {
  expect(cycle(VIEWS, "logs", 1)).toBe("traces");
  expect(cycle(VIEWS, "traces", -1)).toBe("logs");
});

test("cycle enters at the first or the last item when the current one is missing", () => {
  const services: [string, ...string[]] = ["cart", "checkout", "payment"];

  expect(cycle(services, "frontend", 1)).toBe("cart");
  expect(cycle(services, "frontend", -1)).toBe("payment");
});

test("cycle treats undefined as an item", () => {
  const severities = [undefined, "WARN", "ERROR"] as const;

  expect(cycle(severities, undefined, 1)).toBe("WARN");
  expect(cycle(severities, "ERROR", 1)).toBeUndefined();
  expect(cycle(severities, undefined, -1)).toBe("ERROR");
});

test("findNextIndex finds the next and the previous match", () => {
  expect(findNextIndex(STATUS_CODES, 1, 1, (status) => isError(status))).toBe(3);
  expect(findNextIndex(STATUS_CODES, 3, -1, (status) => isError(status))).toBe(1);
});

test("findNextIndex wraps around the ends", () => {
  expect(findNextIndex(STATUS_CODES, 3, 1, (status) => isError(status))).toBe(1);
  expect(findNextIndex(STATUS_CODES, 1, -1, (status) => isError(status))).toBe(3);
});

test("findNextIndex lands on the current item when it is the only match", () => {
  expect(findNextIndex([200, 503, 200], 1, 1, (status) => isError(status))).toBe(1);
});

test("findNextIndex stays put when nothing matches", () => {
  expect(findNextIndex(STATUS_CODES, 2, 1, (status) => status === 404)).toBe(2);
  expect(findNextIndex([], 0, 1, (status: number) => isError(status))).toBe(0);
});
