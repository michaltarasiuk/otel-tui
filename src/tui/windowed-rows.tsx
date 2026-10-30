import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { Fragment, useRef, useState } from "react";

import { clamp } from "../utils/clamp.ts";
import { IGNORE_CONTENT_SIZE } from "./flex.ts";
import { useFocused } from "./focus.tsx";
import { ScrollIndicator } from "./scroll-indicator.tsx";
import type { useListState } from "./use-list-state.ts";

interface WindowedRowsProps<T> {
  state: ReturnType<typeof useListState<T>>;
  children: (item: T, selected: boolean) => React.ReactNode;
}

export function WindowedRows<T>({ state, children }: WindowedRowsProps<T>) {
  const { items, getKey, selectedIndex } = state;

  const focused = useFocused();

  const [visibleRowCount, setVisibleRowCount] = useState(0);

  const rowsRef = useRef<BoxRenderable>(null);

  const firstVisibleIndex = clamp(
    selectedIndex - Math.floor(visibleRowCount / 2),
    0,
    items.length - visibleRowCount,
  );

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "rows.next",
          run() {
            state.moveBy(1);
          },
        },
        {
          name: "rows.previous",
          run() {
            state.moveBy(-1);
          },
        },
        {
          name: "rows.next-page",
          run() {
            state.moveBy(visibleRowCount);
          },
        },
        {
          name: "rows.previous-page",
          run() {
            state.moveBy(-visibleRowCount);
          },
        },
        {
          name: "rows.first",
          run() {
            state.selectIndex(0);
          },
        },
        {
          name: "rows.last",
          run() {
            state.selectIndex(items.length - 1);
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
    [focused, state, visibleRowCount, items.length],
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
          state.moveBy(scroll.delta);
        } else if (scroll?.direction === "up") {
          state.moveBy(-scroll.delta);
        }
      }}
    >
      {items.slice(firstVisibleIndex, firstVisibleIndex + visibleRowCount).map((item, offset) => (
        <Fragment key={getKey(item)}>
          {children(item, firstVisibleIndex + offset === selectedIndex)}
        </Fragment>
      ))}
      <ScrollIndicator
        firstVisibleIndex={firstVisibleIndex}
        visibleRowCount={visibleRowCount}
        rowCount={items.length}
      />
    </box>
  );
}
