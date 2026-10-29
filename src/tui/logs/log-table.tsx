import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { useListState } from "../use-list-state.ts";
import { WindowedRows } from "../windowed-rows.tsx";
import { LogPanel } from "./log-panel.tsx";
import { LogHeaderRow, LogRow } from "./log-row.tsx";
import type { Log } from "./log.ts";
import { isErrorLevel } from "./severity.ts";

interface LogTableProps {
  logs: Log[];
  onToggleTrace: (traceId: string) => void;
  onOpenTrace: (traceId: string) => void;
}

export function LogTable({ logs, onToggleTrace, onOpenTrace }: LogTableProps) {
  const focused = useFocused();

  const list = useListState({
    items: logs,
    getKey: (log) => log.log_id,
  });

  const selectedLog = list.selectedItem;
  const selectedTraceId = selectedLog?.trace_id ?? null;
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
              onOpenTrace(selectedTraceId);
            }
          },
        },
        {
          name: "logs.toggle-trace",
          desc: "trace",
          enabled: selectedTraceId !== null,
          run() {
            if (selectedTraceId !== null) {
              onToggleTrace(selectedTraceId);
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
    [focused, hasErrors, list, selectedTraceId, onToggleTrace, onOpenTrace],
  );

  return (
    <box flexGrow={1}>
      <LogHeaderRow />
      <WindowedRows state={list}>
        {(log, selected) => <LogRow log={log} selected={selected} />}
      </WindowedRows>
      {selectedLog !== undefined && <LogPanel log={selectedLog} />}
    </box>
  );
}
