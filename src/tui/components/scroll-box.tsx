import type { ScrollBoxRenderable } from "@opentui/core";

import { Key } from "./key-hints.tsx";

const SCROLLBAR_WIDTH = 1;

interface ScrollKeysProps {
  target: React.RefObject<ScrollBoxRenderable | null>;
}

export function ScrollKeys({ target }: ScrollKeysProps) {
  return (
    <>
      <Key name="ctrl+d" onPress={() => target.current?.scrollBy(0.5, "viewport")}>
        scroll
      </Key>
      <Key name="ctrl+u" onPress={() => target.current?.scrollBy(-0.5, "viewport")} />
    </>
  );
}

interface ScrollBoxProps {
  ref: React.Ref<ScrollBoxRenderable>;
  children: React.ReactNode;
}

export function ScrollBox({ ref, children }: ScrollBoxProps) {
  return (
    <scrollbox
      ref={ref}
      flexGrow={1}
      flexBasis={0}
      scrollbarOptions={{ showArrows: false }}
      contentOptions={{ paddingRight: SCROLLBAR_WIDTH }}
    >
      {children}
    </scrollbox>
  );
}
