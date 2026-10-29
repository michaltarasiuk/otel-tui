import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { cycle } from "../utils/cycle.ts";

type Region = (typeof REGIONS)[number];

const REGIONS = ["tabs", "content"] as const;

export function useRegion() {
  const [region, setRegion] = useState<Region>("tabs");

  useBindings(() => ({
    commands: [
      {
        name: "focus.next",
        desc: "next region",
        run() {
          setRegion((region) => cycle(REGIONS, region, 1));
        },
      },
      {
        name: "focus.previous",
        run() {
          setRegion((region) => cycle(REGIONS, region, -1));
        },
      },
    ],
    bindings: [
      { key: "tab", cmd: "focus.next" },
      { key: "shift+tab", cmd: "focus.previous" },
    ],
  }));

  return region;
}
