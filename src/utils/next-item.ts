export function nextItem<T>(items: readonly [T, ...T[]], current: T): T {
  return items.at((items.indexOf(current) + 1) % items.length)!;
}
