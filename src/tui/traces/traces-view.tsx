import { FocusScope } from "../focus.tsx";
import { useNavigation } from "../navigation.tsx";
import { TraceDetails } from "./trace-details.tsx";
import { TraceList } from "./trace-list.tsx";

export function TracesView() {
  const { openTraceId } = useNavigation();

  return (
    <>
      <box visible={openTraceId === undefined} flexGrow={1}>
        <FocusScope focused={openTraceId === undefined}>
          <TraceList />
        </FocusScope>
      </box>
      {openTraceId !== undefined && <TraceDetails traceId={openTraceId} />}
    </>
  );
}
