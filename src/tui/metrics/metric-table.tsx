import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { WindowedRows } from "../windowed-rows.tsx";
import { MetricPanel } from "./metric-panel.tsx";
import { MetricHeaderRow, MetricRow } from "./metric-row.tsx";
import type { Metric, MetricSort } from "./metric.ts";

interface MetricTableProps {
  metrics: Metric[];
  sort: MetricSort;
  onOpen: (metric: Metric) => void;
}

export function MetricTable({ metrics, sort, onOpen }: MetricTableProps) {
  const focused = useFocused();

  const [selectedMetricId, setSelectedMetricId] = useState<string>();

  const selectedIndex = Math.max(
    0,
    metrics.findIndex((metric) => metric.metric_id === selectedMetricId),
  );
  const selectedMetric = metrics[selectedIndex];

  useBindings(
    () => ({
      enabled: focused,
      priority: FIRST_HINT_PRIORITY,
      commands: [
        {
          name: "metrics.open",
          desc: "open",
          run() {
            if (selectedMetric !== undefined) {
              onOpen(selectedMetric);
            }
          },
        },
      ],
      bindings: [{ key: "return", cmd: "metrics.open" }],
    }),
    [focused, selectedMetric, onOpen],
  );

  return (
    <box flexGrow={1}>
      <MetricHeaderRow sort={sort} />
      <WindowedRows
        rows={metrics}
        selectedIndex={selectedIndex}
        getKey={(metric) => metric.metric_id}
        renderRow={(metric, selected) => <MetricRow metric={metric} selected={selected} />}
        onSelect={(index) => setSelectedMetricId(metrics[index]?.metric_id)}
      />
      {selectedMetric !== undefined && <MetricPanel metric={selectedMetric} />}
    </box>
  );
}
