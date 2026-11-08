import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { type SetStateAction, useEffectEvent, useRef, useState } from "react";

import { THEME } from "#tui/theme/theme.ts";
import { clamp } from "#utils/clamp.ts";

import { useFocused } from "./focus.tsx";
import { SelectedContext } from "./table.tsx";

interface RowsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  children: (item: T) => React.ReactNode;
}

export function Rows<T>({ items, getKey, selectedIndex, onSelect, children }: RowsProps<T>) {
  const focused = useFocused();

  const [visibleRowCount, setVisibleRowCount] = useState(0);

  const rowsRef = useRef<BoxRenderable>(null);

  const firstVisibleIndex = clamp(
    selectedIndex - Math.floor(visibleRowCount / 2),
    0,
    items.length - visibleRowCount,
  );
  const visibleItems = items.slice(firstVisibleIndex, firstVisibleIndex + visibleRowCount);

  const hiddenRowCount = items.length - visibleRowCount;
  const scrollThumbTop = Math.round((firstVisibleIndex / hiddenRowCount) * (visibleRowCount - 1));

  const moveBy = useEffectEvent((offset: number) => onSelect((index) => index + offset));
  const movePage = useEffectEvent((direction: 1 | -1) => moveBy(direction * visibleRowCount));
  const moveTo = useEffectEvent((index: number) => onSelect(index));
  const moveToLast = useEffectEvent(() => onSelect(items.length - 1));

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        { name: "rows.next", run: () => moveBy(1) },
        { name: "rows.previous", run: () => moveBy(-1) },
        { name: "rows.next-page", run: () => movePage(1) },
        { name: "rows.previous-page", run: () => movePage(-1) },
        { name: "rows.first", run: () => moveTo(0) },
        { name: "rows.last", run: () => moveToLast() },
      ],
      bindings: [
        { key: "down", cmd: "rows.next" },
        { key: "j", cmd: "rows.next" },
        { key: "up", cmd: "rows.previous" },
        { key: "k", cmd: "rows.previous" },
        { key: "pagedown", cmd: "rows.next-page" },
        { key: "pageup", cmd: "rows.previous-page" },
        { key: "home", cmd: "rows.first" },
        { key: "end", cmd: "rows.last" },
      ],
    }),
    [focused],
  );

  return (
    <box
      ref={rowsRef}
      flexGrow={1}
      flexBasis={0}
      maxHeight={items.length}
      overflow="hidden"
      onSizeChange={() => setVisibleRowCount(rowsRef.current?.height ?? 0)}
      onMouseScroll={({ scroll }) => {
        if (scroll?.direction === "down") {
          onSelect((index) => index + scroll.delta);
        } else if (scroll?.direction === "up") {
          onSelect((index) => index - scroll.delta);
        }
      }}
    >
      {visibleItems.map((item, offset) => (
        <SelectedContext key={getKey(item)} value={firstVisibleIndex + offset === selectedIndex}>
          {children(item)}
        </SelectedContext>
      ))}
      {visibleRowCount > 0 && hiddenRowCount > 0 && (
        <text position="absolute" right={0} top={scrollThumbTop} fg={THEME.textMuted}>
          █
        </text>
      )}
    </box>
  );
}
