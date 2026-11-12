import { type SetStateAction, useState } from "react";

import { clamp } from "#utils/number.ts";

export function useSelection<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  initialKey?: string,
) {
  const [selectedKey, setSelectedKey] = useState(initialKey);

  function indexOf(key: string | undefined) {
    const index = items.findIndex((item) => keyOf(item) === key);
    return Math.max(index, 0);
  }

  function select(action: SetStateAction<number>) {
    setSelectedKey((key) => {
      const index = typeof action === "function" ? action(indexOf(key)) : action;
      const item = items[clamp(index, 0, items.length - 1)];
      return item === undefined ? key : keyOf(item);
    });
  }

  return [indexOf(selectedKey), select, setSelectedKey] as const;
}
