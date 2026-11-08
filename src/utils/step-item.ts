import { wrapIndex } from "./wrap-index.ts";

export function stepItem<T>(items: readonly [T, ...T[]], current: T, step: 1 | -1): T {
  const index = items.indexOf(current);
  if (index === -1) {
    return step === 1 ? items[0] : items.at(-1)!;
  }
  return items[wrapIndex(index + step, items.length)]!;
}
