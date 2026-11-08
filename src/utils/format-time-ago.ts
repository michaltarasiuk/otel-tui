import { HOUR_MS, MINUTE_MS, SECOND_MS } from "./time-units.ts";

export function formatTimeAgo(ageMs: number) {
  if (ageMs < SECOND_MS) {
    return "just now";
  }
  if (ageMs < MINUTE_MS) {
    return `${Math.floor(ageMs / SECOND_MS)}s ago`;
  }
  if (ageMs < HOUR_MS) {
    return `${Math.floor(ageMs / MINUTE_MS)}m ago`;
  }
  return `${Math.floor(ageMs / HOUR_MS)}h ago`;
}
