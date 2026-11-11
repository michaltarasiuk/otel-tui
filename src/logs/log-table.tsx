import type { SetStateAction } from "react";

import { COLUMN_SERVICE_WIDTH, COLUMN_TIME_WIDTH } from "#ui/columns.ts";
import { Rows } from "#ui/rows.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { Cell, Column, Row, Secondary, TableHeader } from "#ui/table.tsx";
import { collapseWhitespace } from "#utils/text.ts";
import { formatTime } from "#utils/time.ts";

import type { Log } from "./log.ts";
import { severityColor } from "./severity-color.ts";

const COLUMN_SEVERITY_WIDTH = 8;

interface LogTableProps {
  logs: Log[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
}

export function LogTable({ logs, selectedIndex, onSelect }: LogTableProps) {
  return (
    <>
      <TableHeader>
        <Column width={COLUMN_TIME_WIDTH}>Time</Column>
        <Column width={COLUMN_SEVERITY_WIDTH}>Severity</Column>
        <Column width={COLUMN_SERVICE_WIDTH}>Service</Column>
        <Column grow={1}>Body</Column>
      </TableHeader>
      <Rows
        items={logs}
        getKey={(log) => log.log_id}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(log) => (
          <Row>
            <Cell width={COLUMN_TIME_WIDTH} muted>
              {log.time !== null && formatTime(log.time)}
            </Cell>
            <Cell width={COLUMN_SEVERITY_WIDTH} color={severityColor(log.severity)}>
              {log.severity ?? log.severity_text}
            </Cell>
            <Cell width={COLUMN_SERVICE_WIDTH} muted>
              {log.service_name !== null && <ServiceName name={log.service_name} />}
            </Cell>
            <Cell grow={1}>
              {log.event_name !== null && <Secondary>{log.event_name} </Secondary>}
              {log.body !== null && collapseWhitespace(log.body)}
            </Cell>
          </Row>
        )}
      </Rows>
    </>
  );
}
