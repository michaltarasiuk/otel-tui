import { Pane } from "#tui/components/pane.tsx";
import { useNavigation } from "#tui/navigation.tsx";

import { TraceDetails } from "./trace-details.tsx";
import { TraceList } from "./trace-list.tsx";

export function TracesView() {
  const { trace } = useNavigation();

  return (
    <>
      <Pane visible={trace === undefined}>
        <TraceList />
      </Pane>
      {trace !== undefined && (
        <TraceDetails key={trace.traceId} traceId={trace.traceId} initialSpanId={trace.spanId} />
      )}
    </>
  );
}
