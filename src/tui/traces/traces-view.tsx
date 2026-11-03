import { useNavigation } from "../navigation.tsx";
import { Pane } from "../pane.tsx";
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
        <TraceDetails
          key={[openTraceId, openSpanId].join(" ")}
          traceId={openTraceId}
          initialSpanId={openSpanId}
        />
      )}
    </>
  );
}
