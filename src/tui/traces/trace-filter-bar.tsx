import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";

function formatTraceCount(shownCount: number, totalCount: number) {
  const unit = totalCount === 1 ? "trace" : "traces";
  if (shownCount < totalCount) {
    return `${shownCount.toLocaleString()} of ${totalCount.toLocaleString()} ${unit}`;
  }
  return `${totalCount.toLocaleString()} ${unit}`;
}

interface TraceFilterBarProps {
  search: string;
  searching: boolean;
  errorsOnly: boolean;
  shownCount: number;
  totalCount: number;
  onSearchInput: (search: string) => void;
}

export function TraceFilterBar({
  search,
  searching,
  errorsOnly,
  shownCount,
  totalCount,
  onSearchInput,
}: TraceFilterBarProps) {
  return (
    <box flexDirection="row" gap={2} paddingX={1}>
      <SearchField
        search={search}
        searching={searching}
        placeholder="trace name, service or ID"
        onInput={(search) => onSearchInput(search)}
      />
      {errorsOnly && (
        <text fg={THEME.textError} flexShrink={0}>
          errors only
        </text>
      )}
      <text fg={THEME.textMuted} flexShrink={0}>
        {formatTraceCount(shownCount, totalCount)}
      </text>
    </box>
  );
}
