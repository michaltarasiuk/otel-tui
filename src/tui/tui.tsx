import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "./app.tsx";

export interface TuiOptions {
  receiverUrl: string;
}

export async function startTui({ receiverUrl }: TuiOptions) {
  const renderer = await createCliRenderer();

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`") {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(<App receiverUrl={receiverUrl} />);

  return {
    renderer,
  };
}
