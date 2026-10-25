import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";
import { severityColor, type SeverityLevel } from "./severity.ts";

const SHORT_TRACE_ID_LENGTH = 8;

function formatLogCount(shownCount: number, totalCount: number) {
  const unit = totalCount === 1 ? "log" : "logs";
  if (shownCount < totalCount) {
    return `${shownCount.toLocaleString()} of ${totalCount.toLocaleString()} ${unit}`;
  }
  return `${totalCount.toLocaleString()} ${unit}`;
}

interface LogFilterBarProps {
  search: string;
  searching: boolean;
  minSeverity: SeverityLevel | undefined;
  traceId: string | undefined;
  shownCount: number;
  totalCount: number;
  onSearchInput: (search: string) => void;
}

export function LogFilterBar({
  search,
  searching,
  minSeverity,
  traceId,
  shownCount,
  totalCount,
  onSearchInput,
}: LogFilterBarProps) {
  return (
    <box flexDirection="row" gap={2} paddingX={1}>
      <SearchField
        search={search}
        searching={searching}
        placeholder="body, attributes, service or trace ID"
        onInput={(search) => onSearchInput(search)}
      />
      {traceId !== undefined && (
        <text fg={THEME.text} flexShrink={0}>
          trace {traceId.slice(0, SHORT_TRACE_ID_LENGTH)}
        </text>
      )}
      {minSeverity !== undefined && (
        <text fg={severityColor(minSeverity)} flexShrink={0}>
          ≥ {minSeverity}
        </text>
      )}
      <text fg={THEME.textMuted} flexShrink={0}>
        {formatLogCount(shownCount, totalCount)}
      </text>
    </box>
  );
}
