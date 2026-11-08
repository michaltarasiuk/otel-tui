import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useConnection } from "#tui/query/connection.ts";
import { substringPattern } from "#tui/query/like-pattern.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";
import { MINUTE_MS } from "#utils/time-units.ts";

import { Operation, Service, type ServiceSort } from "./service.ts";
import serviceList from "./sql/service-list.sql" with { type: "text" };
import serviceOperations from "./sql/service-operations.sql" with { type: "text" };

export const SERVICE_WINDOW_MS = 5 * MINUTE_MS;

function windowParams() {
  return { fromMs: Date.now() - SERVICE_WINDOW_MS, windowMs: SERVICE_WINDOW_MS };
}

interface ServiceQuery {
  search: string;
  sort: ServiceSort;
}

export function useServiceList({ search, sort }: ServiceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["services", { search, sort }],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(serviceList, {
        ...windowParams(),
        pattern: substringPattern(search),
        sortBy: sort.column,
        direction: sort.descending ? -1 : 1,
      });
      return Service.array().parse(reader.getRowObjectsJS());
    },
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useServiceOperations(serviceName: string | undefined) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["services", serviceName, "operations"],
    queryFn: async () => {
      const reader = await connection.runAndReadAll(serviceOperations, {
        ...windowParams(),
        serviceName: serviceName ?? null,
        limit: 50,
      });
      return Operation.array().parse(reader.getRowObjectsJS());
    },
    enabled: serviceName !== undefined,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
