export function toggle<T>(set: ReadonlySet<T>, value: T) {
  const next = new Set(set);
  if (!next.delete(value)) {
    next.add(value);
  }
  return next;
}
