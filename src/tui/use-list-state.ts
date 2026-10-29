import { useState } from "react";

import { clamp } from "../utils/clamp.ts";

interface ListStateOptions<T> {
  items: T[];
  getKey: (item: T) => string;
}

export function useListState<T>({ items, getKey }: ListStateOptions<T>) {
  const [selectedKey, setSelectedKey] = useState<string>();

  function indexOf(key: string | undefined) {
    return Math.max(
      0,
      items.findIndex((item) => getKey(item) === key),
    );
  }

  function itemAt(index: number) {
    return items[clamp(index, 0, items.length - 1)];
  }

  function select(pick: (selectedIndex: number) => T | undefined) {
    setSelectedKey((selectedKey) => {
      const item = pick(indexOf(selectedKey));
      return item === undefined ? selectedKey : getKey(item);
    });
  }

  const selectedIndex = indexOf(selectedKey);

  return {
    items,
    getKey,
    selectedIndex,
    selectedItem: items[selectedIndex],
    selectIndex(index: number) {
      select(() => itemAt(index));
    },
    moveBy(offset: number) {
      select((current) => itemAt(current + offset));
    },
    selectNext(predicate: (item: T) => boolean) {
      select(
        (current) =>
          items.find((item, index) => index > current && predicate(item)) ??
          items.find((item) => predicate(item)),
      );
    },
    selectPrevious(predicate: (item: T) => boolean) {
      select(
        (current) =>
          items.findLast((item, index) => index < current && predicate(item)) ??
          items.findLast((item) => predicate(item)),
      );
    },
  };
}
