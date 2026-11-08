import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { stepItem } from "#utils/step-item.ts";

const REGIONS = ["tabs", "content"] as const;
type Region = (typeof REGIONS)[number];

export function useFocusedRegion() {
  const [region, setRegion] = useState<Region>("tabs");

  useBindings(() => ({
    commands: [
      {
        name: "region.next",
        desc: "next region",
        run() {
          setRegion((region) => stepItem(REGIONS, region, 1));
        },
      },
      {
        name: "region.previous",
        run() {
          setRegion((region) => stepItem(REGIONS, region, -1));
        },
      },
    ],
    bindings: [
      { key: "tab", cmd: "region.next" },
      { key: "shift+tab", cmd: "region.previous" },
    ],
  }));

  return region;
}
