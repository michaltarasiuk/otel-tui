import { formatInUnits, type Unit } from "./units.ts";

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const DURATION_UNITS: readonly [Unit, ...Unit[]] = [
  { suffix: "µs", size: 1e-3, digits: 0 },
  { suffix: "ms", size: 1, digits: 1 },
  { suffix: "s", size: SECOND_MS, digits: 2 },
];

const MS_PER_UNIT: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  µs: 1e-3,
  ms: 1,
  s: SECOND_MS,
  m: MINUTE_MS,
  h: HOUR_MS,
};

const DURATION = /^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)?$/;

const AGE_UNITS = [
  ["h", HOUR_MS],
  ["m", MINUTE_MS],
  ["s", SECOND_MS],
] as const;

export type Precision = "minute" | "second" | "millisecond";

export function formatDuration(ms: number) {
  if (ms < 0) {
    throw new RangeError(`Duration must not be negative: ${ms}ms`);
  }
  return formatInUnits(ms, DURATION_UNITS);
}

export function formatOffset(ms: number) {
  return ms < 0 ? `-${formatDuration(-ms)}` : `+${formatDuration(ms)}`;
}

export function parseDuration(text: string) {
  const [, amount, unit = "ms"] = DURATION.exec(text) ?? [];
  const size = MS_PER_UNIT[unit];
  return amount === undefined || size === undefined ? undefined : Number(amount) * size;
}

export function formatAgo(ms: number) {
  const unit = AGE_UNITS.find(([, size]) => ms >= size);
  if (unit === undefined) {
    return "just now";
  }
  const [suffix, size] = unit;
  return `${Math.floor(ms / size)}${suffix} ago`;
}

function pad(value: number, width = 2) {
  return String(value).padStart(width, "0");
}

export function formatTime(time: number, precision: Precision = "millisecond") {
  const date = new Date(time);
  const minute = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (precision === "minute") {
    return minute;
  }
  const second = `${minute}:${pad(date.getSeconds())}`;
  if (precision === "second") {
    return second;
  }
  return `${second}.${pad(date.getMilliseconds(), 3)}`;
}
