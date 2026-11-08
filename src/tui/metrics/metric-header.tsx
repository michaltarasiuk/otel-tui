import { Description, DetailsHeader, Id, Meta, Muted, Title } from "#tui/components/details.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { formatCount } from "#utils/format-count.ts";

import { type Metric, temporalityLabel, typeLabel } from "./metric.ts";

interface MetricHeaderProps {
  metric: Metric;
  seriesCount: number;
}

export function MetricHeader({ metric, seriesCount }: MetricHeaderProps) {
  const temporality = temporalityLabel(metric);

  return (
    <>
      <DetailsHeader>
        <Title>{metric.name}</Title>
        <Id>{typeLabel(metric.type)}</Id>
      </DetailsHeader>
      <Meta>
        {metric.service_name !== null && (
          <Muted>
            <ServiceName name={metric.service_name} />
          </Muted>
        )}
        {metric.unit !== "" && <Muted>unit {metric.unit}</Muted>}
        {temporality !== null && <Muted>{temporality}</Muted>}
        <Muted>{formatCount(seriesCount, "series", "series")}</Muted>
      </Meta>
      {metric.description !== "" && <Description>{metric.description}</Description>}
    </>
  );
}
