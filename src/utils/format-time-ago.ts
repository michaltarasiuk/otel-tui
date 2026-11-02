import {
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_SECOND,
} from "./time-units.ts";

export function formatTimeAgo(ms: number) {
  if (ms < MILLISECONDS_PER_SECOND) {
    return "just now";
  }
  if (ms < MILLISECONDS_PER_MINUTE) {
    return `${Math.floor(ms / MILLISECONDS_PER_SECOND)}s ago`;
  }
  if (ms < MILLISECONDS_PER_HOUR) {
    return `${Math.floor(ms / MILLISECONDS_PER_MINUTE)}m ago`;
  }
  return `${Math.floor(ms / MILLISECONDS_PER_HOUR)}h ago`;
}
