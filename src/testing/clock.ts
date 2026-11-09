import { SECOND_MS } from "#utils/time-units.ts";

const BASE_TIME = Date.parse("2026-10-28T12:00:00.000Z");

export function at(ms: number) {
  return new Date(BASE_TIME + ms);
}

export function atSecond(seconds: number) {
  return at(seconds * SECOND_MS);
}
