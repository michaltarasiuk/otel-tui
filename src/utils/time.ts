export const MICROSECONDS_PER_MILLISECOND = 1000;
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

function timeOfDayFormat(options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...options,
  });
}

const timeOfDayFormats = {
  minute: timeOfDayFormat(),
  second: timeOfDayFormat({ second: "2-digit" }),
  millisecond: timeOfDayFormat({ second: "2-digit", fractionalSecondDigits: 3 }),
};

export function formatTime(
  timestamp: number,
  precision: keyof typeof timeOfDayFormats = "millisecond",
) {
  return timeOfDayFormats[precision].format(timestamp);
}

export function formatTimeAgo(ageMs: number) {
  if (ageMs < MILLISECONDS_PER_SECOND) {
    return "just now";
  }
  if (ageMs < MILLISECONDS_PER_MINUTE) {
    return `${Math.floor(ageMs / MILLISECONDS_PER_SECOND)}s ago`;
  }
  if (ageMs < MILLISECONDS_PER_HOUR) {
    return `${Math.floor(ageMs / MILLISECONDS_PER_MINUTE)}m ago`;
  }
  return `${Math.floor(ageMs / MILLISECONDS_PER_HOUR)}h ago`;
}

export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new Error(`Duration must not be negative: ${ms}ms`);
  }
  const microseconds = Math.round(ms * MICROSECONDS_PER_MILLISECOND);
  if (microseconds < MICROSECONDS_PER_MILLISECOND) {
    return `${microseconds}µs`;
  }
  const milliseconds = Math.round(ms * 10) / 10;
  if (milliseconds < MILLISECONDS_PER_SECOND) {
    return `${milliseconds.toFixed(1)}ms`;
  }
  return `${(ms / MILLISECONDS_PER_SECOND).toFixed(2)}s`;
}
