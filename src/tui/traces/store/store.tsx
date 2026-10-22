import { createContext, use } from "react";

import type { Trace, TraceSummary } from "../trace.ts";

// The traces UI reads only this interface, so it doesn't know where traces come from.
export interface TraceStore {
  summaries: readonly TraceSummary[];
  loadTrace: (traceId: string) => Promise<Trace | undefined>;
}

export const TraceStoreContext = createContext<TraceStore | undefined>(undefined);

export function useTraceStore() {
  const store = use(TraceStoreContext);
  if (store === undefined) {
    throw new Error("useTraceStore must be used within a trace store provider");
  }
  return store;
}
