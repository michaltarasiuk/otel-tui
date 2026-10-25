import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { wrapIndex } from "../../utils/wrap-index.ts";
import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
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

  const [selectedTraceId, setSelectedTraceId] = useState<string>();

  const selectedIndex = Math.max(
    0,
    traces.findIndex((trace) => trace.trace_id === selectedTraceId),
  );
  const selectedTrace = traces[selectedIndex];
  const hasErrors = traces.some((trace) => trace.error_count > 0);

  useBindings(() => {
    function selectErrorFrom(index: number, step: 1 | -1) {
      for (let distance = 1; distance < traces.length; distance++) {
        const candidate = traces[wrapIndex(index + step * distance, traces.length)];
        if (candidate !== undefined && candidate.error_count > 0) {
          setSelectedTraceId(candidate.trace_id);
          return;
        }
      }
    }

    return {
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
            selectErrorFrom(selectedIndex, 1);
          },
        },
        {
          name: "traces.previous-error",
          enabled: hasErrors,
          run() {
            selectErrorFrom(selectedIndex, -1);
          },
        },
      ],
      bindings: [
        { key: "return", cmd: "traces.open" },
        { key: "e", cmd: "traces.next-error" },
        { key: "shift+e", cmd: "traces.previous-error" },
      ],
    };
  }, [focused, traces, hasErrors, selectedIndex, selectedTrace, onOpen]);

  return (
    <box flexGrow={1}>
      <TraceHeaderRow sort={sort} />
      <WindowedRows
        rows={traces}
        selectedIndex={selectedIndex}
        getKey={(trace) => trace.trace_id}
        renderRow={(trace, selected) => <TraceRow trace={trace} selected={selected} />}
        onSelect={(index) => setSelectedTraceId(traces[index]?.trace_id)}
      />
    </box>
  );
}
