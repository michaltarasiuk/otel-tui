import type { DuckDBConnection } from "@duckdb/node-api";

import attributeEntries from "./sql/attribute-entries.sql" with { type: "text" };
import searchFilters from "./sql/search-filters.sql" with { type: "text" };

export async function installMacros(connection: DuckDBConnection) {
  await connection.run(attributeEntries);
  await connection.run(searchFilters);
}
