import { Facts, Heading } from "#tui/components/heading.tsx";
import { ServiceName } from "#tui/components/service-name.tsx";
import { THEME } from "#tui/theme/theme.ts";
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
      <Heading title={metric.name} aside={typeLabel(metric.type)} />
      <Facts>
        {metric.service_name !== null && (
          <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
            <ServiceName name={metric.service_name} />
          </text>
        )}
        {metric.unit !== "" && (
          <text fg={THEME.textMuted} flexShrink={0}>
            unit {metric.unit}
          </text>
        )}
        {temporality !== null && (
          <text fg={THEME.textMuted} flexShrink={0}>
            {temporality}
          </text>
        )}
        <text fg={THEME.textMuted} flexShrink={0}>
          {formatCount(seriesCount, "series", "series")}
        </text>
      </Facts>
      {metric.description !== "" && <text fg={THEME.textMuted}>{metric.description}</text>}
    </>
  );
}
