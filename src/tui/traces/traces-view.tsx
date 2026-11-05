import { Pane } from "#tui/components/pane.tsx";
import { useNavigation } from "#tui/navigation.tsx";

import { TraceDetails } from "./trace-details.tsx";
import { TraceList } from "./trace-list.tsx";

export function TracesView() {
  const { openTraceId, openSpanId } = useNavigation();

  return (
    <>
      <Pane visible={openTraceId === undefined}>
        <TraceList />
      </Pane>
      {openTraceId !== undefined && (
        <TraceDetails key={openTraceId} traceId={openTraceId} initialSpanId={openSpanId} />
      )}
    </>
  );
}
