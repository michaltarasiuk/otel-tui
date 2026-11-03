import { formatShownCount } from "../../utils/format-shown-count.ts";
import { COLUMN_GAP } from "../columns.ts";
import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";
import type { useSearch } from "../use-search.ts";

interface MetricFilterBarProps {
  search: ReturnType<typeof useSearch>;
  shownCount: number;
  totalCount: number;
}

export function MetricFilterBar({ search, shownCount, totalCount }: MetricFilterBarProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      <SearchField search={search} placeholder="name, description, service or attributes" />
      <text fg={THEME.textMuted} flexShrink={0}>
        {formatShownCount(shownCount, totalCount, "metric")}
      </text>
    </box>
  );
}
