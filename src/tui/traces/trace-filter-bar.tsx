import { formatShownCount } from "../../utils/format-shown-count.ts";
import { COLUMN_GAP } from "../columns.ts";
import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";

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
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
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
        {formatShownCount(shownCount, totalCount, "trace")}
      </text>
    </box>
  );
}
