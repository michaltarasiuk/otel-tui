import { useState } from "react";

import { stepItem } from "#utils/step-item.ts";

const REGIONS = ["tabs", "content"] as const;
type Region = (typeof REGIONS)[number];

export function useFocusedRegion() {
  const [region, setRegion] = useState<Region>("tabs");

  return {
    region,
    focusStep: (step: 1 | -1) => {
      setRegion((region) => stepItem(REGIONS, region, step));
    },
  };
}
