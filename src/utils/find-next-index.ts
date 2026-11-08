import { wrapIndex } from "./wrap-index.ts";

export function findNextIndex<T>(
  items: readonly T[],
  from: number,
  step: 1 | -1,
  predicate: (item: T) => boolean,
) {
  for (let distance = 1; distance <= items.length; distance++) {
    const index = wrapIndex(from + step * distance, items.length);
    const item = items[index];
    if (item !== undefined && predicate(item)) {
      return index;
    }
  }
  return from;
}
