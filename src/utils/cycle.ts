export type Step = 1 | -1;

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function cycle<T>(items: readonly [T, ...T[]], item: T, step: Step) {
  const index = items.indexOf(item);
  const entry = step === 1 ? -1 : items.length;
  const from = index === -1 ? entry : index;
  // wrap keeps the index inside the non-empty list
  return items[wrap(from + step, items.length)] as T;
}

export function findNextIndex<T>(
  items: readonly T[],
  index: number,
  step: Step,
  match: (item: T) => boolean,
) {
  for (let offset = 1; offset <= items.length; offset++) {
    const next = wrap(index + step * offset, items.length);
    // wrap keeps the index inside the list
    if (match(items[next] as T)) {
      return next;
    }
  }
  return index;
}
