import { rootSpans, type Span, type Trace } from "./trace.ts";

export interface WaterfallRow {
  span: Span;
  // Tree guides drawn before the span name, such as "│  └─ ".
  prefix: string;
  hasChildren: boolean;
  hiddenCount: number;
}

export function childrenByParent(trace: Trace) {
  const children = new Map<string, Span[]>();
  for (const span of trace.spans) {
    if (span.parentSpanId === undefined) continue;
    const siblings = children.get(span.parentSpanId) ?? [];
    siblings.push(span);
    children.set(span.parentSpanId, siblings);
  }
  for (const [parentId, siblings] of children) {
    children.set(
      parentId,
      siblings.toSorted((a, b) => a.offsetMs - b.offsetMs),
    );
  }
  return children;
}

export function buildWaterfall(
  trace: Trace,
  children: Map<string, Span[]>,
  collapsed: ReadonlySet<string>,
) {
  const rows: WaterfallRow[] = [];

  function countDescendants(span: Span): number {
    const kids = children.get(span.spanId) ?? [];
    return kids.reduce((count, kid) => count + 1 + countDescendants(kid), 0);
  }

  function visit(span: Span, prefix: string, indent: string) {
    const kids = children.get(span.spanId) ?? [];
    const isCollapsed = collapsed.has(span.spanId);
    rows.push({
      span,
      prefix,
      hasChildren: kids.length > 0,
      hiddenCount: isCollapsed ? countDescendants(span) : 0,
    });
    if (isCollapsed) return;
    kids.forEach((kid, index) => {
      const last = index === kids.length - 1;
      visit(kid, indent + (last ? "└─ " : "├─ "), indent + (last ? "   " : "│  "));
    });
  }

  for (const root of rootSpans(trace)) {
    visit(root, "", "");
  }
  return rows;
}
