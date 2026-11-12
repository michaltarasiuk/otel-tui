import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions } from "@tanstack/react-query";

import { POLL_INTERVAL_MS } from "#query/polling.ts";

import {
  type LogFilter,
  type LogQuery,
  readLogCount,
  readLogList,
  readLogTimeline,
} from "./read-logs.ts";

export function logListQuery(connection: DuckDBConnection, query: LogQuery) {
  return queryOptions({
    queryKey: ["logs", query],
    queryFn: async () => {
      const [logs, totalCount] = await Promise.all([
        readLogList(connection, query),
        readLogCount(connection),
      ]);
      return { logs, totalCount };
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function logTimelineQuery(connection: DuckDBConnection, filter: LogFilter) {
  return queryOptions({
    queryKey: ["logs", "timeline", filter],
    queryFn: () => readLogTimeline(connection, filter),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
