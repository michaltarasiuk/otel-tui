import type { DuckDBConnection } from "@duckdb/node-api";
import { queryOptions } from "@tanstack/react-query";

import { POLL_INTERVAL_MS } from "#query/polling.ts";

import { listOperations, listServices, type ServiceQuery } from "./read-services.ts";

export function serviceListQuery(connection: DuckDBConnection, query: ServiceQuery) {
  return queryOptions({
    queryKey: ["services", query],
    queryFn: () => listServices(connection, query),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function serviceOperationsQuery(
  connection: DuckDBConnection,
  serviceName: string | undefined,
) {
  return queryOptions({
    queryKey: ["services", serviceName, "operations"],
    queryFn: () => (serviceName === undefined ? [] : listOperations(connection, serviceName)),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });
}
