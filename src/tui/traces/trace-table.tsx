import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { useListState } from "../use-list-state.ts";
import { WindowedRows } from "../windowed-rows.tsx";
import { TraceHeaderRow, TraceRow } from "./trace-row.tsx";
import type { Trace, TraceSort } from "./trace.ts";

interface TraceTableProps {
  traces: Trace[];
  sort: TraceSort;
  onOpen: (traceId: string) => void;
}

export function TraceTable({ traces, sort, onOpen }: TraceTableProps) {
  const focused = useFocused();

  const list = useListState({
    items: traces,
    getKey: (trace) => trace.trace_id,
  });

  const selectedTrace = list.selectedItem;
  const hasErrors = traces.some((trace) => trace.error_count > 0);

  useBindings(
    () => ({
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "traces.open",
          desc: "open",
          run() {
            if (selectedTrace !== undefined) {
              onOpen(selectedTrace.trace_id);
            }
          },
        },
        {
          name: "traces.next-error",
          desc: "next error",
          enabled: hasErrors,
          run() {
            list.selectNext((trace) => trace.error_count > 0);
          },
        },
        {
          name: "traces.previous-error",
          enabled: hasErrors,
          run() {
            list.selectPrevious((trace) => trace.error_count > 0);
          },
        },
      ],
      bindings: [
        { key: "return", cmd: "traces.open" },
        { key: "e", cmd: "traces.next-error" },
        { key: "shift+e", cmd: "traces.previous-error" },
      ],
    }),
    [focused, hasErrors, list, selectedTrace, onOpen],
  );

  return (
    <box flexGrow={1}>
      <TraceHeaderRow sort={sort} />
      <WindowedRows state={list}>
        {(trace, selected) => <TraceRow trace={trace} selected={selected} />}
      </WindowedRows>
    </box>
  );
}
