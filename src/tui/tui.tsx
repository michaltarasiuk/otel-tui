import type { DuckDBConnection } from "@duckdb/node-api";
import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";

import { App } from "./app.tsx";

export interface TuiOptions {
  receiver: {
    url: string;
    connection: DuckDBConnection;
  };
}

export async function startTui({ receiver }: TuiOptions) {
  const renderer = await createCliRenderer();
  const keymap = createDefaultOpenTuiKeymap(renderer);

  renderer.keyInput.addListener("keypress", (event) => {
    if (event.name === "`") {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(
    <KeymapProvider keymap={keymap}>
      <App receiver={receiver} />
    </KeymapProvider>,
  );

  return {
    renderer,
  };
}
