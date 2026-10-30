export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new Error(`Duration must not be negative: ${ms}ms`);
  }
  const microseconds = Math.round(ms * 1000);
  if (microseconds < 1000) {
    return `${microseconds}µs`;
  }
  const tenthsOfMilliseconds = Math.round(ms * 10);
  if (tenthsOfMilliseconds < 10_000) {
    return `${(tenthsOfMilliseconds / 10).toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
