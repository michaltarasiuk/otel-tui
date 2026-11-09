import { jest, onTestFinished, setSystemTime } from "bun:test";

import { SECOND_MS } from "#utils/time-units.ts";

const BASE_TIME = Date.parse("2026-10-28T12:00:00.000Z");

export function at(ms: number) {
  return new Date(BASE_TIME + ms);
}

export function atSecond(seconds: number) {
  return at(seconds * SECOND_MS);
}

export function fakeClock(start: Date) {
  let now = start;
  setSystemTime(now);
  onTestFinished(() => setSystemTime());

  return {
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
      setSystemTime(now);
    },
  };
}

export function fakeTimers() {
  jest.useFakeTimers();
  onTestFinished(() => jest.useRealTimers());
}
