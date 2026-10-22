import { useEffect, useState } from "react";

import type { Trace } from "../trace.ts";

import { useTraceStore } from "./store.tsx";

type TraceState =
  | { status: "loading" }
  | { status: "loaded"; trace: Trace }
  | { status: "missing" };

export function useTrace(traceId: string) {
  const { summaries, loadTrace } = useTraceStore();
  const [state, setState] = useState<TraceState>({ status: "loading" });
  // Spans of one trace arrive over time, so reload whenever its span count changes.
  const spanCount = summaries.find((summary) => summary.traceId === traceId)?.spanCount;

  useEffect(() => {
    let cancelled = false;
    loadTrace(traceId).then(
      (trace) => {
        if (!cancelled) {
          setState(trace ? { status: "loaded", trace } : { status: "missing" });
        }
      },
      (error: unknown) => console.error(`Loading trace ${traceId} failed:`, error),
    );
    return () => {
      cancelled = true;
    };
  }, [loadTrace, traceId, spanCount]);

  return state;
}
