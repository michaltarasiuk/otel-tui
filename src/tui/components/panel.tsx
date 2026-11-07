import type { ScrollBoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";

import { THEME } from "#tui/theme/theme.ts";

import { useFocused } from "./focus.tsx";

const SCROLLBAR_WIDTH = 1;

interface PanelProps {
  children: React.ReactNode;
}

export function Panel({ children }: PanelProps) {
  return (
    <box flexGrow={1} flexBasis={0} border={["top"]} borderColor={THEME.textMuted} paddingX={1}>
      {children}
    </box>
  );
}

interface PanelBodyProps {
  contentKey: string;
  children: React.ReactNode;
}

export function PanelBody({ contentKey, children }: PanelBodyProps) {
  const focused = useFocused();

  const bodyRef = useRef<ScrollBoxRenderable>(null);

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "panel.scroll-down",
          desc: "scroll",
          run() {
            bodyRef.current?.scrollBy(0.5, "viewport");
          },
        },
        {
          name: "panel.scroll-up",
          run() {
            bodyRef.current?.scrollBy(-0.5, "viewport");
          },
        },
      ],
      bindings: [
        { key: "ctrl+d", cmd: "panel.scroll-down" },
        { key: "ctrl+u", cmd: "panel.scroll-up" },
      ],
    }),
    [focused],
  );

  return (
    <scrollbox
      key={contentKey}
      ref={bodyRef}
      flexGrow={1}
      flexBasis={0}
      scrollbarOptions={{ showArrows: false }}
      contentOptions={{ paddingRight: SCROLLBAR_WIDTH }}
    >
      {children}
    </scrollbox>
  );
}
