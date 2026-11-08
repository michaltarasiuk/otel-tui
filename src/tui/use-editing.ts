import { CliRenderEvents } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useSyncExternalStore } from "react";

export function useEditing() {
  const renderer = useRenderer();

  return useSyncExternalStore(
    (onChange) => {
      renderer.on(CliRenderEvents.FOCUSED_EDITOR, onChange);
      return () => {
        renderer.off(CliRenderEvents.FOCUSED_EDITOR, onChange);
      };
    },
    () => renderer.currentFocusedEditor !== null,
  );
}
