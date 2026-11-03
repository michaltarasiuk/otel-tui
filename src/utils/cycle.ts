import { wrapIndex } from "./math.ts";

export function cycle<T>(items: readonly [T, ...T[]], current: T, step: 1 | -1) {
  const currentIndex = items.indexOf(current);
  return items[wrapIndex(currentIndex + step, items.length)] as T;
}
