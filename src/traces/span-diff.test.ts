import { expect, test } from "bun:test";

import {
  diffOperations,
  diffSpans,
  durationDelta,
  hasChanged,
  type SpanDiff,
} from "./span-diff.ts";
import type { Span } from "./span.ts";

function span(
  span_id: string,
  parent_span_id: string | null,
  depth: number,
  name: string,
  offset_ms: number,
  duration_ms: number,
): Span {
  return {
    span_id,
    parent_span_id,
    depth,
    offset_ms,
    duration_ms,
    service_name: "cart",
    name,
    kind: "internal",
    is_error: false,
    status_message: null,
    start_time: offset_ms,
  };
}

function queries(parentId: string, count: number, durationMs: number) {
  return Array.from({ length: count }, (_, index) =>
    span(`${parentId}-q${index}`, parentId, 1, "SELECT", 10 + index, durationMs),
  );
}

function outline(rows: SpanDiff[]) {
  return rows.map(
    (row) =>
      `${"  ".repeat(row.depth)}${row.name} ${row.before?.duration_ms ?? "-"} → ${row.after?.duration_ms ?? "-"}`,
  );
}

test("pairs the spans at the same place in both traces", () => {
  const before = [
    span("a", null, 0, "GET /cart", 0, 100),
    span("a1", "a", 1, "GetCart", 10, 60),
    span("a2", "a", 1, "Render", 70, 20),
  ];
  const after = [
    span("b", null, 0, "GET /cart", 0, 300),
    span("b1", "b", 1, "GetCart", 10, 250),
    span("b2", "b", 1, "Render", 270, 20),
  ];

  expect(outline(diffSpans(before, after))).toEqual([
    "GET /cart 100 → 300",
    "  GetCart 60 → 250",
    "  Render 20 → 20",
  ]);
});

test("pairs repeated siblings in order and keeps the extra ones apart", () => {
  const before = [span("a", null, 0, "GET /cart", 0, 50), ...queries("a", 2, 5)];
  const after = [span("b", null, 0, "GET /cart", 0, 200), ...queries("b", 4, 5)];

  expect(outline(diffSpans(before, after))).toEqual([
    "GET /cart 50 → 200",
    "  SELECT 5 → 5",
    "  SELECT 5 → 5",
    "  SELECT - → 5",
    "  SELECT - → 5",
  ]);
});

test("adds or removes the whole subtree of a span only one trace has", () => {
  const before = [
    span("a", null, 0, "GET /cart", 0, 100),
    span("a1", "a", 1, "GetCart", 10, 60),
    span("a2", "a1", 2, "valkey", 20, 40),
  ];
  const after = [span("b", null, 0, "GET /cart", 0, 30)];

  expect(outline(diffSpans(before, after))).toEqual([
    "GET /cart 100 → 30",
    "  GetCart 60 → -",
    "    valkey 40 → -",
  ]);
});

test("pairs spans whose parent never arrived as roots", () => {
  const before = [span("a", null, 0, "GET /cart", 0, 100), span("o", "gone", 0, "consume", 120, 9)];
  const after = [span("b", null, 0, "GET /cart", 0, 100), span("p", "lost", 0, "consume", 110, 7)];

  expect(outline(diffSpans(before, after))).toEqual(["GET /cart 100 → 100", "consume 9 → 7"]);
});

test("keeps each row's ID when the traces swap sides", () => {
  const before = [span("a", null, 0, "GET /cart", 0, 50), ...queries("a", 1, 5)];
  const after = [span("b", null, 0, "GET /cart", 0, 200), ...queries("b", 3, 5)];

  const ids = diffSpans(before, after).map((row) => row.id);
  const swapped = diffSpans(after, before).map((row) => row.id);

  expect(swapped).toEqual(ids);
  expect(new Set(ids).size).toBe(ids.length);
});

test("counts a span as changed when only one trace has it or it moved by more than a tenth", () => {
  const [root, same, slower, added] = diffSpans(
    [
      span("a", null, 0, "GET /cart", 0, 100),
      span("a1", "a", 1, "GetCart", 0, 100),
      span("a2", "a", 1, "Render", 0, 100),
    ],
    [
      span("b", null, 0, "GET /cart", 0, 105),
      span("b1", "b", 1, "GetCart", 0, 105),
      span("b2", "b", 1, "Render", 1, 150),
      span("b3", "b", 1, "Log", 2, 1),
    ],
  );

  expect([root, same, slower, added].map((row) => row !== undefined && hasChanged(row))).toEqual([
    false,
    false,
    true,
    true,
  ]);
  expect(durationDelta(slower!)).toBe(50);
  expect(durationDelta(added!)).toBe(1);
});

test("sums each operation's spans in both traces, biggest change first", () => {
  const before = [span("a", null, 0, "GET /cart", 0, 50), ...queries("a", 2, 5)];
  const after = [span("b", null, 0, "GET /cart", 0, 60), ...queries("b", 40, 5)];

  expect(diffOperations(before, after)).toEqual([
    {
      id: JSON.stringify(["cart", "SELECT"]),
      serviceName: "cart",
      name: "SELECT",
      beforeCount: 2,
      afterCount: 40,
      beforeMs: 10,
      afterMs: 200,
    },
    {
      id: JSON.stringify(["cart", "GET /cart"]),
      serviceName: "cart",
      name: "GET /cart",
      beforeCount: 1,
      afterCount: 1,
      beforeMs: 50,
      afterMs: 60,
    },
  ]);
});
