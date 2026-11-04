import { type CapturedFrame, RGBA } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import {
  registerDeadBindingWarnings,
  registerUnresolvedCommandWarnings,
} from "@opentui/keymap/addons";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot, flushSync } from "@opentui/react";

import { THEME } from "../tui/theme.ts";
import { RENDERER_CONFIG } from "../tui/tui.tsx";
import { collapseWhitespace } from "../utils/text.ts";

const FRAME_TIMEOUT_MS = 3000;
const FRAME_POLL_INTERVAL_MS = 10;
const BINDINGS_REGISTERED_AFTER_COMMIT_MS = 10;

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

  const keymap = createDefaultOpenTuiKeymap(setup.renderer);
  registerUnresolvedCommandWarnings(keymap);
  registerDeadBindingWarnings(keymap);
  const keymapDiagnostics: string[] = [];
  keymap.on("warning", ({ message }) => keymapDiagnostics.push(message));
  keymap.on("error", ({ message }) => keymapDiagnostics.push(message));

  const root = createRoot(setup.renderer);
  root.render(<KeymapProvider keymap={keymap}>{node}</KeymapProvider>);

  async function waitUntil<T>(capture: () => T, matches: (captured: T) => boolean) {
    const deadline = performance.now() + FRAME_TIMEOUT_MS;

    while (performance.now() < deadline) {
      await setup.renderOnce();
      const captured = capture();
      if (matches(captured)) {
        await Bun.sleep(BINDINGS_REGISTERED_AFTER_COMMIT_MS);
        return captured;
      }
      await Bun.sleep(FRAME_POLL_INTERVAL_MS);
    }
    throw new Error(
      `No frame matched within ${FRAME_TIMEOUT_MS}ms. ` +
        `The last frame was:\n${setup.captureCharFrame()}`,
    );
  }

  function waitForFrame(predicate: (frame: string) => boolean) {
    return waitUntil(() => setup.captureCharFrame(), predicate);
  }

  async function waitForSelection(text: string, { line }: SelectionOptions = {}) {
    const [selected] = await waitUntil(
      () => selectedLines(setup.captureSpans()),
      ([first]) =>
        first !== undefined &&
        first.text.includes(text) &&
        (line === undefined || first.line === line),
    );
    return selected?.text;
  }

  return {
    mockInput: setup.mockInput,
    mockMouse: setup.mockMouse,
    resize: setup.resize,
    captureSpans: setup.captureSpans,
    waitForFrame,
    waitForSelection,
    async [Symbol.asyncDispose]() {
      flushSync(() => root.unmount());
      await setup.dispose();
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

function selectedLines({ lines }: CapturedFrame) {
  return lines.flatMap(({ spans }, line) =>
    spans.some((span) => span.bg.equals(selectedBackground))
      ? [{ line, text: collapseWhitespace(spans.map((span) => span.text).join("")) }]
      : [],
  );
}
