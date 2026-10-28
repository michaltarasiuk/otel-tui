import { wrapIndex } from "./wrap-index.ts";

export function cycle<T>(items: readonly [T, ...T[]], current: T, step: 1 | -1) {
  return items[wrapIndex(items.indexOf(current) + step, items.length)] as T;
}
