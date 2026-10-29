import { formatCount } from "./format-count.ts";

export function formatShownCount(shownCount: number, totalCount: number, unit: string) {
  const total = formatCount(totalCount, unit);
  return shownCount < totalCount ? `${shownCount.toLocaleString()} of ${total}` : total;
}
