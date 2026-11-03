export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}
