import { formatShownCount } from "../../utils/format-shown-count.ts";
import { COLUMN_GAP } from "../columns.ts";
import { SearchField } from "../search-field.tsx";
import { THEME } from "../theme.ts";
import type { useSearch } from "../use-search.ts";
import { severityColor, type SeverityLevel } from "./severity.ts";

const SHORT_TRACE_ID_LENGTH = 8;

interface LogFilterBarProps {
  search: ReturnType<typeof useSearch>;
  minSeverity: SeverityLevel | undefined;
  traceId: string | undefined;
  shownCount: number;
  totalCount: number;
}

export function LogFilterBar({
  search,
  minSeverity,
  traceId,
  shownCount,
  totalCount,
}: LogFilterBarProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
      <SearchField search={search} placeholder="body, attributes, service or trace ID" />
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
