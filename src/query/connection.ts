import type { DuckDBConnection } from "@duckdb/node-api";
import { createContext, use } from "react";

export const ConnectionContext = createContext<DuckDBConnection | undefined>(undefined);

export function useConnection() {
  const connection = use(ConnectionContext);
  if (connection === undefined) {
    throw new Error("useConnection must be used within a ConnectionContext provider");
  }
  return connection;
}
