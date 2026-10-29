export function formatCount(count: number, unit: string) {
  return `${count.toLocaleString()} ${unit}${count === 1 ? "" : "s"}`;
}
