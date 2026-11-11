import type { SetStateAction } from "react";

import { COLUMN_SORT_ARROW_WIDTH } from "#ui/columns.ts";
import { Rows } from "#ui/rows.tsx";
import { ServiceName } from "#ui/service-name.tsx";
import { Cell, Column, Row, sortDirection, TableHeader } from "#ui/table.tsx";
import { THEME } from "#ui/theme.ts";
import { formatInteger, formatPercent, formatRate } from "#utils/number.ts";
import { formatDuration } from "#utils/time.ts";

import type { Service, ServiceSort } from "./service.ts";

export const COLUMN_SPANS_WIDTH = 9;
export const COLUMN_RATE_WIDTH = 10 + COLUMN_SORT_ARROW_WIDTH;
export const COLUMN_ERRORS_WIDTH = 8 + COLUMN_SORT_ARROW_WIDTH;
export const COLUMN_DURATION_WIDTH = 9 + COLUMN_SORT_ARROW_WIDTH;

interface ServiceTableProps {
  services: Service[];
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  sort: ServiceSort;
}

export function ServiceTable({ services, selectedIndex, onSelect, sort }: ServiceTableProps) {
  return (
    <>
      <TableHeader>
        <Column grow={1}>Service</Column>
        <Column width={COLUMN_RATE_WIDTH} align="right" sort={sortDirection(sort, "rate")}>
          Rate
        </Column>
        <Column width={COLUMN_ERRORS_WIDTH} align="right" sort={sortDirection(sort, "error_ratio")}>
          Errors
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          p50
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right" sort={sortDirection(sort, "p95_ms")}>
          p95
        </Column>
        <Column width={COLUMN_DURATION_WIDTH} align="right">
          p99
        </Column>
        <Column width={COLUMN_SPANS_WIDTH} align="right">
          Spans
        </Column>
      </TableHeader>
      <Rows
        items={services}
        getKey={(service) => service.service_name}
        selectedIndex={selectedIndex}
        onSelect={(action) => onSelect(action)}
      >
        {(service) => (
          <Row>
            <Cell grow={1}>
              <ServiceName name={service.service_name} />
            </Cell>
            <Cell width={COLUMN_RATE_WIDTH} align="right">
              {formatRate(service.rate)}
            </Cell>
            <Cell
              width={COLUMN_ERRORS_WIDTH}
              align="right"
              muted={service.error_ratio === 0}
              color={service.error_ratio > 0 ? THEME.textError : undefined}
            >
              {formatPercent(service.error_ratio)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(service.p50_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(service.p95_ms)}
            </Cell>
            <Cell width={COLUMN_DURATION_WIDTH} align="right">
              {formatDuration(service.p99_ms)}
            </Cell>
            <Cell width={COLUMN_SPANS_WIDTH} align="right" muted>
              {formatInteger(service.span_count)}
            </Cell>
          </Row>
        )}
      </Rows>
    </>
  );
}
