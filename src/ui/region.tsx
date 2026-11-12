import { useState } from "react";

import { cycle, type Step } from "#utils/cycle.ts";

import { useRegionLevel } from "./focus.tsx";
import { StepKeys } from "./key-hints.tsx";

export function useRegion<T>(regions: readonly [T, ...T[]]) {
  const [region, setRegion] = useState(regions[0]);

  return [regions.includes(region) ? region : regions[0], setRegion] as const;
}

interface RegionKeysProps<T> {
  regions: readonly [T, ...T[]];
  region: T;
  onChange: (region: T) => void;
  children?: string;
}

export function RegionKeys<T>({ regions, region, onChange, children }: RegionKeysProps<T>) {
  const { depth, stepOut } = useRegionLevel();

  function step(step: Step) {
    const next = regions[regions.indexOf(region) + step];
    if (next !== undefined) {
      onChange(next);
    } else if (stepOut === undefined) {
      onChange(cycle(regions, region, step));
    } else {
      onChange(regions[0]);
      stepOut(step);
    }
  }

  return (
    <StepKeys
      forward="tab"
      backward="shift+tab"
      priority={depth}
      description="next region"
      backwardDescription="previous region"
      onStep={(next) => step(next)}
    >
      {children}
    </StepKeys>
  );
}
