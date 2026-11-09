import { type SetStateAction, useState } from "react";

import { clamp } from "#utils/clamp.ts";

export function useSelection<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  initialKey?: string,
) {
  const [selectedKey, setSelectedKey] = useState(initialKey);

  function indexOf(key: string | undefined) {
    return Math.max(
      0,
      items.findIndex((item) => getKey(item) === key),
    );
  }

  function select(action: SetStateAction<number>) {
    setSelectedKey((key) => {
      const index = typeof action === "function" ? action(indexOf(key)) : action;
      const item = items[clamp(index, 0, items.length - 1)];
      return item === undefined ? key : getKey(item);
    });
  }

  function selectKey(key: string) {
    setSelectedKey(key);
  }

  return [indexOf(selectedKey), select, selectKey] as const;
}
