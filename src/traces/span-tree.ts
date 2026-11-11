import type { Span } from "./span.ts";

function spanEnd(span: Span) {
  return span.offset_ms + span.duration_ms;
}

export function descendantCount(spans: Span[], index: number) {
  const depth = spans[index]?.depth ?? 0;
  let count = 0;
  for (const span of spans.slice(index + 1)) {
    if (span.depth <= depth) {
      break;
    }
    count++;
  }
  return count;
}

export function hiddenCounts(spans: Span[], collapsed: ReadonlySet<string>) {
  const counts = new Map<string, number>();
  for (const [index, span] of spans.entries()) {
    if (collapsed.has(span.span_id)) {
      counts.set(span.span_id, descendantCount(spans, index));
    }
  }
  return counts;
}

export function visibleSpans(spans: Span[], collapsed: ReadonlySet<string>) {
  const visible: Span[] = [];
  let hiddenBelowDepth: number | undefined;
  for (const span of spans) {
    if (hiddenBelowDepth !== undefined && span.depth > hiddenBelowDepth) {
      continue;
    }
    hiddenBelowDepth = collapsed.has(span.span_id) ? span.depth : undefined;
    visible.push(span);
  }
  return visible;
}

export function ancestorIds(spans: Span[], spanId: string) {
  const byId = new Map(spans.map((span) => [span.span_id, span]));
  const ancestors: string[] = [];
  let parentId = byId.get(spanId)?.parent_span_id ?? null;
  while (parentId !== null && byId.has(parentId)) {
    ancestors.push(parentId);
    parentId = byId.get(parentId)?.parent_span_id ?? null;
  }
  return ancestors;
}

export function criticalPath(spans: Span[]) {
  const children = Map.groupBy(spans, (span) => span.parent_span_id);

  const path = new Set<string>();

  function walk(span: Span, endLimit: number) {
    path.add(span.span_id);
    let cursor = Math.min(spanEnd(span), endLimit);
    const latestFirst = (children.get(span.span_id) ?? []).toSorted(
      (a, b) => spanEnd(b) - spanEnd(a),
    );
    for (const child of latestFirst) {
      if (child.offset_ms < cursor) {
        walk(child, cursor);
        cursor = child.offset_ms;
      }
    }
  }

  const [root] = spans;
  if (root !== undefined) {
    walk(root, spanEnd(root));
  }
  return path;
}
