import { type CapturedFrame, type CliRenderer, RGBA } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import {
  registerDeadBindingWarnings,
  registerUnresolvedCommandWarnings,
} from "@opentui/keymap/addons";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot, flushSync } from "@opentui/react";

import { THEME } from "../tui/theme/theme.ts";
import { RENDERER_CONFIG } from "../tui/tui.tsx";
import { collapseWhitespace } from "../utils/text.ts";

const WAIT_TIMEOUT_MS = 3000;
const WAIT_POLL_INTERVAL_MS = 10;
const WAIT_FOR_BINDINGS_MS = 10;

const SCROLLBAR_CHARACTERS = /[\u2580-\u259F]/g;

export const BRAILLE_DOTS = /[\u2801-\u28FF]/;

const FOOTER_LINES = 1;

export const selectedBackground = RGBA.fromHex(THEME.backgroundSelected);

interface RenderOptions {
  width: number;
  height: number;
}

interface SelectionOptions {
  line?: number;
}

export async function render(node: React.ReactNode, { width, height }: RenderOptions) {
  const setup = await createTestRenderer({
    ...RENDERER_CONFIG,
    width,
    height,
    kittyKeyboard: true,
  });
  const { keymap, diagnostics: keymapDiagnostics } = createDiagnosedKeymap(setup.renderer);

  const root = createRoot(setup.renderer);
  root.render(<KeymapProvider keymap={keymap}>{node}</KeymapProvider>);

  async function waitUntil<T>(capture: () => T | undefined, matches: (captured: T) => boolean) {
    const deadline = performance.now() + WAIT_TIMEOUT_MS;

    while (performance.now() < deadline) {
      await setup.renderOnce();
      const captured = capture();
      if (captured !== undefined && matches(captured)) {
        await Bun.sleep(WAIT_FOR_BINDINGS_MS);
        return captured;
      }
      await Bun.sleep(WAIT_POLL_INTERVAL_MS);
    }
    throw new Error(
      `No frame matched within ${WAIT_TIMEOUT_MS}ms. ` +
        `The last frame was:\n${setup.captureCharFrame()}`,
    );
  }

  function waitForFrame(predicate: (frame: string) => boolean) {
    return waitUntil(() => setup.captureCharFrame(), predicate);
  }

  async function waitForSelection(text: string, { line }: SelectionOptions = {}) {
    const selected = await waitUntil(
      () => firstSelectedLine(setup.captureSpans()),
      (selected) => selected.text.includes(text) && (line === undefined || selected.line === line),
    );
    return selected.text;
  }

  return {
    mockInput: setup.mockInput,
    mockMouse: setup.mockMouse,
    resize: setup.resize,
    captureSpans: setup.captureSpans,
    waitForFrame,
    waitForSelection,
    async [Symbol.asyncDispose]() {
      try {
        flushSync(() => root.unmount());
      } finally {
        await setup.dispose();
      }
      if (keymapDiagnostics.length > 0) {
        throw new Error(`Keymap reported:\n${keymapDiagnostics.join("\n")}`);
      }
    },
  };
}

export function textLines(frame: string) {
  return frame
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter((line) => line !== "");
}

export function panelLines(frame: string) {
  const lines = textLines(frame.replace(SCROLLBAR_CHARACTERS, ""));
  const border = lines.findIndex((line) => line.startsWith("─"));
  return lines.slice(border + 1, -FOOTER_LINES);
}

function createDiagnosedKeymap(renderer: CliRenderer) {
  const keymap = createDefaultOpenTuiKeymap(renderer);
  registerUnresolvedCommandWarnings(keymap);
  registerDeadBindingWarnings(keymap);

  const diagnostics: string[] = [];
  keymap.on("warning", ({ message }) => diagnostics.push(message));
  keymap.on("error", ({ message }) => diagnostics.push(message));

  return { keymap, diagnostics };
}

function firstSelectedLine({ lines }: CapturedFrame) {
  for (const [line, { spans }] of lines.entries()) {
    if (spans.some((span) => span.bg.equals(selectedBackground))) {
      return { line, text: collapseWhitespace(spans.map((span) => span.text).join("")) };
    }
  }
  return undefined;
}
