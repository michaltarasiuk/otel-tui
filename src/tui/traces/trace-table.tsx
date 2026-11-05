import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../components/focus.tsx";
import { FIRST_HINT_PRIORITY } from "../components/key-hints.tsx";
import { useListState } from "../components/use-list-state.ts";
import { WindowedRows } from "../components/windowed-rows.tsx";
import { useNavigation } from "../navigation.tsx";
import { TraceHeaderRow, TraceRow } from "./trace-row.tsx";
import type { Trace, TraceSort } from "./trace.ts";

interface TraceTableProps {
  traces: Trace[];
  sort: TraceSort;
}

export function TraceTable({ traces, sort }: TraceTableProps) {
  const focused = useFocused();
  const { openTrace } = useNavigation();

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
              openTrace(selectedTrace.trace_id);
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
    [focused, hasErrors, list, selectedTrace, openTrace],
  );

  return (
    <box flexGrow={1}>
      <TraceHeaderRow sort={sort} />
      <WindowedRows list={list}>
        {(trace, selected) => <TraceRow trace={trace} selected={selected} />}
      </WindowedRows>
    </box>
  );
}
