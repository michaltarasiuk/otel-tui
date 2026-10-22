import { useRenderer } from "@opentui/react";

import { useFlash } from "./status.tsx";

export function useCopy() {
  const renderer = useRenderer();
  const flash = useFlash();

  return (label: string, text: string) => {
    try {
      flash(
        renderer.copyToClipboardOSC52(text)
          ? `Copied ${label} ${text}`
          : "Clipboard is not supported by this terminal",
      );
    } catch (error) {
      flash(`Copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}
