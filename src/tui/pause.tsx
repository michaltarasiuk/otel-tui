import { focusManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { Key } from "./components/key-hints.tsx";

function isPaused() {
  return !focusManager.isFocused();
}

export function usePaused() {
  return useSyncExternalStore(
    (onChange) => focusManager.subscribe(() => onChange()),
    () => isPaused(),
  );
}

export function PauseKey() {
  const paused = usePaused();

  return (
    <Key name="p" onPress={() => focusManager.setFocused(paused)}>
      {paused ? "resume" : "pause"}
    </Key>
  );
}
