import type { CliRenderer } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useId } from "react";

export const GESTURE_PAUSE_MS = 150;

interface Gesture {
  owner: string;
  lastScrollAt: number;
}

const gestures = new WeakMap<CliRenderer, Gesture>();

export function useScrollGesture() {
  const renderer = useRenderer();
  const owner = useId();

  return function claim() {
    const now = Date.now();
    const gesture = gestures.get(renderer);
    if (gesture !== undefined) {
      const sinceLastScroll = now - gesture.lastScrollAt;
      if (sinceLastScroll <= GESTURE_PAUSE_MS) {
        gesture.lastScrollAt = now;
        return gesture.owner === owner;
      }
    }
    gestures.set(renderer, { owner, lastScrollAt: now });
    return true;
  };
}
