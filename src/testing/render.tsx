import type { CapturedFrame, CapturedSpan, CliRenderer } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import {
  registerDeadBindingWarnings,
  registerUnresolvedCommandWarnings,
} from "@opentui/keymap/addons";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot, flushSync } from "@opentui/react";
import { StrictMode } from "react";

import { RENDERER_CONFIG } from "#app/tui.tsx";
import { collapseWhitespace } from "#utils/text.ts";

import { selectedBackground } from "./screen.ts";

const WAIT_TIMEOUT_MS = 3000;
const WAIT_POLL_INTERVAL_MS = 10;

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
  root.render(
    <StrictMode>
      <KeymapProvider keymap={keymap}>{node}</KeymapProvider>
    </StrictMode>,
  );

  async function captureSpans() {
    await setup.renderer.idle();
    return setup.captureSpans();
  }

  async function waitUntil<T>(
    capture: () => T | undefined | Promise<T | undefined>,
    matches: (captured: T) => boolean,
    expected: string,
  ) {
    const deadline = performance.now() + WAIT_TIMEOUT_MS;

    while (performance.now() < deadline) {
      await setup.renderOnce();
      const captured = await capture();
      if (captured !== undefined && matches(captured)) {
        await runPendingEffects();
        return captured;
      }
      await Bun.sleep(WAIT_POLL_INTERVAL_MS);
    }
    throw new Error(
      `Waited ${WAIT_TIMEOUT_MS}ms for ${expected}. ` +
        `The last frame was:\n${setup.captureCharFrame()}`,
    );
  }

  function waitForFrame(
    predicate: (frame: string) => boolean,
    expected = `a frame matching ${describePredicate(predicate)}`,
  ) {
    return waitUntil(() => setup.captureCharFrame(), predicate, expected);
  }

  function waitForText(text: string) {
    return waitForFrame((frame) => frame.includes(text), `text ${JSON.stringify(text)}`);
  }

  async function captureFrame() {
    await setup.renderOnce();
    await runPendingEffects();
    return setup.captureCharFrame();
  }

  async function waitForSelection(text: string, { line }: SelectionOptions = {}) {
    const selected = await waitUntil(
      async () => firstSelectedLine(await captureSpans()),
      (selected) => selected.text.includes(text) && (line === undefined || selected.line === line),
      line === undefined
        ? `a selected row containing "${text}"`
        : `a selected row containing "${text}" on line ${line}`,
    );
    return selected.text;
  }

  // Moves the selection one row at a time toward the visible row containing `text`,
  // waiting for each step to render, so keys never outrun the deferred selection.
  async function selectRow(text: string) {
    let selected = await waitUntil(
      async () => firstSelectedLine(await captureSpans()),
      () => true,
      "a selected row",
    );
    while (!selected.text.includes(text)) {
      const frame = await captureSpans();
      const direction = nearestLine(frame, text, selected.line) < selected.line ? "up" : "down";
      const previous = selected.text;
      setup.mockInput.pressArrow(direction);
      selected = await waitUntil(
        async () => firstSelectedLine(await captureSpans()),
        (next) => next.text !== previous,
        `the selection to move ${direction} from "${previous}" toward "${text}"`,
      );
    }
    return selected.text;
  }

  return {
    mockInput: setup.mockInput,
    mockMouse: setup.mockMouse,
    resize: setup.resize,
    captureFrame,
    captureSpans,
    waitForFrame,
    waitForText,
    waitForSelection,
    selectRow,
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

function describePredicate(predicate: (frame: string) => boolean) {
  return predicate.name === "" ? predicate.toString() : predicate.name;
}

function runPendingEffects() {
  return new Promise((resolve) => setImmediate(resolve));
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

function lineText(spans: CapturedSpan[]) {
  return collapseWhitespace(spans.map((span) => span.text).join(""));
}

function firstSelectedLine({ lines }: CapturedFrame) {
  for (const [line, { spans }] of lines.entries()) {
    if (spans.some((span) => span.text.trim() !== "" && span.bg.equals(selectedBackground))) {
      return { line, text: lineText(spans) };
    }
  }
  return undefined;
}

// The line containing `text` closest to `from`, or the last line when no line contains it,
// so a row scrolled out of view below is reached by moving down.
function nearestLine({ lines }: CapturedFrame, text: string, from: number) {
  let nearest = lines.length;
  for (const [line, { spans }] of lines.entries()) {
    if (lineText(spans).includes(text) && Math.abs(line - from) < Math.abs(nearest - from)) {
      nearest = line;
    }
  }
  return nearest;
}
