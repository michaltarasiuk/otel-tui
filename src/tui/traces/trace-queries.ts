import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useConnection } from "../connection.ts";
import TRACE_COUNT_SQL from "./trace-count.sql" with { type: "text" };
import TRACE_LIST_SQL from "./trace-list.sql" with { type: "text" };
import { Trace, type TraceSort } from "./trace.ts";

const POLL_INTERVAL_MS = 1000;
const MAX_TRACES = 500;

interface TraceQuery {
  search: string;
  errorsOnly: boolean;
  sort: TraceSort;
}

export function useTraceList({ search, errorsOnly, sort }: TraceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", { search, errorsOnly, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_LIST_SQL, {
        limit: MAX_TRACES,
        pattern: `%${search}%`,
        errorsOnly,
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      const rows = reader.getRowObjectsJS();
      return Trace.array().parse(rows);
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

const TraceCount = z.object({
  total_count: z.number(),
});

export function useTraceTotalCount() {
  const connection = useConnection();

  return useQuery({
    queryKey: ["traces", "count"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(TRACE_COUNT_SQL);
      const [row] = reader.getRowObjectsJS();
      return TraceCount.parse(row).total_count;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
