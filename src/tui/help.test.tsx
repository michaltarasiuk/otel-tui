import { expect, test } from "bun:test";

import { openTab, renderApp, search } from "#testing/app.tsx";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints, onList } from "#testing/screen.ts";
import { collapseWhitespace } from "#utils/text.ts";

test("lists every key of the focused page in a help overlay", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await openTab(app, "traces");
  app.mockInput.pressTab();
  await app.waitForFrame(onList);

  app.mockInput.pressKey("?");

  const frame = await app.waitForFrame((frame) => frame.includes("Keys"));
  for (const line of [
    "/ search",
    "s status",
    "shift+o reverse",
    "shift+tab previous region",
    "ctrl+l clear telemetry",
  ]) {
    expect(collapseWhitespace(frame)).toContain(line);
  }

  app.mockInput.pressEscape();
  await app.waitForFrame(
    (frame) => !frame.includes("Keys") && keyHints(frame).includes("/ search"),
  );
});

test("types ? into the search instead of opening help", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await openTab(app, "traces");
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  await search(app, "?");

  const frame = await app.waitForFrame((frame) => frame.includes("/?"));
  expect(frame).not.toContain("Keys");
});
