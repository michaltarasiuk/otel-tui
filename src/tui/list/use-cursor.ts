import { useState } from "react";

const PAGE_SIZE = 10;

export type Cursor<T> = ReturnType<typeof useCursor<T>>;

// Tracks the selection by key, so it stays on the same item when the list
// reorders or grows.
export function useCursor<T>(items: readonly T[], keyOf: (item: T) => string) {
  const [selectedKey, setSelectedKey] = useState<string>();
  const index = Math.max(
    0,
    items.findIndex((item) => keyOf(item) === selectedKey),
  );

  function moveTo(target: number) {
    const item = items[Math.min(Math.max(target, 0), items.length - 1)];
    if (item !== undefined) {
      setSelectedKey(keyOf(item));
    }
  }

  return {
    index,
    selected: items[index],
    // True until something is selected explicitly, or after reset().
    following: selectedKey === undefined,
    moveBy: (delta: number) => moveTo(index + delta),
    moveTo,
    select: (key: string) => setSelectedKey(key),
    // Returns to the first item and keeps following it as items are added.
    reset: () => setSelectedKey(undefined),
  };
}

export function cursorBindings(cursor: Cursor<unknown>) {
  return [
    { key: "up", cmd: () => cursor.moveBy(-1), desc: "move" },
    { key: "k", cmd: () => cursor.moveBy(-1) },
    { key: "down", cmd: () => cursor.moveBy(1), desc: "move" },
    { key: "j", cmd: () => cursor.moveBy(1) },
    { key: "pageup", cmd: () => cursor.moveBy(-PAGE_SIZE) },
    { key: "pagedown", cmd: () => cursor.moveBy(PAGE_SIZE) },
    { key: "g", cmd: () => cursor.reset() },
    { key: "home", cmd: () => cursor.reset() },
    { key: "shift+g", cmd: () => cursor.moveTo(Infinity) },
    { key: "end", cmd: () => cursor.moveTo(Infinity) },
  ];
}
