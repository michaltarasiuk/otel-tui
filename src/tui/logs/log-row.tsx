import { ServiceName } from "#tui/components/service-name.tsx";
import { TableRow } from "#tui/components/table-row.tsx";
import {
  HEADER_CELL_PROPS,
  secondaryCellColor,
  COLUMN_SERVICE_WIDTH,
  COLUMN_TIME_WIDTH,
} from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";
import { collapseWhitespace } from "#utils/collapse-whitespace.ts";
import { formatTimeOfDay } from "#utils/format-time-of-day.ts";

import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

const SEVERITY_WIDTH = 8;

export function LogHeaderRow() {
  return (
    <TableRow>
      <text {...HEADER_CELL_PROPS} width={COLUMN_TIME_WIDTH}>
        Time
      </text>
      <text {...HEADER_CELL_PROPS} width={SEVERITY_WIDTH}>
        Severity
      </text>
      <text {...HEADER_CELL_PROPS} width={COLUMN_SERVICE_WIDTH}>
        Service
      </text>
      <text {...HEADER_CELL_PROPS} flexGrow={1}>
        Body
      </text>
    </TableRow>
  );
}

interface LogRowProps {
  log: Log;
  selected: boolean;
}

export function LogRow({ log, selected }: LogRowProps) {
  const secondaryColor = secondaryCellColor(selected);

  return (
    <TableRow selected={selected}>
      <text width={COLUMN_TIME_WIDTH} fg={secondaryColor}>
        {log.time !== null && formatTimeOfDay(log.time)}
      </text>
      <text width={SEVERITY_WIDTH} fg={severityColor(log.severity)} wrapMode="none" truncate>
        {log.severity ?? log.severity_text}
      </text>
      <text width={COLUMN_SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {log.service_name !== null && <ServiceName name={log.service_name} />}
      </text>
      <text flexGrow={1} fg={THEME.text} wrapMode="none" truncate>
        {log.event_name !== null && <span fg={secondaryColor}>{log.event_name} </span>}
        {log.body !== null && collapseWhitespace(log.body)}
      </text>
    </TableRow>
  );
}
