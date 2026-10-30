import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { containsPattern } from "../../utils/contains-pattern.ts";
import { useConnection } from "../connection.ts";
import LOG_COUNT_SQL from "./log-count.sql" with { type: "text" };
import LOG_LIST_SQL from "./log-list.sql" with { type: "text" };
import { Log } from "./log.ts";
import { lowestSeverityNumber, type SeverityLevel } from "./severity.ts";

const POLL_INTERVAL_MS = 1000;
const MAX_LOGS = 500;
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
      const reader = await connection.runAndReadAll(LOG_LIST_SQL, {
        limit: MAX_LOGS,
        pattern: containsPattern(search),
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
      const reader = await connection.runAndReadAll(LOG_COUNT_SQL);
      return z.number().parse(reader.value(0, 0));
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
