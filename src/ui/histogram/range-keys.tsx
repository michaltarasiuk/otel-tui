import { StepKeys } from "#ui/key-hints.tsx";

import type { HistogramRange } from "./bars.ts";
import type { TimeRange } from "./use-time-range.ts";

interface RangeKeysProps {
  timeRange: TimeRange;
  occupied: HistogramRange[];
}

export function RangeKeys({ timeRange, occupied }: RangeKeysProps) {
  return (
    <StepKeys
      forward="right"
      backward="left"
      description="later range"
      backwardDescription="earlier range"
      onStep={(step) => timeRange.step(occupied, step)}
    >
      range
    </StepKeys>
  );
}
