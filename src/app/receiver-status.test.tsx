import { expect, test } from "bun:test";

import { renderApp } from "#testing/app.tsx";
import { logsRequest } from "#testing/otlp.ts";
import { startTestReceiver } from "#testing/receiver.ts";
import { keyHints } from "#testing/screen.ts";

test("shows where the receiver listens beside the tabs", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);

  const frame = await app.waitForFrame((frame) => frame.includes("nothing received yet"));

  expect(frame.split("\n")[0]).toMatch(
    new RegExp(
      `^ Services +Traces +Metrics +Logs +nothing received yet · OTLP/HTTP ${new URL(receiver.httpUrl).host} · OTLP/gRPC ${new URL(receiver.grpcUrl).host} $`,
    ),
  );
  expect(keyHints(frame)).toBe("tab next region ? help");
});

test("counts the items received and says when the last arrived", async () => {
  await using receiver = await startTestReceiver();
  await using app = await renderApp(receiver);
  await app.waitForFrame((frame) => frame.includes("nothing received yet"));

  await receiver.sendHttp(
    "/v1/logs",
    logsRequest({
      service: "checkout",
      logs: [
        { time: new Date(0), body: "[PlaceOrder]" },
        { time: new Date(1), body: "payment went through" },
      ],
    }),
  );

  const frame = await app.waitForFrame((frame) => frame.includes("2 items received"));
  expect(frame.split("\n")[0]).toMatch(/2 items received (just now|\d+s ago) · OTLP\/HTTP/);
});
