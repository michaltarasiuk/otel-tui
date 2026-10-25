import { FocusScope } from "../focus.tsx";
import { TraceDetails } from "./trace-details.tsx";
import { TraceList } from "./trace-list.tsx";

interface TracesViewProps {
  openTraceId: string | undefined;
  onOpenTrace: (traceId: string) => void;
  onCloseTrace: () => void;
}

export function TracesView({ openTraceId, onOpenTrace, onCloseTrace }: TracesViewProps) {
  return (
    <>
      <box visible={openTraceId === undefined} flexGrow={1}>
        <FocusScope focused={openTraceId === undefined}>
          <TraceList onOpen={(traceId) => onOpenTrace(traceId)} />
        </FocusScope>
      </box>
      {openTraceId !== undefined && (
        <TraceDetails traceId={openTraceId} onClose={() => onCloseTrace()} />
      )}
    </>
  );
}
