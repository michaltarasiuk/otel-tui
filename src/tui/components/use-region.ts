import { useState } from "react";

export function useRegion<T>(regions: readonly [T, ...T[]]) {
  const [chosen, setChosen] = useState(regions[0]);
  const region = regions.includes(chosen) ? chosen : regions[0];

  function step(step: 1 | -1) {
    const next = regions[regions.indexOf(region) + step];
    setChosen(next ?? regions[0]);
    return next !== undefined;
  }

  return [region, step] as const;
}
