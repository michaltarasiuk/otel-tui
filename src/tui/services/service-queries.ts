import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listOperations,
  listServices,
  type ServiceQuery,
} from "#telemetry/services/read-services.ts";
import { useConnection } from "#tui/query/connection.ts";
import { POLL_INTERVAL_MS } from "#tui/query/polling.ts";

export function useServiceList({ search, sort }: ServiceQuery) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["services", { search, sort }],
    queryFn: () => listServices(connection, { search, sort }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useServiceOperations(serviceName: string | undefined) {
  const connection = useConnection();

  return useQuery({
    queryKey: ["services", serviceName, "operations"],
    queryFn: () => (serviceName === undefined ? [] : listOperations(connection, serviceName)),
    enabled: serviceName !== undefined,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
