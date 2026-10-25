import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { Placeholder } from "../placeholder.tsx";
import { MetricHeader } from "./metric-header.tsx";
import { useMetricSeries } from "./metric-queries.ts";
import type { Metric } from "./metric.ts";
import { SeriesTable } from "./series-table.tsx";

interface MetricDetailsProps {
  metric: Metric;
  onClose: () => void;
}

export function MetricDetails({ metric, onClose }: MetricDetailsProps) {
  const focused = useFocused();

  const metricSeries = useMetricSeries(metric);

  const { data: series = [] } = metricSeries;

  useBindings(
    () => ({
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "metric.close",
          desc: "back",
          run() {
            onClose();
          },
        },
      ],
      bindings: [{ key: "escape", cmd: "metric.close" }],
    }),
    [focused, onClose],
  );

  function renderMetric() {
    if (metricSeries.isError) {
      return <Placeholder text="Failed to load metric" variant="error" />;
    }
    if (series.length === 0) {
      return (
        <Placeholder
          text={metricSeries.isPending ? "Loading metric..." : "This metric is no longer available"}
        />
      );
    }
    return (
      <>
        <box paddingX={1}>
          <MetricHeader metric={metric} seriesCount={series.length} />
        </box>
        <SeriesTable metric={metric} series={series} />
      </>
    );
  }

  return <box flexGrow={1}>{renderMetric()}</box>;
}
