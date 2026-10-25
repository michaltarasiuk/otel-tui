import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { wrapIndex } from "../../utils/wrap-index.ts";
import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
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

  const [selectedLogId, setSelectedLogId] = useState<string>();

  const selectedIndex = Math.max(
    0,
    logs.findIndex((log) => log.log_id === selectedLogId),
  );
  const selectedLog = logs[selectedIndex];
  const selectedTraceId = selectedLog?.trace_id ?? null;
  const hasErrors = logs.some((log) => isErrorLevel(log.severity));

  useBindings(() => {
    function selectErrorFrom(index: number, step: 1 | -1) {
      for (let distance = 1; distance < logs.length; distance++) {
        const candidate = logs[wrapIndex(index + step * distance, logs.length)];
        if (candidate !== undefined && isErrorLevel(candidate.severity)) {
          setSelectedLogId(candidate.log_id);
          return;
        }
      }
    }

    return {
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "logs.next-error",
          desc: "next error",
          enabled: hasErrors,
          run() {
            selectErrorFrom(selectedIndex, 1);
          },
        },
        {
          name: "logs.previous-error",
          enabled: hasErrors,
          run() {
            selectErrorFrom(selectedIndex, -1);
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
    };
  }, [focused, hasErrors, logs, selectedIndex, selectedTraceId, onToggleTrace, onOpenTrace]);

  return (
    <box flexGrow={1}>
      <LogHeaderRow />
      <WindowedRows
        rows={logs}
        selectedIndex={selectedIndex}
        getKey={(log) => log.log_id}
        renderRow={(log, selected) => <LogRow log={log} selected={selected} />}
        onSelect={(index) => setSelectedLogId(logs[index]?.log_id)}
      />
      {selectedLog !== undefined && <LogPanel log={selectedLog} />}
    </box>
  );
}
