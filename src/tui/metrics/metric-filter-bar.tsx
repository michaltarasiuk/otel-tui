import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";

function formatMetricCount(shownCount: number, totalCount: number) {
  const unit = totalCount === 1 ? "metric" : "metrics";
  if (shownCount < totalCount) {
    return `${shownCount.toLocaleString()} of ${totalCount.toLocaleString()} ${unit}`;
  }
  return `${totalCount.toLocaleString()} ${unit}`;
}

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
        {formatMetricCount(shownCount, totalCount)}
      </text>
    </box>
  );
}
