import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { wrapIndex } from "../../utils/wrap-index.ts";
import { useFocused } from "../focus.tsx";
import { WindowedRows } from "../windowed-rows.tsx";
import { SpanPanel } from "./span-panel.tsx";
import { SpanHeaderRow, SpanRow } from "./span-row.tsx";
import type { Span } from "./span.ts";

interface SpanTableProps {
  traceId: string;
  spans: Span[];
  traceDurationMs: number;
}

export function SpanTable({ traceId, spans, traceDurationMs }: SpanTableProps) {
  const focused = useFocused();

  const [selectedSpanId, setSelectedSpanId] = useState<string>();

  const selectedIndex = Math.max(
    0,
    spans.findIndex((span) => span.span_id === selectedSpanId),
  );
  const selectedSpan = spans[selectedIndex];
  const hasErrors = spans.some((span) => span.is_error);

  useBindings(() => {
    function selectErrorFrom(index: number, step: 1 | -1) {
      for (let distance = 1; distance < spans.length; distance++) {
        const candidate = spans[wrapIndex(index + step * distance, spans.length)];
        if (candidate?.is_error === true) {
          setSelectedSpanId(candidate.span_id);
          return;
        }
      }
    }

    return {
      enabled: focused && hasErrors,
      commands: [
        {
          name: "spans.next-error",
          desc: "next error",
          run() {
            selectErrorFrom(selectedIndex, 1);
          },
        },
        {
          name: "spans.previous-error",
          run() {
            selectErrorFrom(selectedIndex, -1);
          },
        },
      ],
      bindings: [
        { key: "e", cmd: "spans.next-error" },
        { key: "shift+e", cmd: "spans.previous-error" },
      ],
    };
  }, [focused, hasErrors, spans, selectedIndex]);

  return (
    <box flexGrow={1}>
      <SpanHeaderRow traceDurationMs={traceDurationMs} />
      <WindowedRows
        rows={spans}
        selectedIndex={selectedIndex}
        getKey={(span) => span.span_id}
        renderRow={(span, selected) => (
          <SpanRow span={span} traceDurationMs={traceDurationMs} selected={selected} />
        )}
        onSelect={(index) => setSelectedSpanId(spans[index]?.span_id)}
      />
      {selectedSpan !== undefined && <SpanPanel traceId={traceId} span={selectedSpan} />}
    </box>
  );
}
