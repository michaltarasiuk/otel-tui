import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef, useState } from "react";

import { clamp } from "../../utils/clamp.ts";
import { useFocused } from "../focus.tsx";
import { ScrollIndicator } from "../scroll-indicator.tsx";
import { TraceHeaderRow, TraceRow } from "./trace-row.tsx";
import type { Trace, TraceSort } from "./trace.ts";

const IGNORE_CONTENT_HEIGHT = 0;

interface TraceTableProps {
  traces: Trace[];
  sort: TraceSort;
}

export function TraceTable({ traces, sort }: TraceTableProps) {
  const focused = useFocused();
  const [selectedTraceId, setSelectedTraceId] = useState<string>();
  const [visibleRowCount, setVisibleRowCount] = useState(0);
  const rowsRef = useRef<BoxRenderable>(null);

  const selectedIndex = Math.max(
    0,
    traces.findIndex((trace) => trace.trace_id === selectedTraceId),
  );
  const firstVisibleIndex = clamp(
    selectedIndex - Math.floor(visibleRowCount / 2),
    0,
    Math.max(0, traces.length - visibleRowCount),
  );

  useBindings(() => {
    function selectTraceAt(index: number) {
      const trace = traces[clamp(index, 0, traces.length - 1)];
      if (trace !== undefined) {
        setSelectedTraceId(trace.trace_id);
      }
    }

    return {
      enabled: focused,
      commands: [
        {
          name: "traces.next",
          run() {
            selectTraceAt(selectedIndex + 1);
          },
        },
        {
          name: "traces.previous",
          run() {
            selectTraceAt(selectedIndex - 1);
          },
        },
        {
          name: "traces.next-page",
          run() {
            selectTraceAt(selectedIndex + visibleRowCount);
          },
        },
        {
          name: "traces.previous-page",
          run() {
            selectTraceAt(selectedIndex - visibleRowCount);
          },
        },
        {
          name: "traces.first",
          run() {
            selectTraceAt(0);
          },
        },
        {
          name: "traces.last",
          run() {
            selectTraceAt(traces.length - 1);
          },
        },
      ],
      bindings: [
        { key: "down", cmd: "traces.next" },
        { key: "j", cmd: "traces.next" },
        { key: "up", cmd: "traces.previous" },
        { key: "k", cmd: "traces.previous" },
        { key: "pagedown", cmd: "traces.next-page" },
        { key: "pageup", cmd: "traces.previous-page" },
        { key: "home", cmd: "traces.first" },
        { key: "end", cmd: "traces.last" },
      ],
    };
  }, [focused, traces, selectedIndex, visibleRowCount]);

  return (
    <box flexGrow={1}>
      <TraceHeaderRow sort={sort} />
      <box
        ref={rowsRef}
        flexGrow={1}
        flexBasis={IGNORE_CONTENT_HEIGHT}
        overflow="hidden"
        onSizeChange={() => setVisibleRowCount(rowsRef.current?.height ?? 0)}
      >
        {traces.slice(firstVisibleIndex, firstVisibleIndex + visibleRowCount).map((trace) => (
          <TraceRow key={trace.trace_id} trace={trace} selected={trace === traces[selectedIndex]} />
        ))}
        <ScrollIndicator
          firstVisibleIndex={firstVisibleIndex}
          visibleRowCount={visibleRowCount}
          rowCount={traces.length}
        />
      </box>
    </box>
  );
}
