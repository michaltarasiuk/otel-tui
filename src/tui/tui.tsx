import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";

import { App } from "./app.tsx";

export interface TuiOptions {
  receiverUrl: string;
}

export async function startTui({ receiverUrl }: TuiOptions) {
  // Clicks would otherwise move focus behind the App's back and desync its focus state.
  const renderer = await createCliRenderer({ autoFocus: false });
  const keymap = createDefaultOpenTuiKeymap(renderer);

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`") {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(
    <KeymapProvider keymap={keymap}>
      <App receiverUrl={receiverUrl} />
    </KeymapProvider>,
  );

  return {
    renderer,
  };
}
