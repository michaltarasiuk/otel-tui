import { useState } from "react";

import { FocusScope } from "../focus.tsx";
import { MetricDetails } from "./metric-details.tsx";
import { MetricList } from "./metric-list.tsx";
import type { Metric } from "./metric.ts";

export function MetricsView() {
  const [openMetric, setOpenMetric] = useState<Metric>();

  return (
    <>
      <box visible={openMetric === undefined} flexGrow={1}>
        <FocusScope focused={openMetric === undefined}>
          <MetricList onOpen={(metric) => setOpenMetric(metric)} />
        </FocusScope>
      </box>
      {openMetric !== undefined && (
        <MetricDetails metric={openMetric} onClose={() => setOpenMetric(undefined)} />
      )}
    </>
  );
}
