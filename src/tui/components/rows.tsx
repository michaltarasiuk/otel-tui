import { type BoxRenderable, MouseButton } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { type SetStateAction, useEffectEvent, useRef, useState } from "react";

import { THEME } from "#tui/theme/theme.ts";
import { clamp } from "#utils/number.ts";

import { useFocused, useFocusRequest, useKeysEnabled } from "./focus.tsx";
import { SelectedContext } from "./table.tsx";
import { useScrollGesture } from "./use-scroll-gesture.ts";

interface RowsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  selectedIndex: number;
  onSelect: (action: SetStateAction<number>) => void;
  halfPageKeys?: boolean;
  children: (item: T) => React.ReactNode;
}

export function Rows<T>({
  items,
  getKey,
  selectedIndex,
  onSelect,
  halfPageKeys = false,
  children,
}: RowsProps<T>) {
  const focused = useFocused();
  const keysEnabled = useKeysEnabled();
  const requestFocus = useFocusRequest();
  const claimScroll = useScrollGesture();

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
  const moveHalfPage = useEffectEvent((direction: 1 | -1) =>
    moveBy(direction * Math.max(1, Math.floor(visibleRowCount / 2))),
  );
  const moveTo = useEffectEvent((index: number) => onSelect(index));
  const moveToLast = useEffectEvent(() => onSelect(items.length - 1));

  useBindings(
    () => ({
      enabled: focused && keysEnabled,
      commands: [
        { name: "rows.next", desc: "next row", run: () => moveBy(1) },
        { name: "rows.previous", desc: "previous row", run: () => moveBy(-1) },
        { name: "rows.next-page", desc: "next page", run: () => movePage(1) },
        { name: "rows.previous-page", desc: "previous page", run: () => movePage(-1) },
        { name: "rows.first", desc: "first row", run: () => moveTo(0) },
        { name: "rows.last", desc: "last row", run: () => moveToLast() },
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
    [focused, keysEnabled],
  );

  useBindings(
    () => ({
      enabled: focused && keysEnabled && halfPageKeys,
      commands: [
        { name: "rows.next-half-page", desc: "half page down", run: () => moveHalfPage(1) },
        { name: "rows.previous-half-page", desc: "half page up", run: () => moveHalfPage(-1) },
      ],
      bindings: [
        { key: "ctrl+d", cmd: "rows.next-half-page" },
        { key: "ctrl+u", cmd: "rows.previous-half-page" },
      ],
    }),
    [focused, keysEnabled, halfPageKeys],
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
        if (!claimScroll()) {
          return;
        }
        if (scroll?.direction === "down") {
          onSelect((index) => index + scroll.delta);
        } else if (scroll?.direction === "up") {
          onSelect((index) => index - scroll.delta);
        }
      }}
    >
      {visibleItems.map((item, offset) => (
        <box
          key={getKey(item)}
          onMouseDown={(event) => {
            if (event.button === MouseButton.LEFT) {
              requestFocus();
              onSelect(firstVisibleIndex + offset);
            }
          }}
        >
          <SelectedContext value={firstVisibleIndex + offset === selectedIndex}>
            {children(item)}
          </SelectedContext>
        </box>
      ))}
      {visibleRowCount > 0 && hiddenRowCount > 0 && (
        <text position="absolute" right={0} top={scrollThumbTop} fg={THEME.textMuted}>
          █
        </text>
      )}
    </box>
  );
}
