import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  countLogs,
  listLogs,
  type LogFilter,
  type LogQuery,
  readLogTimeline,
} from "#telemetry/logs/read-logs.ts";
import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

export function useLogList({ timeRange, ...filter }: LogQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", { ...filter, timeRange }],
    queryFn: () => listLogs(connection, { ...filter, timeRange }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useLogTimeline(filter: LogFilter) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", "timeline", filter],
    queryFn: () => readLogTimeline(connection, filter),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useLogTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", "count"],
    queryFn: () => countLogs(connection),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
