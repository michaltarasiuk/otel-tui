import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { nextItem } from "#utils/next-item.ts";
import { previousItem } from "#utils/previous-item.ts";

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
          setRegion((region) => nextItem(REGIONS, region));
        },
      },
      {
        name: "region.previous",
        run() {
          setRegion((region) => previousItem(REGIONS, region));
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
