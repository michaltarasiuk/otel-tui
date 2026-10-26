import type { BoxRenderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/react";
import { Fragment, useRef, useState } from "react";

import { clamp } from "../utils/clamp.ts";
import { IGNORE_CONTENT_SIZE } from "./flex.ts";
import { useFocused } from "./focus.tsx";
import { ScrollIndicator } from "./scroll-indicator.tsx";

interface WindowedRowsProps<T> {
  rows: T[];
  selectedIndex: number;
  getKey: (row: T) => string;
  renderRow: (row: T, selected: boolean) => React.ReactNode;
  onSelect: (index: number) => void;
}

export function WindowedRows<T>({
  rows,
  selectedIndex,
  getKey,
  renderRow,
  onSelect,
}: WindowedRowsProps<T>) {
  const focused = useFocused();

  const [visibleRowCount, setVisibleRowCount] = useState(0);

  const rowsRef = useRef<BoxRenderable>(null);

  const firstVisibleIndex = clamp(
    selectedIndex - Math.floor(visibleRowCount / 2),
    0,
    Math.max(0, rows.length - visibleRowCount),
  );

  function selectRowAt(index: number) {
    onSelect(clamp(index, 0, rows.length - 1));
  }

  useBindings(
    () => ({
      enabled: focused,
      commands: [
        {
          name: "rows.next",
          run() {
            selectRowAt(selectedIndex + 1);
          },
        },
        {
          name: "rows.previous",
          run() {
            selectRowAt(selectedIndex - 1);
          },
        },
        {
          name: "rows.next-page",
          run() {
            selectRowAt(selectedIndex + visibleRowCount);
          },
        },
        {
          name: "rows.previous-page",
          run() {
            selectRowAt(selectedIndex - visibleRowCount);
          },
        },
        {
          name: "rows.first",
          run() {
            selectRowAt(0);
          },
        },
        {
          name: "rows.last",
          run() {
            selectRowAt(rows.length - 1);
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
    [focused, rows.length, selectedIndex, visibleRowCount, onSelect],
  );

  return (
    <box
      ref={rowsRef}
      flexGrow={1}
      flexBasis={IGNORE_CONTENT_SIZE}
      maxHeight={rows.length}
      overflow="hidden"
      onSizeChange={() => setVisibleRowCount(rowsRef.current?.height ?? 0)}
      onMouseScroll={({ scroll }) => {
        if (scroll?.direction === "down") {
          selectRowAt(selectedIndex + scroll.delta);
        } else if (scroll?.direction === "up") {
          selectRowAt(selectedIndex - scroll.delta);
        }
      }}
    >
      {rows.slice(firstVisibleIndex, firstVisibleIndex + visibleRowCount).map((row, offset) => (
        <Fragment key={getKey(row)}>
          {renderRow(row, firstVisibleIndex + offset === selectedIndex)}
        </Fragment>
      ))}
      <ScrollIndicator
        firstVisibleIndex={firstVisibleIndex}
        visibleRowCount={visibleRowCount}
        rowCount={rows.length}
      />
    </box>
  );
}
