import { focusManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { Key } from "./key-hints.tsx";

function subscribe(onChange: () => void) {
  return focusManager.subscribe(() => onChange());
}

function isPaused() {
  return !focusManager.isFocused();
}

export function usePaused() {
  return useSyncExternalStore(subscribe, () => isPaused());
}

export function PauseKey() {
  const paused = usePaused();

  return (
    <Key name="p" onPress={() => focusManager.setFocused(paused)}>
      {paused ? "resume" : "pause"}
    </Key>
  );
}
