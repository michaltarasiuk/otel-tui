import { useBindings } from "@opentui/keymap/react";
import { Activity, useState } from "react";

import { THEME } from "../theme.ts";
import { Placeholder } from "../ui/placeholder.tsx";

import { useTrace } from "./store/use-trace.ts";
import { TraceDetail } from "./trace-detail.tsx";
import { TraceList } from "./trace-list.tsx";

export function TracesView() {
  const [openTraceId, setOpenTraceId] = useState<string>();

  return (
    <>
      <Activity mode={openTraceId === undefined ? "visible" : "hidden"}>
        <TraceList onOpen={(traceId) => setOpenTraceId(traceId)} />
      </Activity>
      {openTraceId === undefined ? null : (
        <OpenTrace
          key={openTraceId}
          traceId={openTraceId}
          onClose={() => setOpenTraceId(undefined)}
        />
      )}
    </>
  );
}

interface OpenTraceProps {
  traceId: string;
  onClose: () => void;
}

function OpenTrace({ traceId, onClose }: OpenTraceProps) {
  const state = useTrace(traceId);
  switch (state.status) {
    case "loading":
      return <TraceMessage text="Loading trace..." onClose={onClose} />;
    case "missing":
      return <TraceMessage text="This trace is no longer available" onClose={onClose} />;
    case "loaded":
      return <TraceDetail trace={state.trace} onClose={onClose} />;
    default:
      state satisfies never;
      throw new Error(`Unknown trace state: ${String(state)}`);
  }
}

interface TraceMessageProps {
  text: string;
  onClose: () => void;
}

function TraceMessage({ text, onClose }: TraceMessageProps) {
  useBindings(
    () => ({
      bindings: [
        { key: "escape", cmd: () => onClose(), desc: "back" },
        { key: "backspace", cmd: () => onClose() },
      ],
    }),
    [onClose],
  );

  return (
    <Placeholder>
      <text fg={THEME.textMuted}>{text}</text>
    </Placeholder>
  );
}
