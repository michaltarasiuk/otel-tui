import { TextAttributes } from "@opentui/core";

import { COLUMN_GAP } from "../columns.ts";
import { IGNORE_CONTENT_SIZE } from "../flex.ts";
import { ServiceName } from "../service-name.tsx";
import { THEME } from "../theme.ts";
import { type Metric, temporalityLabel, typeLabel } from "./metric.ts";

interface MetricHeaderProps {
  metric: Metric;
  seriesCount: number;
}

export function MetricHeader({ metric, seriesCount }: MetricHeaderProps) {
  const temporality = temporalityLabel(metric);

  return (
    <>
      <box flexDirection="row" gap={COLUMN_GAP}>
        <text
          flexGrow={1}
          flexBasis={IGNORE_CONTENT_SIZE}
          fg={THEME.text}
          attributes={TextAttributes.BOLD}
          wrapMode="none"
          truncate
        >
          {metric.name}
        </text>
        <text fg={THEME.textMuted} flexShrink={0}>
          {typeLabel(metric.type)}
        </text>
      </box>
      <box flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
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
          {seriesCount.toLocaleString()} series
        </text>
      </box>
      {metric.description !== "" && <text fg={THEME.textMuted}>{metric.description}</text>}
    </>
  );
}
