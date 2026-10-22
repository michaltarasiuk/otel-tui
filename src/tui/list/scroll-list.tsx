import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef, type ReactNode } from "react";

interface ScrollListProps {
  // The id of the child row to keep in view.
  selectedId: string | undefined;
  children: ReactNode;
}

export function ScrollList({ selectedId, children }: ScrollListProps) {
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);

  useEffect(() => {
    if (selectedId !== undefined) {
      scrollboxRef.current?.scrollChildIntoView(selectedId);
    }
  }, [selectedId]);

  return (
    <scrollbox ref={scrollboxRef} flexGrow={1}>
      {children}
    </scrollbox>
  );
}
