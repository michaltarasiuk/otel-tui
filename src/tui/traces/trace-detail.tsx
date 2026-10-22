import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { formatDuration, shortId } from "../format.ts";
import { ScrollList } from "../list/scroll-list.tsx";
import {
  Cell,
  columnLayout,
  HeaderCell,
  TableHeader,
  TableRow,
  type Column,
} from "../list/table.tsx";
import { cursorBindings, useCursor } from "../list/use-cursor.ts";
import { useCopy } from "../status/use-copy.ts";
import { serviceColor, THEME } from "../theme.ts";
import { Breadcrumb } from "../ui/breadcrumb.tsx";

import { SpanDetails } from "./span-details.tsx";
import { summarizeTrace, type Trace, type TraceSummary } from "./trace.ts";
import { buildWaterfall, childrenByParent, type WaterfallRow } from "./waterfall.ts";

const COLUMNS = {
  name: { title: "SPAN", width: 36 },
  service: { title: "SERVICE", width: 16 },
  timeline: { title: "" },
  duration: { title: "DURATION", width: 8, align: "right" },
} as const satisfies Record<string, Column>;

interface TraceDetailProps {
  trace: Trace;
  onClose: () => void;
}

export function TraceDetail({ trace, onClose }: TraceDetailProps) {
  const copy = useCopy();
  const summary = summarizeTrace(trace);
  const children = childrenByParent(trace);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const rows = buildWaterfall(trace, children, collapsed);
  const cursor = useCursor(rows, (row) => row.span.spanId);
  // The waterfall always contains at least the root span.
  const selected = cursor.selected!;

  function setExpanded(spanId: string, expanded: boolean) {
    setCollapsed((c) => {
      const next = new Set(c);
      if (expanded) {
        next.delete(spanId);
      } else {
        next.add(spanId);
      }
      return next;
    });
  }

  function collapseOrSelectParent() {
    const { span, hasChildren } = selected;
    if (hasChildren && !collapsed.has(span.spanId)) {
      setExpanded(span.spanId, false);
    } else if (span.parentSpanId !== undefined) {
      cursor.select(span.parentSpanId);
    }
  }

  function toggle() {
    if (selected.hasChildren) {
      setExpanded(selected.span.spanId, collapsed.has(selected.span.spanId));
    }
  }

  // Handlers close over the current cursor and selection, so the layer is
  // rebuilt on every render.
  useBindings(
    () => ({
      bindings: [
        ...cursorBindings(cursor),
        { key: "left", cmd: () => collapseOrSelectParent(), desc: "collapse" },
        { key: "h", cmd: () => collapseOrSelectParent() },
        { key: "right", cmd: () => setExpanded(selected.span.spanId, true), desc: "expand" },
        { key: "l", cmd: () => setExpanded(selected.span.spanId, true) },
        { key: "space", cmd: () => toggle(), desc: "toggle" },
        { key: "return", cmd: () => toggle() },
        { key: "y", cmd: () => copy("span ID", selected.span.spanId), desc: "copy span id" },
        { key: "shift+y", cmd: () => copy("trace ID", trace.traceId), desc: "copy trace id" },
        { key: "escape", cmd: () => onClose(), desc: "back" },
        { key: "backspace", cmd: () => onClose() },
      ],
    }),
    [cursor, selected, collapsed, trace, copy, onClose],
  );

  return (
    <box flexGrow={1}>
      <Breadcrumb items={["Traces", shortId(trace.traceId), selected.span.name]} />
      <Headline summary={summary} />
      <box flexDirection="row" flexGrow={1} gap={1}>
        <box flexGrow={1}>
          <WaterfallHeader durationMs={summary.durationMs} />
          <ScrollList selectedId={rowId(selected.span.spanId)}>
            {rows.map((row) => (
              <WaterfallRowView
                key={row.span.spanId}
                row={row}
                durationMs={summary.durationMs}
                selected={row === selected}
              />
            ))}
          </ScrollList>
        </box>
        <SpanDetails span={selected.span} />
      </box>
    </box>
  );
}

interface HeadlineProps {
  summary: TraceSummary;
}

function Headline({ summary }: HeadlineProps) {
  const { rootName, service, durationMs, spanCount, startTime, errorCount } = summary;
  return (
    <text flexShrink={0} marginBottom={1} fg={THEME.textMuted} wrapMode="none" truncate>
      <b fg={THEME.text}>{rootName}</b>
      {" · "}
      <span fg={serviceColor(service)}>{service}</span>
      {` · ${formatDuration(durationMs)} · ${spanCount} spans · `}
      {new Date(startTime).toLocaleTimeString()}
      {errorCount > 0 ? (
        <span fg={THEME.error}>{` · ${errorCount} ${errorCount === 1 ? "error" : "errors"}`}</span>
      ) : null}
    </text>
  );
}

interface WaterfallHeaderProps {
  durationMs: number;
}

function WaterfallHeader({ durationMs }: WaterfallHeaderProps) {
  return (
    <TableHeader>
      <HeaderCell column={COLUMNS.name} />
      <HeaderCell column={COLUMNS.service} />
      <TimelineAxis durationMs={durationMs} />
      <HeaderCell column={COLUMNS.duration} />
    </TableHeader>
  );
}

interface TimelineAxisProps {
  durationMs: number;
}

// Equal thirds keep the middle tick centered whatever the label widths.
function TimelineAxis({ durationMs }: TimelineAxisProps) {
  return (
    <box {...columnLayout(COLUMNS.timeline)} flexDirection="row">
      <text flexGrow={1} flexBasis={0} fg={THEME.textMuted}>
        0
      </text>
      <text flexGrow={1} flexBasis={0} fg={THEME.textMuted} textAlign="center">
        {formatDuration(durationMs / 2)}
      </text>
      <text flexGrow={1} flexBasis={0} fg={THEME.textMuted} textAlign="right">
        {formatDuration(durationMs)}
      </text>
    </box>
  );
}

interface WaterfallRowViewProps {
  row: WaterfallRow;
  durationMs: number;
  selected: boolean;
}

function WaterfallRowView({ row, durationMs, selected }: WaterfallRowViewProps) {
  const { span, prefix, hiddenCount } = row;
  const failed = span.status.code === "error";
  const color = serviceColor(span.service);
  const scale = durationMs > 0 ? 100 / durationMs : 0;
  const left = span.offsetMs * scale;
  const width = span.durationMs * scale;

  return (
    <TableRow id={rowId(span.spanId)} selected={selected}>
      <Cell column={COLUMNS.name}>
        <span fg={THEME.textMuted}>{prefix}</span>
        <span fg={failed ? THEME.error : THEME.text}>
          {failed ? "✕ " : null}
          {span.name}
        </span>
        {hiddenCount > 0 ? <span fg={THEME.textMuted}>{` ▸ +${hiddenCount}`}</span> : null}
      </Cell>
      <Cell column={COLUMNS.service} fg={color}>
        {span.service}
      </Cell>
      <box {...columnLayout(COLUMNS.timeline)} height={1} overflow="hidden">
        <box
          position="absolute"
          left={`${left}%` as const}
          width={`${width}%` as const}
          minWidth={1}
          height={1}
          backgroundColor={failed ? THEME.error : color}
        />
      </box>
      <Cell column={COLUMNS.duration}>{formatDuration(span.durationMs)}</Cell>
    </TableRow>
  );
}

function rowId(spanId: string) {
  return `span-${spanId}`;
}
