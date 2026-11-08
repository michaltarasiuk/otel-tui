import type { ScrollBoxRenderable } from "@opentui/core";

import { Description, DetailsHeader, Id, Title } from "#tui/components/details.tsx";
import { ScrollBox } from "#tui/components/scroll-box.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { Cell, Column, Row, TableHeader } from "#tui/components/table.tsx";
import { THEME } from "#tui/theme/theme.ts";
import { formatDuration } from "#utils/format-duration.ts";
import { formatPercent } from "#utils/format-percent.ts";
import { formatRate } from "#utils/format-rate.ts";

import type { Operation, Service } from "./service.ts";

const COLUMN_RATE_WIDTH = 10;
const COLUMN_ERRORS_WIDTH = 8;
const COLUMN_DURATION_WIDTH = 9;

interface ServiceDetailsProps {
  ref: React.Ref<ScrollBoxRenderable>;
  service: Service;
  operations: Operation[];
  failed: boolean;
}

export function ServiceDetails({ ref, service, operations, failed }: ServiceDetailsProps) {
  return (
    <>
      <DetailsHeader>
        <Title>
          <ServiceName name={service.service_name} />
        </Title>
        <Id>server and consumer spans</Id>
      </DetailsHeader>
      <ScrollBox ref={ref}>
        {failed && <Description color={THEME.textError}>Failed to load operations</Description>}
        {operations.length > 0 && (
          <>
            <TableHeader>
              <Column grow={1}>Operation</Column>
              <Column width={COLUMN_RATE_WIDTH} align="right">
                Rate
              </Column>
              <Column width={COLUMN_ERRORS_WIDTH} align="right">
                Errors
              </Column>
              <Column width={COLUMN_DURATION_WIDTH} align="right">
                p95
              </Column>
            </TableHeader>
            {operations.map((operation) => (
              <Row key={operation.name}>
                <Cell grow={1}>{operation.name}</Cell>
                <Cell width={COLUMN_RATE_WIDTH} align="right">
                  {formatRate(operation.rate)}
                </Cell>
                <Cell
                  width={COLUMN_ERRORS_WIDTH}
                  align="right"
                  muted={operation.error_ratio === 0}
                  color={operation.error_ratio > 0 ? THEME.textError : undefined}
                >
                  {formatPercent(operation.error_ratio)}
                </Cell>
                <Cell width={COLUMN_DURATION_WIDTH} align="right">
                  {formatDuration(operation.p95_ms)}
                </Cell>
              </Row>
            ))}
          </>
        )}
      </ScrollBox>
    </>
  );
}
