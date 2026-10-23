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
  focused: boolean;
  errorsOnly: boolean;
  shownCount: number;
  totalCount: number;
  onSearchInput: (search: string) => void;
}

export function TraceFilterBar({
  search,
  searching,
  focused,
  errorsOnly,
  shownCount,
  totalCount,
  onSearchInput,
}: TraceFilterBarProps) {
  return (
    <box flexDirection="row" gap={2} paddingX={1}>
      <box flexGrow={1} flexDirection="row">
        {(searching || search !== "") && <text fg={THEME.textMuted}>/</text>}
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
          <text fg={THEME.text}>{search}</text>
        )}
      </box>
      {errorsOnly && <text fg={THEME.textError}>errors only</text>}
      <text fg={THEME.textMuted}>{formatTraceCount(shownCount, totalCount)}</text>
    </box>
  );
}
