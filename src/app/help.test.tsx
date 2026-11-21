import { expect, test } from "bun:test";

import { renderApp } from "#testing/app.tsx";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints, onList } from "#testing/screen.ts";
import { collapseWhitespace } from "#utils/text.ts";

test("lists every key of the focused page in a help overlay", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.openTab("traces");
  app.mockInput.pressTab();
  await app.waitForFrame(onList);

  app.mockInput.pressKey("?");

  const frame = await app.waitForText("Keys");
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
  await app.openTab("traces");
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  await app.search("?");

  const frame = await app.waitForText("/?");
  expect(frame).not.toContain("Keys");
});

test("offers only the search's keys while typing a search", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.openTab("traces");
  app.mockInput.pressTab();
  await app.waitForFrame(onList);
  await app.search("cart");

  let frame = await app.waitForFrame((frame) => keyHints(frame).startsWith("/cart"));
  expect(keyHints(frame)).toEndWith("return apply escape clear");

  app.mockInput.pressTab();
  await app.mockInput.typeText("s");
  frame = await app.waitForFrame((frame) => keyHints(frame).startsWith("/carts"));
  expect(keyHints(frame)).toEndWith("return apply escape clear");
});
