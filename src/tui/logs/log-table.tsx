import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "#tui/components/focus.tsx";
import { FIRST_HINT_PRIORITY } from "#tui/components/key-hints.tsx";
import { useListState } from "#tui/components/use-list-state.ts";
import { WindowedRows } from "#tui/components/windowed-rows.tsx";
import { useNavigation } from "#tui/navigation.tsx";

import { LogPanel } from "./log-panel.tsx";
import { LogHeaderRow, LogRow } from "./log-row.tsx";
import type { Log } from "./log.ts";
import { isErrorLevel } from "./severity.ts";

interface LogTableProps {
  logs: Log[];
}

export function LogTable({ logs }: LogTableProps) {
  const focused = useFocused();
  const { logsTraceId, setLogsTraceId, openTrace } = useNavigation();

  const list = useListState({
    items: logs,
    getKey: (log) => log.log_id,
  });

  const selectedLog = list.selectedItem;
  const selectedTraceId = selectedLog?.trace_id ?? null;
  const selectedSpanId = selectedLog?.span_id ?? undefined;
  const hasErrors = logs.some((log) => isErrorLevel(log.severity));

  useBindings(
    () => ({
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "logs.next-error",
          desc: "next error",
          enabled: hasErrors,
          run() {
            list.selectNext((log) => isErrorLevel(log.severity));
          },
        },
        {
          name: "logs.previous-error",
          enabled: hasErrors,
          run() {
            list.selectPrevious((log) => isErrorLevel(log.severity));
          },
        },
        {
          name: "logs.open-trace",
          desc: "open trace",
          enabled: selectedTraceId !== null,
          run() {
            if (selectedTraceId !== null) {
              openTrace(selectedTraceId, selectedSpanId);
            }
          },
        },
        {
          name: "logs.toggle-trace",
          desc: "trace",
          enabled: selectedTraceId !== null,
          run() {
            if (selectedTraceId !== null) {
              setLogsTraceId(logsTraceId === selectedTraceId ? undefined : selectedTraceId);
            }
          },
        },
      ],
      bindings: [
        { key: "e", cmd: "logs.next-error" },
        { key: "shift+e", cmd: "logs.previous-error" },
        { key: "return", cmd: "logs.open-trace" },
        { key: "t", cmd: "logs.toggle-trace" },
      ],
    }),
    [
      focused,
      hasErrors,
      list,
      selectedTraceId,
      selectedSpanId,
      logsTraceId,
      setLogsTraceId,
      openTrace,
    ],
  );

  return (
    <box flexGrow={1}>
      <LogHeaderRow />
      <WindowedRows list={list}>
        {(log, selected) => <LogRow log={log} selected={selected} />}
      </WindowedRows>
      {selectedLog !== undefined && <LogPanel log={selectedLog} />}
    </box>
  );
}
