import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { useNavigation } from "../navigation.tsx";
import { Placeholder } from "../placeholder.tsx";
import { SpanTable } from "./span-table.tsx";
import { TraceHeader } from "./trace-header.tsx";
import { useTraceSpans } from "./trace-queries.ts";

interface TraceDetailsProps {
  traceId: string;
  initialSpanId: string | undefined;
}

export function TraceDetails({ traceId, initialSpanId }: TraceDetailsProps) {
  const focused = useFocused();
  const { canGoBack, closeTrace, openLogs, goBack } = useNavigation();

  const traceSpans = useTraceSpans(traceId);

  const { data: spans = [] } = traceSpans;

  useBindings(
    () => ({
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "trace.close",
          desc: "back",
          run() {
            if (canGoBack) {
              goBack();
            } else {
              closeTrace();
            }
          },
        },
        {
          name: "trace.open-logs",
          desc: "logs",
          run() {
            openLogs(traceId);
          },
        },
      ],
      bindings: [
        { key: "escape", cmd: "trace.close" },
        { key: "l", cmd: "trace.open-logs" },
      ],
    }),
    [focused, traceId, canGoBack, closeTrace, openLogs, goBack],
  );

  function renderTrace() {
    if (traceSpans.isError) {
      return <Placeholder text="Failed to load trace" variant="error" />;
    }
    const [root] = spans;
    if (root === undefined) {
      return (
        <Placeholder
          text={traceSpans.isPending ? "Loading trace..." : "This trace is no longer available"}
        />
      );
    }

    const durationMs = spans.reduce(
      (end, span) => Math.max(end, span.offset_ms + span.duration_ms),
      0,
    );

    return (
      <>
        <TraceHeader traceId={traceId} root={root} spans={spans} durationMs={durationMs} />
        <SpanTable
          key={initialSpanId}
          traceId={traceId}
          initialSpanId={initialSpanId}
          spans={spans}
          traceDurationMs={durationMs}
        />
      </>
    );
  }

  return <box flexGrow={1}>{renderTrace()}</box>;
}
