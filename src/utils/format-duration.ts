import { roundToTenths } from "./round-to-tenths.ts";
import { SECOND_MS } from "./time-units.ts";

export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new Error(`Duration must not be negative: ${ms}ms`);
  }
  const microseconds = Math.round(ms * 1000);
  const milliseconds = roundToTenths(ms);
  let duration: string;
  if (microseconds < 1000) {
    duration = `${microseconds}µs`;
  } else if (milliseconds < SECOND_MS) {
    duration = `${milliseconds.toFixed(1)}ms`;
  } else {
    duration = `${(ms / SECOND_MS).toFixed(2)}s`;
  }
  return duration;
}
