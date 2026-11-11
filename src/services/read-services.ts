import type { DuckDBConnection } from "@duckdb/node-api";

import serviceList from "#services/sql/service-list.sql" with { type: "text" };
import serviceOperations from "#services/sql/service-operations.sql" with { type: "text" };
import { substringPattern } from "#telemetry/like-pattern.ts";
import { MINUTE_MS } from "#utils/time.ts";

import { Operation, Service, type ServiceSort } from "./service.ts";

export const SERVICE_WINDOW_MS = 5 * MINUTE_MS;

const OPERATION_LIMIT = 50;

function windowParams() {
  return { fromMs: Date.now() - SERVICE_WINDOW_MS, windowMs: SERVICE_WINDOW_MS };
}

export interface ServiceQuery {
  search: string;
  sort: ServiceSort;
}

export async function listServices(connection: DuckDBConnection, { search, sort }: ServiceQuery) {
  const reader = await connection.runAndReadAll(serviceList, {
    ...windowParams(),
    pattern: substringPattern(search),
    sortBy: sort.column,
    direction: sort.descending ? -1 : 1,
  });
  return Service.array().parse(reader.getRowObjectsJS());
}

export async function listOperations(connection: DuckDBConnection, serviceName: string) {
  const reader = await connection.runAndReadAll(serviceOperations, {
    ...windowParams(),
    serviceName,
    limit: OPERATION_LIMIT,
  });
  return Operation.array().parse(reader.getRowObjectsJS());
}
