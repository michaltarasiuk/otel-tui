import { type Metric, temporalityLabel, typeLabel } from "#telemetry/metrics/metric.ts";
import { Description, DetailsHeader, Id, Meta, Fact, Title } from "#tui/components/details.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { formatCount } from "#utils/format-count.ts";

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
          <Fact>
            <ServiceName name={metric.service_name} />
          </Fact>
        )}
        {metric.unit !== "" && <Fact>unit {metric.unit}</Fact>}
        {temporality !== null && <Fact>{temporality}</Fact>}
        <Fact>{formatCount(seriesCount, "series", "series")}</Fact>
      </Meta>
      {metric.description !== "" && <Description>{metric.description}</Description>}
    </>
  );
}
