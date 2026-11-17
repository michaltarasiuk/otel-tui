import { type BoxRenderable, MouseButton } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { useEffectEvent, useRef, useState } from "react";

import { clamp } from "#utils/number.ts";

import { useFocused, useFocusRequest, useKeysEnabled } from "./focus.tsx";
import { SelectedContext } from "./table.tsx";
import { THEME } from "./theme.ts";
import { useScrollGesture } from "./use-scroll-gesture.ts";
import type { Selection } from "./use-selection.ts";

interface RowsProps<T> {
  items: readonly T[];
  selection: Selection<T>;
  halfPageKeys?: boolean;
  children: (item: T) => React.ReactNode;
}

export function Rows<T>({ items, selection, halfPageKeys = false, children }: RowsProps<T>) {
  const focused = useFocused();
  const keysEnabled = useKeysEnabled();
  const claimScroll = useScrollGesture();

  const [measured, setMeasured] = useState({ height: items.length, itemCount: items.length });

  const visibleRowCount = measured.height < measured.itemCount ? measured.height : items.length;
  const hiddenRowCount = items.length - visibleRowCount;
  const halfPage = Math.max(1, Math.floor(visibleRowCount / 2));

  const firstVisibleIndex = clamp(
    selection.index - Math.floor(visibleRowCount / 2),
    0,
    hiddenRowCount,
  );
  const visibleItems = items.slice(firstVisibleIndex, firstVisibleIndex + visibleRowCount);
  const scrollThumbTop = Math.round((firstVisibleIndex / hiddenRowCount) * (visibleRowCount - 1));

  const moveBy = useEffectEvent((offset: number) => selection.move(offset));
  const movePage = useEffectEvent((direction: 1 | -1) => moveBy(direction * visibleRowCount));
  const moveHalfPage = useEffectEvent((direction: 1 | -1) => moveBy(direction * halfPage));
  const moveTo = useEffectEvent((index: number) => selection.select(index));
  const moveToLast = useEffectEvent(() => selection.select(items.length - 1));

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

  const rowsRef = useRef<BoxRenderable>(null);

  function measure() {
    setMeasured({ height: rowsRef.current?.height ?? 0, itemCount: items.length });
  }

  return (
    <box
      ref={rowsRef}
      flexGrow={1}
      flexBasis={0}
      maxHeight={items.length}
      overflow="hidden"
      onSizeChange={() => measure()}
      onMouseScroll={({ scroll }) => {
        if (!claimScroll() || scroll === undefined) {
          return;
        }
        if (scroll.direction === "down") {
          selection.move(scroll.delta);
        } else if (scroll.direction === "up") {
          selection.move(-scroll.delta);
        }
      }}
    >
      <box flexShrink={0} onSizeChange={() => measure()}>
        {visibleItems.map((item, offset) => (
          <Selectable
            key={selection.keyOf(item)}
            selection={selection}
            index={firstVisibleIndex + offset}
          >
            {children(item)}
          </Selectable>
        ))}
      </box>
      {visibleRowCount > 0 && hiddenRowCount > 0 && (
        <text position="absolute" right={0} top={scrollThumbTop} fg={THEME.textMuted}>
          █
        </text>
      )}
    </box>
  );
}

interface SelectableProps<T> {
  selection: Selection<T>;
  index: number;
  children: React.ReactNode;
}

export function Selectable<T>({ selection, index, children }: SelectableProps<T>) {
  const requestFocus = useFocusRequest();

  return (
    <box
      flexShrink={0}
      onMouseDown={(event) => {
        if (event.button === MouseButton.LEFT) {
          requestFocus();
          selection.select(index);
        }
      }}
    >
      <SelectedContext value={index === selection.index}>{children}</SelectedContext>
    </box>
  );
}
