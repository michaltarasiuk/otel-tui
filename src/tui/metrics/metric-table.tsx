import { useBindings } from "@opentui/keymap/react";

import { useFocused } from "../focus.tsx";
import { FIRST_HINT_PRIORITY } from "../key-hints.tsx";
import { useListState } from "../use-list-state.ts";
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

  const list = useListState({
    items: metrics,
    getKey: (metric) => metric.metric_id,
  });

  const selectedMetric = list.selectedItem;

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
      <WindowedRows state={list}>
        {(metric, selected) => <MetricRow metric={metric} selected={selected} />}
      </WindowedRows>
      {selectedMetric !== undefined && <MetricPanel metric={selectedMetric} />}
    </box>
  );
}
