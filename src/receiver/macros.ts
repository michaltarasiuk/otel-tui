import type { DuckDBConnection } from "@duckdb/node-api";

import attributeEntries from "#telemetry/sql/attribute-entries.sql" with { type: "text" };
import searchFilters from "#telemetry/sql/search-filters.sql" with { type: "text" };

export async function installMacros(connection: DuckDBConnection) {
  await connection.run(attributeEntries);
  await connection.run(searchFilters);
}
