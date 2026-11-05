import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { Fragment, useRef, useState } from "react";

import { IGNORE_CONTENT_SIZE } from "#tui/theme/flex.ts";
import { THEME } from "#tui/theme/theme.ts";
import { clamp } from "#utils/clamp.ts";

import { useFocused } from "./focus.tsx";
import type { useListState } from "./use-list-state.ts";

interface WindowedRowsProps<T> {
  list: ReturnType<typeof useListState<T>>;
  children: (item: T, selected: boolean) => React.ReactNode;
}

export function WindowedRows<T>({ list, children }: WindowedRowsProps<T>) {
  const { items, getKey, selectedIndex } = list;

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

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "rows.next",
          run() {
            list.moveBy(1);
          },
        },
        {
          name: "rows.previous",
          run() {
            list.moveBy(-1);
          },
        },
        {
          name: "rows.next-page",
          run() {
            list.moveBy(visibleRowCount);
          },
        },
        {
          name: "rows.previous-page",
          run() {
            list.moveBy(-visibleRowCount);
          },
        },
        {
          name: "rows.first",
          run() {
            list.selectIndex(0);
          },
        },
        {
          name: "rows.last",
          run() {
            list.selectIndex(items.length - 1);
          },
        },
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
    [focused, list, visibleRowCount, items.length],
  );

  return (
    <box
      ref={rowsRef}
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      maxHeight={items.length}
      overflow="hidden"
      onSizeChange={() => setVisibleRowCount(rowsRef.current?.height ?? 0)}
      onMouseScroll={({ scroll }) => {
        if (scroll?.direction === "down") {
          list.moveBy(scroll.delta);
        } else if (scroll?.direction === "up") {
          list.moveBy(-scroll.delta);
        }
      }}
    >
      {visibleItems.map((item, offset) => (
        <Fragment key={getKey(item)}>
          {children(item, firstVisibleIndex + offset === selectedIndex)}
        </Fragment>
      ))}
      {visibleRowCount > 0 && hiddenRowCount > 0 && (
        <text position="absolute" right={0} top={scrollThumbTop} fg={THEME.textMuted}>
          █
        </text>
      )}
    </box>
  );
}
