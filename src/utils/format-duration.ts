import { roundToTenths } from "./round-to-tenths.ts";
import { SECOND_MS } from "./time-units.ts";

export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new Error(`Duration must not be negative: ${ms}ms`);
  }
  const microseconds = Math.round(ms * 1000);
  if (microseconds < 1000) {
    return `${microseconds}µs`;
  }
  const milliseconds = roundToTenths(ms);
  if (milliseconds < SECOND_MS) {
    return `${milliseconds.toFixed(1)}ms`;
  }
  return `${(ms / SECOND_MS).toFixed(2)}s`;
}
