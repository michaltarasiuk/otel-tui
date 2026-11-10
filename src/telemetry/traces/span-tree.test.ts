import { expect, test } from "bun:test";

import {
  ancestorIds,
  criticalPath,
  descendantCount,
  hiddenCounts,
  visibleSpans,
} from "./span-tree.ts";
import type { Span } from "./span.ts";

function span(
  span_id: string,
  parent_span_id: string | null,
  depth: number,
  offset_ms: number,
  duration_ms: number,
): Span {
  return {
    span_id,
    parent_span_id,
    depth,
    offset_ms,
    duration_ms,
    service_name: null,
    name: span_id,
    kind: "internal",
    is_error: false,
    status_message: null,
    start_time: offset_ms,
  };
}

// root ─┬─ a ── a1
//       └─ b
const SPANS = [
  span("root", null, 0, 0, 100),
  span("a", "root", 1, 0, 60),
  span("a1", "a", 2, 10, 20),
  span("b", "root", 1, 70, 30),
];

function ids(spans: Span[]) {
  return spans.map((span) => span.span_id);
}

test("counts every span nested under a span", () => {
  expect(descendantCount(SPANS, 0)).toBe(3);
  expect(descendantCount(SPANS, 1)).toBe(1);
  expect(descendantCount(SPANS, 3)).toBe(0);
});

test("counts the spans hidden under each collapsed span", () => {
  const collapsed = new Set(["a", "b"]);

  expect(hiddenCounts(SPANS, collapsed)).toEqual(
    new Map([
      ["a", 1],
      ["b", 0],
    ]),
  );
});

test("hides the spans under each collapsed span", () => {
  expect(ids(visibleSpans(SPANS, new Set()))).toEqual(["root", "a", "a1", "b"]);
  expect(ids(visibleSpans(SPANS, new Set(["a"])))).toEqual(["root", "a", "b"]);
  expect(ids(visibleSpans(SPANS, new Set(["root"])))).toEqual(["root"]);
});

test("lists a span's ancestors from its parent up", () => {
  expect(ancestorIds(SPANS, "a1")).toEqual(["a", "root"]);
  expect(ancestorIds(SPANS, "root")).toEqual([]);
});

test("follows the child that ends last, then the one before it", () => {
  expect([...criticalPath(SPANS)].sort()).toEqual(["a", "a1", "b", "root"]);
});

test("leaves out a child that runs alongside a longer one", () => {
  const spans = [
    span("root", null, 0, 0, 100),
    span("slow", "root", 1, 0, 90),
    span("fast", "root", 1, 10, 20),
  ];

  expect([...criticalPath(spans)].sort()).toEqual(["root", "slow"]);
});
