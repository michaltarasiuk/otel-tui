import type { ScrollBoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";

import { IGNORE_CONTENT_SIZE } from "../theme/flex.ts";
import { THEME } from "../theme/theme.ts";
import { useFocused } from "./focus.tsx";

const HALF_VIEWPORT = 0.5;
const SCROLLBAR_WIDTH = 1;

interface PanelProps {
  children: React.ReactNode;
}

export function Panel({ children }: PanelProps) {
  return (
    <box
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      border={["top"]}
      borderColor={THEME.textMuted}
      paddingX={1}
    >
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
            bodyRef.current?.scrollBy(HALF_VIEWPORT, "viewport");
          },
        },
        {
          name: "panel.scroll-up",
          run() {
            bodyRef.current?.scrollBy(-HALF_VIEWPORT, "viewport");
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
      flexBasis={IGNORE_CONTENT_SIZE}
      scrollbarOptions={{ showArrows: false }}
      contentOptions={{ paddingRight: SCROLLBAR_WIDTH }}
    >
      {children}
    </scrollbox>
  );
}
