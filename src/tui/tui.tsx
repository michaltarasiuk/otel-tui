import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";

import { App } from "./app.tsx";

const FOCUS_CONTROLLED_BY_APP = true;

export interface TuiOptions {
  receiverUrl: string;
}

export async function startTui({ receiverUrl }: TuiOptions) {
  const renderer = await createCliRenderer({
    autoFocus: !FOCUS_CONTROLLED_BY_APP,
  });
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
