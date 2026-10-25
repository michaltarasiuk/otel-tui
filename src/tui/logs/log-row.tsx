import { formatTime } from "../../utils/format-time.ts";
import { COLUMN_GAP, HEADER_CELL_PROPS, SERVICE_WIDTH, TIME_WIDTH } from "../columns.ts";
import { useFocused } from "../focus.tsx";
import { ServiceName } from "../service-name.tsx";
import { THEME } from "../theme.ts";
import type { Log } from "./log.ts";
import { severityColor } from "./severity.ts";

const SEVERITY_WIDTH = 8;

function toSingleLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function LogHeaderRow() {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} paddingX={1}>
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
    </box>
  );
}

interface LogRowProps {
  log: Log;
  selected: boolean;
}

export function LogRow({ log, selected }: LogRowProps) {
  const focused = useFocused();

  const secondaryColor = selected ? THEME.text : THEME.textMuted;

  return (
    <box
      flexDirection="row"
      gap={COLUMN_GAP}
      paddingX={1}
      backgroundColor={selected && focused ? THEME.backgroundSelected : THEME.background}
    >
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
        {log.body !== null && toSingleLine(log.body)}
      </text>
    </box>
  );
}
