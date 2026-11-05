export function previousItem<T>(items: readonly [T, ...T[]], current: T): T {
  const index = items.indexOf(current);
  return items.at((index === -1 ? items.length : index) - 1)!;
}
