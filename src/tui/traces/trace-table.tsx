import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

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
      ],
      bindings: [{ key: "return", cmd: "traces.open" }],
    }),
    [focused, selectedTrace, onOpen],
  );

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
