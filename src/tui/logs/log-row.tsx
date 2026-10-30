import { collapseSpaces } from "../../utils/collapse-spaces.ts";
import { formatTime } from "../../utils/format-time.ts";
import { HEADER_CELL_PROPS, secondaryCellColor, SERVICE_WIDTH, TIME_WIDTH } from "../columns.ts";
import { ServiceName } from "../service-name.tsx";
import { TableRow } from "../table-row.tsx";
import { THEME } from "../theme.ts";
import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

const SEVERITY_WIDTH = 8;

export function LogHeaderRow() {
  return (
    <TableRow>
      <text {...HEADER_CELL_PROPS} width={TIME_WIDTH}>
        Time
      </text>
      <text {...HEADER_CELL_PROPS} width={SEVERITY_WIDTH}>
        Severity
      </text>
      <text {...HEADER_CELL_PROPS} width={SERVICE_WIDTH}>
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
      <text width={TIME_WIDTH} fg={secondaryColor}>
        {log.time !== null && formatTime(log.time)}
      </text>
      <text width={SEVERITY_WIDTH} fg={severityColor(log.severity)} wrapMode="none" truncate>
        {log.severity ?? log.severity_text}
      </text>
      <text width={SERVICE_WIDTH} fg={secondaryColor} wrapMode="none" truncate>
        {log.service_name !== null && <ServiceName name={log.service_name} />}
      </text>
      <text flexGrow={1} fg={THEME.text} wrapMode="none" truncate>
        {log.event_name !== null && <span fg={secondaryColor}>{log.event_name} </span>}
        {log.body !== null && collapseSpaces(log.body)}
      </text>
    </TableRow>
  );
}
