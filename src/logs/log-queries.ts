import type { DuckDBConnection } from "@duckdb/node-api";
import { useSuspenseQueries } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { POLL_INTERVAL_MS } from "#query/polling.ts";

import { countLogs, listLogs, type LogQuery, readLogTimeline } from "./read-logs.ts";

async function readLogList(connection: DuckDBConnection, query: LogQuery) {
  const [logs, totalCount] = await Promise.all([
    listLogs(connection, query),
    countLogs(connection),
  ]);
  return { logs, totalCount };
}

export function useLogs({ timeRange, ...filter }: LogQuery) {
  const connection = useConnection();

  return useSuspenseQueries({
    queries: [
      {
        queryKey: ["logs", { ...filter, timeRange }],
        queryFn: () => readLogList(connection, { ...filter, timeRange }),
        refetchInterval: POLL_INTERVAL_MS,
      },
      {
        queryKey: ["logs", "timeline", filter],
        queryFn: () => readLogTimeline(connection, filter),
        refetchInterval: POLL_INTERVAL_MS,
      },
    ],
  });
}
