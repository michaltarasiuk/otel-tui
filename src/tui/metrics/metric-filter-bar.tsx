import { formatShownCount } from "../../utils/format-shown-count.ts";
import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";

interface MetricFilterBarProps {
  search: string;
  searching: boolean;
  shownCount: number;
  totalCount: number;
  onSearchInput: (search: string) => void;
}

export function MetricFilterBar({
  search,
  searching,
  shownCount,
  totalCount,
  onSearchInput,
}: MetricFilterBarProps) {
  return (
    <box flexDirection="row" gap={2} paddingX={1}>
      <SearchField
        search={search}
        searching={searching}
        placeholder="name, description, service or attributes"
        onInput={(search) => onSearchInput(search)}
      />
      <text fg={THEME.textMuted} flexShrink={0}>
        {formatShownCount(shownCount, totalCount, "metric")}
      </text>
    </box>
  );
}
