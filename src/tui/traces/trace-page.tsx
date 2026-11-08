import type { ScrollBoxRenderable } from "@opentui/core";
import { useRef } from "react";

import { CopyKey } from "#tui/clipboard.tsx";
import { Key, KeyHints, StepKeys } from "#tui/components/key-hints.tsx";
import { Placeholder } from "#tui/components/placeholder.tsx";
import { ScrollKeys } from "#tui/components/scroll-box.tsx";
import { Split } from "#tui/components/split.tsx";
import { useSelection } from "#tui/components/use-selection.ts";
import { PauseKey } from "#tui/pause.tsx";
import { findNextIndex } from "#utils/find-next-index.ts";

import { SpanDetails } from "./span-details.tsx";
import { SpanWaterfall } from "./span-waterfall.tsx";
import type { Span } from "./span.ts";
import { TraceHeader } from "./trace-header.tsx";
import { useTraceSpans } from "./trace-queries.ts";

function traceDuration(spans: Span[]) {
  return spans.reduce((end, span) => Math.max(end, span.offset_ms + span.duration_ms), 0);
}

interface TracePageProps {
  traceId: string;
  spanId: string | undefined;
  onBack: () => void;
  onOpenLogs: (spanId?: string) => void;
}

export function TracePage({ traceId, spanId, onBack, onOpenLogs }: TracePageProps) {
  const traceSpans = useTraceSpans(traceId);
  const detailsRef = useRef<ScrollBoxRenderable>(null);

  const { data: spans = [] } = traceSpans;

  const [selectedIndex, select] = useSelection(spans, (span) => span.span_id, spanId);
  const selected = spans[selectedIndex];

  const [root] = spans;
  const durationMs = traceDuration(spans);

  return (
    <box flexGrow={1}>
      {traceSpans.isError ? (
        <Placeholder text="Failed to load trace" variant="error" />
      ) : root === undefined || selected === undefined ? (
        <Placeholder
          text={traceSpans.isPending ? "Loading trace..." : "This trace is no longer available"}
        />
      ) : (
        <>
          <TraceHeader traceId={traceId} root={root} spans={spans} durationMs={durationMs} />
          <Split>
            <SpanWaterfall
              spans={spans}
              selectedIndex={selectedIndex}
              onSelect={(action) => select(action)}
              traceDurationMs={durationMs}
            />
            <SpanDetails
              key={selected.span_id}
              ref={detailsRef}
              traceId={traceId}
              span={selected}
            />
          </Split>
        </>
      )}
      <KeyHints>
        <Key name="escape" onPress={() => onBack()}>
          back
        </Key>
        <Key name="l" onPress={() => onOpenLogs()}>
          logs
        </Key>
        {selected !== undefined && (
          <Key name="shift+l" onPress={() => onOpenLogs(selected.span_id)}>
            span logs
          </Key>
        )}
        {spans.some((span) => span.is_error) && (
          <StepKeys
            forward="e"
            backward="shift+e"
            onStep={(step) =>
              select((index) => findNextIndex(spans, index, step, (span) => span.is_error))
            }
          >
            next error
          </StepKeys>
        )}
        {selected !== undefined && (
          <>
            <CopyKey name="y" text={selected.span_id}>
              copy span id
            </CopyKey>
            <CopyKey name="shift+y" text={traceId}>
              copy trace id
            </CopyKey>
            <ScrollKeys target={detailsRef} />
          </>
        )}
        <PauseKey />
      </KeyHints>
    </box>
  );
}
