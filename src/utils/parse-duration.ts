import { HOUR_MS, MINUTE_MS, SECOND_MS } from "./time-units.ts";

const UNIT_MS: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  µs: 1e-3,
  ms: 1,
  s: SECOND_MS,
  m: MINUTE_MS,
  h: HOUR_MS,
};

const DURATION = /^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)?$/;

export function parseDuration(text: string) {
  const match = DURATION.exec(text);
  if (match?.[1] === undefined) {
    return undefined;
  }
  return Number(match[1]) * (UNIT_MS[match[2] ?? "ms"] ?? 1);
}
