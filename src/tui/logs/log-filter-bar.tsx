import { formatShownCount } from "../../utils/format-shown-count.ts";
import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";
import { severityColor, type SeverityLevel } from "./severity.ts";

const SHORT_TRACE_ID_LENGTH = 8;

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
        {formatShownCount(shownCount, totalCount, "log")}
      </text>
    </box>
  );
}
