import { CliRenderEvents, type CliRenderer } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useSyncExternalStore } from "react";

interface EditingStore {
  subscribe: (onChange: () => void) => () => void;
  isEditing: () => boolean;
}

const stores = new WeakMap<CliRenderer, EditingStore>();

function createEditingStore(renderer: CliRenderer): EditingStore {
  return {
    subscribe(onChange) {
      renderer.on(CliRenderEvents.FOCUSED_EDITOR, onChange);
      return () => {
        renderer.off(CliRenderEvents.FOCUSED_EDITOR, onChange);
      };
    },
    isEditing() {
      return renderer.currentFocusedEditor !== null;
    },
  };
}

function editingStore(renderer: CliRenderer) {
  const existing = stores.get(renderer);
  if (existing !== undefined) {
    return existing;
  }
  const store = createEditingStore(renderer);
  stores.set(renderer, store);
  return store;
}

export function useEditing() {
  const renderer = useRenderer();
  const store = editingStore(renderer);

  return useSyncExternalStore(store.subscribe, () => store.isEditing());
}
