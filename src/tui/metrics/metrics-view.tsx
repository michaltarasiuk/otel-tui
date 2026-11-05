import { useState } from "react";

import { Pane } from "../components/pane.tsx";
import { MetricDetails } from "./metric-details.tsx";
import { MetricList } from "./metric-list.tsx";
import type { Metric } from "./metric.ts";

export function MetricsView() {
  const [openMetric, setOpenMetric] = useState<Metric>();

  return (
    <>
      <Pane visible={openMetric === undefined}>
        <MetricList onOpen={(metric) => setOpenMetric(metric)} />
      </Pane>
      {openMetric !== undefined && (
        <MetricDetails metric={openMetric} onClose={() => setOpenMetric(undefined)} />
      )}
    </>
  );
}
