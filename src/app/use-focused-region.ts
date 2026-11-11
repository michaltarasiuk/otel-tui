import { useState } from "react";

import { cycle } from "#utils/cycle.ts";

const REGIONS = ["tabs", "content"] as const;
type Region = (typeof REGIONS)[number];

export function useFocusedRegion() {
  const [region, setRegion] = useState<Region>("tabs");

  return {
    region,
    focus: (region: Region) => {
      setRegion(region);
    },
    focusStep: (step: 1 | -1) => {
      setRegion((region) => cycle(REGIONS, region, step));
    },
  };
}
