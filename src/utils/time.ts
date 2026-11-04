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
  if (ageMs < 1000) {
    return "just now";
  }
  if (ageMs < 60 * 1000) {
    return `${Math.floor(ageMs / 1000)}s ago`;
  }
  if (ageMs < 60 * 60 * 1000) {
    return `${Math.floor(ageMs / (60 * 1000))}m ago`;
  }
  return `${Math.floor(ageMs / (60 * 60 * 1000))}h ago`;
}

export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new Error(`Duration must not be negative: ${ms}ms`);
  }
  const microseconds = Math.round(ms * 1000);
  if (microseconds < 1000) {
    return `${microseconds}µs`;
  }
  const milliseconds = Math.round(ms * 10) / 10;
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
