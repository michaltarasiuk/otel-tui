export function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}
