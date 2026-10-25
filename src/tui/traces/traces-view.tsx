import { useState } from "react";

import { FocusScope } from "../focus.tsx";
import { TraceDetails } from "./trace-details.tsx";
import { TraceList } from "./trace-list.tsx";

export function TracesView() {
  const [openTraceId, setOpenTraceId] = useState<string>();

  return (
    <>
      <box visible={openTraceId === undefined} flexGrow={1}>
        <FocusScope focused={openTraceId === undefined}>
          <TraceList onOpen={(traceId) => setOpenTraceId(traceId)} />
        </FocusScope>
      </box>
      {openTraceId !== undefined && (
        <TraceDetails traceId={openTraceId} onClose={() => setOpenTraceId(undefined)} />
      )}
    </>
  );
}
