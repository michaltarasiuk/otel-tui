import { formatCount } from "./format-count.ts";

export function formatShownCount(shownCount: number, totalCount: number, noun: string) {
  const total = formatCount(totalCount, noun);
  return shownCount < totalCount ? `${shownCount.toLocaleString()} of ${total}` : total;
}
