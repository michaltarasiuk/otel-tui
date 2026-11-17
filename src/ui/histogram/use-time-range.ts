import { useDeferredValue, useState } from "react";

import { type HistogramRange, stepSelection } from "./bars.ts";

export function useTimeRange() {
  const [selected, setSelected] = useState<HistogramRange | undefined>(undefined);
  const deferredSelected = useDeferredValue(selected);

  return {
    selected,
    deferredSelected,
    step(occupied: HistogramRange[], step: 1 | -1) {
      setSelected((selected) => stepSelection(occupied, selected, step));
    },
    clear() {
      setSelected(undefined);
    },
  };
}
