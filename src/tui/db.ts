import type { DuckDBConnection } from "@duckdb/node-api";
import { createContext, use } from "react";

export const DbContext = createContext<DuckDBConnection | undefined>(undefined);

export function useDb() {
  const connection = use(DbContext);
  if (connection === undefined) {
    throw new Error("useDb must be used within a DbContext provider");
  }
  return connection;
}
