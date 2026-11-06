import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { nextItem } from "#utils/next-item.ts";
import { previousItem } from "#utils/previous-item.ts";

const REGIONS = ["tabs", "content"] as const;
type Region = (typeof REGIONS)[number];

export function useRegion() {
  const [region, setRegion] = useState<Region>("tabs");

  useBindings(() => ({
    commands: [
      {
        name: "focus.next",
        desc: "next region",
        run() {
          setRegion((region) => nextItem(REGIONS, region));
        },
      },
      {
        name: "focus.previous",
        run() {
          setRegion((region) => previousItem(REGIONS, region));
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
