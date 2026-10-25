import { useBindings } from "@opentui/keymap/react";
import { useState } from "react";

import { wrapIndex } from "../utils/wrap-index.ts";

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
          setRegion((region) => REGIONS[wrapIndex(REGIONS.indexOf(region) + 1, REGIONS.length)]!);
        },
      },
      {
        name: "focus.previous",
        run() {
          setRegion((region) => REGIONS[wrapIndex(REGIONS.indexOf(region) - 1, REGIONS.length)]!);
        },
      },
    ],
    bindings: [
      {
        key: "tab",
        cmd: "focus.next",
      },
      {
        key: "shift+tab",
        cmd: "focus.previous",
      },
    ],
  }));

  return region;
}
