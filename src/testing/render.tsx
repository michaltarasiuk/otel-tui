import { type CapturedFrame, RGBA } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot, flushSync } from "@opentui/react";

import { THEME } from "../tui/theme.ts";
import { collapseSpaces } from "../utils/collapse-spaces.ts";

const FRAME_TIMEOUT_MS = 3000;
const FRAME_POLL_INTERVAL_MS = 10;
const BINDINGS_REGISTERED_AFTER_COMMIT_MS = 10;
const FOCUS_CONTROLLED_BY_APP = true;
const SELECTED_BACKGROUND = RGBA.fromHex(THEME.backgroundSelected);
const SCROLLBAR_GLYPHS = /[\u2580-\u259F]/g;
const FOOTER_LINES = 1;

interface RenderOptions {
  width: number;
  height: number;
}

export async function render(node: React.ReactNode, { width, height }: RenderOptions) {
  const setup = await createTestRenderer({
    width,
    height,
    kittyKeyboard: true,
    autoFocus: !FOCUS_CONTROLLED_BY_APP,
  });
  const keymap = createDefaultOpenTuiKeymap(setup.renderer);
  const root = createRoot(setup.renderer);
  root.render(<KeymapProvider keymap={keymap}>{node}</KeymapProvider>);

  async function waitUntil<T>(capture: () => T, matches: (captured: T) => boolean) {
    const deadline = performance.now() + FRAME_TIMEOUT_MS;
    do {
      await setup.renderOnce();
      const captured = capture();
      if (matches(captured)) {
        await Bun.sleep(BINDINGS_REGISTERED_AFTER_COMMIT_MS);
        return captured;
      }
      await Bun.sleep(FRAME_POLL_INTERVAL_MS);
    } while (performance.now() < deadline);
    throw new Error(
      `No frame matched within ${FRAME_TIMEOUT_MS}ms. ` +
        `The last frame was:\n${setup.captureCharFrame()}`,
    );
  }

  function waitForFrame(predicate: (frame: string) => boolean) {
    return waitUntil(() => setup.captureCharFrame(), predicate);
  }

  async function waitForSelection(text: string, { line }: { line?: number } = {}) {
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
    },
  };
}

export function textLines(frame: string) {
  return frame
    .split("\n")
    .map((line) => collapseSpaces(line))
    .filter((line) => line !== "");
}

export function panelLines(frame: string) {
  const lines = textLines(frame.replace(SCROLLBAR_GLYPHS, ""));
  const border = lines.findIndex((line) => line.startsWith("─"));
  return lines.slice(border + 1, -FOOTER_LINES);
}

function selectedLines({ lines }: CapturedFrame) {
  return lines
    .map(({ spans }, index) => ({
      line: index,
      text: collapseSpaces(spans.map((span) => span.text).join("")),
      selected: spans.some((span) => span.bg.equals(SELECTED_BACKGROUND)),
    }))
    .filter(({ selected }) => selected);
}
