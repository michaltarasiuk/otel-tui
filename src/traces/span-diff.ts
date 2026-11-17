import { selfTimes } from "./span-tree.ts";
import type { Span } from "./span.ts";

const CHANGE_RATIO = 0.1;

export interface SpanDiff {
  id: string;
  depth: number;
  serviceName: string | null;
  name: string;
  before: Span | undefined;
  after: Span | undefined;
  beforeSelfMs: number;
  afterSelfMs: number;
}

export interface OperationDiff {
  id: string;
  serviceName: string | null;
  name: string;
  beforeCount: number;
  afterCount: number;
  beforeMs: number;
  afterMs: number;
}

function operationKey(span: Span) {
  return JSON.stringify([span.service_name, span.name]);
}

function isRoot(span: Span) {
  return span.depth === 0;
}

function childrenById(spans: Span[]) {
  return Map.groupBy(
    spans.filter((span) => !isRoot(span)),
    (span) => span.parent_span_id,
  );
}

function childrenOf(children: Map<string | null, Span[]>, parent: Span | undefined) {
  return parent === undefined ? [] : (children.get(parent.span_id) ?? []);
}

function byDiffId(siblings: Span[], parentId: string) {
  const seen = new Map<string, number>();
  return new Map(
    siblings.map((span) => {
      const key = operationKey(span);
      const ordinal = seen.get(key) ?? 0;
      seen.set(key, ordinal + 1);
      return [`${parentId}/${key}#${ordinal}`, span];
    }),
  );
}

function selfTime(self: Map<string, number>, span: Span | undefined) {
  return span === undefined ? 0 : (self.get(span.span_id) ?? 0);
}

function startOffset({ before, after }: SpanDiff) {
  return (after ?? before)?.offset_ms ?? 0;
}

export function diffSpans(before: Span[], after: Span[]) {
  const beforeSelf = selfTimes(before);
  const afterSelf = selfTimes(after);
  const beforeChildren = childrenById(before);
  const afterChildren = childrenById(after);
  const rows: SpanDiff[] = [];

  function walk(beforeSpans: Span[], afterSpans: Span[], parentId: string, depth: number) {
    const beforeById = byDiffId(beforeSpans, parentId);
    const afterById = byDiffId(afterSpans, parentId);
    const siblings = [...new Set([...afterById.keys(), ...beforeById.keys()])].map(
      (id): SpanDiff => {
        const beforeSpan = beforeById.get(id);
        const afterSpan = afterById.get(id);
        const { service_name: serviceName, name } = (afterSpan ?? beforeSpan)!;
        return {
          id,
          depth,
          serviceName,
          name,
          before: beforeSpan,
          after: afterSpan,
          beforeSelfMs: selfTime(beforeSelf, beforeSpan),
          afterSelfMs: selfTime(afterSelf, afterSpan),
        };
      },
    );
    for (const row of siblings.toSorted((a, b) => startOffset(a) - startOffset(b))) {
      rows.push(row);
      walk(
        childrenOf(beforeChildren, row.before),
        childrenOf(afterChildren, row.after),
        row.id,
        depth + 1,
      );
    }
  }

  const beforeRoots = before.filter((span) => isRoot(span));
  const afterRoots = after.filter((span) => isRoot(span));
  walk(beforeRoots, afterRoots, "", 0);
  return rows;
}

export function selfDelta({ beforeSelfMs, afterSelfMs }: SpanDiff) {
  return afterSelfMs - beforeSelfMs;
}

export function isAddedOrRemoved({ before, after }: SpanDiff) {
  return before === undefined || after === undefined;
}

export function hasChanged(row: SpanDiff) {
  const longer = Math.max(row.beforeSelfMs, row.afterSelfMs);
  return isAddedOrRemoved(row) || Math.abs(selfDelta(row)) > longer * CHANGE_RATIO;
}

export function operationDelta({ beforeMs, afterMs }: OperationDiff) {
  return afterMs - beforeMs;
}

export function diffOperations(before: Span[], after: Span[]) {
  const self = { before: selfTimes(before), after: selfTimes(after) };
  const operations = new Map<string, OperationDiff>();

  function add(span: Span, side: "before" | "after") {
    const id = operationKey(span);
    const operation = operations.get(id) ?? {
      id,
      serviceName: span.service_name,
      name: span.name,
      beforeCount: 0,
      afterCount: 0,
      beforeMs: 0,
      afterMs: 0,
    };
    operation[`${side}Count`]++;
    operation[`${side}Ms`] += selfTime(self[side], span);
    operations.set(id, operation);
  }

  for (const span of before) {
    add(span, "before");
  }
  for (const span of after) {
    add(span, "after");
  }
  return [...operations.values()].toSorted(
    (a, b) => Math.abs(operationDelta(b)) - Math.abs(operationDelta(a)),
  );
}
