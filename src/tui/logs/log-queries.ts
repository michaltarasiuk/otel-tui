import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useConnection } from "#tui/query/connection.ts";
import { substringPattern } from "#tui/query/like-pattern.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

import { Log } from "./log.ts";
import { lowestSeverityNumber, type SeverityLevel } from "./severity.ts";
import logCount from "./sql/log-count.sql" with { type: "text" };
import logList from "./sql/log-list.sql" with { type: "text" };

const ANY_SEVERITY_NUMBER = 0;

interface LogQuery {
  search: string;
  minSeverity: SeverityLevel | undefined;
  traceId: string | undefined;
}

export function useLogList({ search, minSeverity, traceId }: LogQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", { search, minSeverity, traceId }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(logList, {
        limit: 500,
        pattern: substringPattern(search),
        minSeverityNumber:
          minSeverity === undefined ? ANY_SEVERITY_NUMBER : lowestSeverityNumber(minSeverity),
        traceId: traceId ?? null,
      });
      const rows = reader.getRowObjectsJS();
      return Log.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useLogTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["logs", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(logCount);
      return z.number().parse(reader.value(0, 0));
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
