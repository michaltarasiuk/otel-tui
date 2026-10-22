import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { formatAge, formatDuration, shortId } from "../format.ts";
import { ScrollList } from "../list/scroll-list.tsx";
import { Cell, HeaderCell, TableHeader, TableRow, type Column } from "../list/table.tsx";
import { cursorBindings, useCursor } from "../list/use-cursor.ts";
import { useCopy } from "../status/use-copy.ts";
import { serviceColor, THEME } from "../theme.ts";
import { Breadcrumb } from "../ui/breadcrumb.tsx";
import { Placeholder } from "../ui/placeholder.tsx";

import { useTraceStore } from "./store/store.tsx";
import type { TraceSummary } from "./trace.ts";
import { useNow } from "./use-now.ts";

const SORTS = ["newest", "slowest", "errors"] as const;

type TraceSort = (typeof SORTS)[number];

interface TraceQuery {
  filter: string;
  errorsOnly: boolean;
  sort: TraceSort;
}

// Widths are fixed rather than fitted to the visible traces, so columns stay
// put as traces arrive or the filter changes; long services are truncated.
const COLUMNS = {
  status: { title: "", width: 1 },
  traceId: { title: "TRACE", width: 9 },
  age: { title: "AGE", width: 4, align: "right" },
  service: { title: "SERVICE", width: 20 },
  duration: { title: "DURATION", width: 8, align: "right" },
  spans: { title: "SPANS", width: 5, align: "right" },
  rootName: { title: "ROOT SPAN" },
} as const satisfies Record<string, Column>;

const AGE_REFRESH_MS = 1000;
const SLOW_MS = 300;
const VERY_SLOW_MS = 1000;

interface TraceListProps {
  onOpen: (traceId: string) => void;
}

export function TraceList({ onOpen }: TraceListProps) {
  const { summaries } = useTraceStore();
  const copy = useCopy();
  const now = useNow(AGE_REFRESH_MS);
  const [sort, setSort] = useState<TraceSort>("newest");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [filter, setFilter] = useState("");
  const [editingFilter, setEditingFilter] = useState(false);

  const query = { filter, errorsOnly, sort };
  const visible = queryTraces(summaries, query);
  const cursor = useCursor(visible, (summary) => summary.traceId);
  const { selected } = cursor;

  // Handlers close over the current cursor and selection, so the layer is
  // rebuilt on every render.
  useBindings(
    () => ({
      enabled: !editingFilter,
      bindings: [
        ...cursorBindings(cursor),
        {
          key: "return",
          cmd: () => {
            if (selected !== undefined) onOpen(selected.traceId);
          },
          desc: "open",
        },
        { key: "/", cmd: () => setEditingFilter(true), desc: "filter" },
        { key: "s", cmd: () => setSort((s) => nextSort(s)), desc: "sort" },
        { key: "e", cmd: () => setErrorsOnly((eo) => !eo), desc: "errors only" },
        {
          key: "y",
          cmd: () => {
            if (selected !== undefined) copy("trace ID", selected.traceId);
          },
          desc: "copy id",
        },
        { key: "escape", cmd: () => setFilter("") },
      ],
    }),
    [editingFilter, cursor, selected, onOpen, copy],
  );

  return (
    <box flexGrow={1}>
      <box flexDirection="row" height={1} flexShrink={0} marginBottom={1}>
        <Breadcrumb items={["Traces"]} />
        {editingFilter ? (
          <FilterInput
            initialValue={filter}
            onChange={(filter) => setFilter(filter)}
            onClose={() => setEditingFilter(false)}
          />
        ) : (
          <QueryStatus
            query={query}
            shown={visible.length}
            total={summaries.length}
            following={cursor.following}
          />
        )}
      </box>
      <TraceListHeader />
      {visible.length > 0 ? (
        <ScrollList selectedId={selected === undefined ? undefined : rowId(selected.traceId)}>
          {visible.map((summary) => (
            <TraceRow
              key={summary.traceId}
              summary={summary}
              age={formatAge(now - summary.startTime)}
              selected={summary === selected}
            />
          ))}
        </ScrollList>
      ) : (
        <EmptyState hasTraces={summaries.length > 0} />
      )}
    </box>
  );
}

interface QueryStatusProps {
  query: TraceQuery;
  shown: number;
  total: number;
  following: boolean;
}

function QueryStatus({ query, shown, total, following }: QueryStatusProps) {
  return (
    <text fg={THEME.textMuted} wrapMode="none" truncate flexGrow={1}>
      {` ${shown} of ${total} · sort: `}
      <span fg={THEME.text}>{query.sort}</span>
      {query.errorsOnly ? <span fg={THEME.error}> · errors only</span> : null}
      {following ? " · following newest" : null}
      {query.filter ? <span fg={THEME.text}>{` · /${query.filter}`}</span> : null}
    </text>
  );
}

interface FilterInputProps {
  initialValue: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function FilterInput({ initialValue, onChange, onClose }: FilterInputProps) {
  // Passing a changing value would reset the input's own cursor on every keystroke.
  const [value] = useState(initialValue);

  useBindings(
    () => ({
      bindings: [
        { key: "return", cmd: () => onClose(), desc: "apply" },
        {
          key: "escape",
          cmd: () => {
            onChange("");
            onClose();
          },
          desc: "clear",
        },
      ],
    }),
    [onChange, onClose],
  );

  return (
    <box flexDirection="row" flexGrow={1}>
      <text fg={THEME.text}> /</text>
      <input
        focused
        flexGrow={1}
        value={value}
        placeholder="service or span name"
        onInput={(value) => onChange(value)}
      />
    </box>
  );
}

function TraceListHeader() {
  return (
    <TableHeader>
      <HeaderCell column={COLUMNS.status} />
      <HeaderCell column={COLUMNS.traceId} />
      <HeaderCell column={COLUMNS.age} />
      <HeaderCell column={COLUMNS.service} />
      <HeaderCell column={COLUMNS.duration} />
      <HeaderCell column={COLUMNS.spans} />
      <HeaderCell column={COLUMNS.rootName} />
    </TableHeader>
  );
}

interface TraceRowProps {
  summary: TraceSummary;
  age: string;
  selected: boolean;
}

function TraceRow({ summary, age, selected }: TraceRowProps) {
  const failed = summary.errorCount > 0;
  return (
    <TableRow id={rowId(summary.traceId)} selected={selected}>
      <Cell column={COLUMNS.status} fg={failed ? THEME.error : THEME.success}>
        {failed ? "✕" : "●"}
      </Cell>
      <Cell column={COLUMNS.traceId} fg={THEME.textMuted}>
        {shortId(summary.traceId)}
      </Cell>
      <Cell column={COLUMNS.age} fg={THEME.textMuted}>
        {age}
      </Cell>
      <Cell column={COLUMNS.service} fg={serviceColor(summary.service)}>
        {summary.service}
      </Cell>
      <Cell column={COLUMNS.duration} fg={durationColor(summary.durationMs)}>
        {formatDuration(summary.durationMs)}
      </Cell>
      <Cell column={COLUMNS.spans}>{String(summary.spanCount)}</Cell>
      <Cell column={COLUMNS.rootName}>{summary.rootName}</Cell>
    </TableRow>
  );
}

interface EmptyStateProps {
  hasTraces: boolean;
}

function EmptyState({ hasTraces }: EmptyStateProps) {
  if (hasTraces) {
    return (
      <Placeholder>
        <text fg={THEME.textMuted}>No traces match the current filter</text>
      </Placeholder>
    );
  }
  return (
    <Placeholder>
      <text fg={THEME.textMuted}>Waiting for traces...</text>
    </Placeholder>
  );
}

function queryTraces(summaries: readonly TraceSummary[], { filter, errorsOnly, sort }: TraceQuery) {
  const needle = filter.toLowerCase();
  const matches = summaries.filter(
    (summary) =>
      (!errorsOnly || summary.errorCount > 0) &&
      (summary.service.toLowerCase().includes(needle) ||
        summary.rootName.toLowerCase().includes(needle)),
  );
  switch (sort) {
    case "newest":
      return matches.toSorted((a, b) => b.startTime - a.startTime);
    case "slowest":
      return matches.toSorted((a, b) => b.durationMs - a.durationMs);
    case "errors":
      return matches.toSorted((a, b) => b.errorCount - a.errorCount || b.startTime - a.startTime);
    default:
      sort satisfies never;
      throw new Error(`Unknown sort: ${String(sort)}`);
  }
}

function nextSort(sort: TraceSort) {
  return SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]!;
}

function durationColor(ms: number) {
  if (ms >= VERY_SLOW_MS) return THEME.error;
  if (ms >= SLOW_MS) return THEME.warning;
  return THEME.text;
}

function rowId(traceId: string) {
  return `trace-${traceId}`;
}
