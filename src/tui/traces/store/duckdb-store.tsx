import type { DuckDBConnection } from "@duckdb/node-api";
import { useEffect, useState, type ReactNode } from "react";

import type { TraceSummary } from "../trace.ts";

import { queryTrace, queryTraceSummaries } from "./queries.ts";
import { TraceStoreContext } from "./store.tsx";

const POLL_INTERVAL_MS = 1000;
const MAX_TRACES = 1000;

interface DuckDbTraceStoreProviderProps {
  connection: DuckDBConnection;
  children: ReactNode;
}

export function DuckDbTraceStoreProvider({ connection, children }: DuckDbTraceStoreProviderProps) {
  const [summaries, setSummaries] = useState<readonly TraceSummary[]>([]);

  useEffect(() => {
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // Chained timeouts rather than an interval, so a slow query never overlaps the next one.
    async function poll() {
      try {
        const next = await queryTraceSummaries(connection, MAX_TRACES);
        if (!stopped) {
          setSummaries((s) => reuseUnchanged(s, next));
        }
      } catch (error) {
        console.error("Querying traces failed:", error);
      }
      if (!stopped) {
        timeout = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      stopped = true;
      clearTimeout(timeout);
    };
  }, [connection]);

  const store = {
    summaries,
    loadTrace: (traceId: string) => queryTrace(connection, traceId),
  };

  return <TraceStoreContext value={store}>{children}</TraceStoreContext>;
}

// Keeps the previous list when nothing changed, so polling doesn't re-render.
function reuseUnchanged(previous: readonly TraceSummary[], next: TraceSummary[]) {
  const previousById = new Map(previous.map((summary) => [summary.traceId, summary]));
  const merged = next.map((summary) => {
    const old = previousById.get(summary.traceId);
    return old && isSameSummary(old, summary) ? old : summary;
  });
  const unchanged =
    merged.length === previous.length &&
    merged.every((summary, index) => summary === previous[index]);
  return unchanged ? previous : merged;
}

function isSameSummary(a: TraceSummary, b: TraceSummary) {
  return (
    a.startTime === b.startTime &&
    a.rootName === b.rootName &&
    a.service === b.service &&
    a.spanCount === b.spanCount &&
    a.durationMs === b.durationMs &&
    a.errorCount === b.errorCount
  );
}
