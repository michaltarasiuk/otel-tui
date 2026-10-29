import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { useListState } from "../use-list-state.ts";
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

  const list = useListState({
    items: spans,
    getKey: (span) => span.span_id,
  });

  const selectedSpan = list.selectedItem;
  const hasErrors = spans.some((span) => span.is_error);

  useBindings(
    () => ({
      enabled: focused && hasErrors,
      commands: [
        {
          name: "spans.next-error",
          desc: "next error",
          run() {
            list.selectNext((span) => span.is_error);
          },
        },
        {
          name: "spans.previous-error",
          run() {
            list.selectPrevious((span) => span.is_error);
          },
        },
      ],
      bindings: [
        { key: "e", cmd: "spans.next-error" },
        { key: "shift+e", cmd: "spans.previous-error" },
      ],
    }),
    [focused, hasErrors, list],
  );

  return (
    <box flexGrow={1}>
      <SpanHeaderRow traceDurationMs={traceDurationMs} />
      <WindowedRows state={list}>
        {(span, selected) => (
          <SpanRow span={span} traceDurationMs={traceDurationMs} selected={selected} />
        )}
      </WindowedRows>
      {selectedSpan !== undefined && <SpanPanel traceId={traceId} span={selectedSpan} />}
    </box>
  );
}
