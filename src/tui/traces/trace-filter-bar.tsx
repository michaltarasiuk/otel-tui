import { useFocused } from "../focus.tsx";
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
  const focused = useFocused();

  return (
    <box flexDirection="row" gap={2} paddingX={1}>
      <box flexGrow={1} flexDirection="row">
        {(searching || search !== "") && (
          <text fg={THEME.textMuted} flexShrink={0}>
            /
          </text>
        )}
        {searching ? (
          <input
            flexGrow={1}
            focused={focused}
            value={search}
            placeholder="trace name, service or ID"
            textColor={THEME.text}
            placeholderColor={THEME.textMuted}
            onInput={(search) => onSearchInput(search)}
          />
        ) : (
          <text fg={THEME.text} wrapMode="none" truncate>
            {search}
          </text>
        )}
      </box>
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
