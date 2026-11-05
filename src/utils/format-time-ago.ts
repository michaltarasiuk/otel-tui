import { HOUR_MS, MINUTE_MS, SECOND_MS } from "./time-units.ts";

export function formatTimeAgo(ageMs: number) {
  let timeAgo: string;
  if (ageMs < SECOND_MS) {
    timeAgo = "just now";
  } else if (ageMs < MINUTE_MS) {
    timeAgo = `${Math.floor(ageMs / SECOND_MS)}s ago`;
  } else if (ageMs < HOUR_MS) {
    timeAgo = `${Math.floor(ageMs / MINUTE_MS)}m ago`;
  } else {
    timeAgo = `${Math.floor(ageMs / HOUR_MS)}h ago`;
  }
  return timeAgo;
}
