import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { useConnection } from "#query/connection.ts";
import { POLL_INTERVAL_MS } from "#query/polling.ts";

import { listOperations, listServices, type ServiceQuery } from "./read-services.ts";

export function useServices({ search, sort }: ServiceQuery) {
  const connection = useConnection();

  return useSuspenseQuery({
    queryKey: ["services", { search, sort }],
    queryFn: () => listServices(connection, { search, sort }),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

function serviceOperationsQuery(connection: DuckDBConnection, serviceName: string | undefined) {
  return queryOptions({
    queryKey: ["services", serviceName, "operations"],
    queryFn: () => (serviceName === undefined ? [] : listOperations(connection, serviceName)),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });
}

export function useServiceOperations(serviceName: string | undefined) {
  const options = serviceOperationsQuery(useConnection(), serviceName);

  return useQuery({ ...options, enabled: serviceName !== undefined });
}

export function useSuspenseServiceOperations(serviceName: string) {
  return useSuspenseQuery(serviceOperationsQuery(useConnection(), serviceName));
}
