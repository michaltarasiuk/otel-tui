import { useState } from "react";

import { clamp, wrapIndex } from "../utils/math.ts";

interface ListStateOptions<T> {
  items: T[];
  getKey: (item: T) => string;
  initialSelectedKey?: string | undefined;
}

export function useListState<T>({ items, getKey, initialSelectedKey }: ListStateOptions<T>) {
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);

  function indexOf(key: string | undefined) {
    return Math.max(
      0,
      items.findIndex((item) => getKey(item) === key),
    );
  }

  function select(pick: (selectedIndex: number) => T | undefined) {
    setSelectedKey((key) => {
      const item = pick(indexOf(key));
      return item === undefined ? key : getKey(item);
    });
  }

  function selectMatching(step: 1 | -1, predicate: (item: T) => boolean) {
    select((from) => {
      for (let distance = 1; distance <= items.length; distance++) {
        const item = items[wrapIndex(from + step * distance, items.length)];
        if (item !== undefined && predicate(item)) {
          return item;
        }
      }
      return undefined;
    });
  }

  const selectedIndex = indexOf(selectedKey);

  return {
    items,
    getKey,
    selectedIndex,
    selectedItem: items[selectedIndex],
    selectIndex(index: number) {
      select(() => items[clamp(index, 0, items.length - 1)]);
    },
    moveBy(offset: number) {
      select((from) => items[clamp(from + offset, 0, items.length - 1)]);
    },
    selectNext(predicate: (item: T) => boolean) {
      selectMatching(1, predicate);
    },
    selectPrevious(predicate: (item: T) => boolean) {
      selectMatching(-1, predicate);
    },
  };
}
