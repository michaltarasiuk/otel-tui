import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app.tsx";

export interface TuiOptions {
  receiverUrl: string;
}

export interface Tui {
  readonly renderer: CliRenderer;
  readonly exited: Promise<void>;
}

export async function startTui({ receiverUrl }: TuiOptions): Promise<Tui> {
  const renderer = await createCliRenderer();

  const { promise: exited, resolve } = Promise.withResolvers<void>();
  renderer.once("destroy", () => resolve(renderer.closed));

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "`") {
      renderer.console.toggle();
    }
  });

  createRoot(renderer).render(<App receiverUrl={receiverUrl} />);

  return {
    renderer,
    exited,
  };
}
