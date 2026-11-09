import { type AppOptions, renderPage } from "./app.tsx";
import { at } from "./clock.ts";
import { logsRequest, SEVERITY_NUMBER, tracesRequest } from "./otlp.ts";
import type { TestReceiver } from "./receiver.ts";
import { tableRows } from "./screen.ts";
import { chargeSpanId, checkoutTraceId, PLACE_ORDER, placeOrderSpanId } from "./traces.ts";

export const otlpLogs = logsRequest(
  {
    service: "checkout",
    attributes: { "host.name": "colima" },
    scope: { name: "checkout" },
    logs: [
      {
        time: at(0),
        severityNumber: SEVERITY_NUMBER.info,
        body: "[PlaceOrder]",
        traceId: checkoutTraceId,
        spanId: placeOrderSpanId,
        attributes: { user_currency: "USD" },
      },
    ],
  },
  {
    service: "payment",
    logs: [
      {
        time: at(1000),
        severityNumber: SEVERITY_NUMBER.warn,
        severityText: "warn",
        body: "Payment request failed. Invalid token.",
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
        attributes: { "demo.user_context.loyalty_level": "gold" },
      },
      {
        time: at(2000),
        severityNumber: SEVERITY_NUMBER.error,
        body: "Credit card info is invalid.",
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
      },
    ],
  },
  {
    service: "frontend",
    logs: [
      {
        time: at(3000),
        severityNumber: SEVERITY_NUMBER.debug,
        body: '{"url.path":"/api/cart","http.response.status_code":200}',
      },
    ],
  },
  {
    service: "cart",
    logs: [
      {
        time: at(5000),
        severityNumber: SEVERITY_NUMBER.info,
        eventName: "cart.get",
        body: "GetCartAsync called\n  with userId={userId}",
      },
    ],
  },
  {
    service: "product-catalog",
    logs: [
      { observedTime: at(6000), severityText: "notice", body: "Database connection established" },
    ],
  },
  {
    service: "ad",
    logs: [
      {
        time: at(4000),
        severityNumber: SEVERITY_NUMBER.fatal,
        body: "java.lang.OutOfMemoryError: Java heap space",
      },
    ],
  },
);

export const checkoutTrace = tracesRequest(
  {
    service: "checkout",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: placeOrderSpanId,
        name: PLACE_ORDER,
        start: at(0),
        end: at(2500),
      },
    ],
  },
  {
    service: "payment",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: chargeSpanId,
        parentSpanId: placeOrderSpanId,
        name: "charge",
        start: at(500),
        end: at(2000),
      },
    ],
  },
);

export const NOTICE_ROW = "12:00:06.000 notice ● product-catalog Database connection established";
export const CART_EVENT_ROW =
  "12:00:05.000 INFO ● cart cart.get GetCartAsync called with userId={userId}";
export const FATAL_ROW = "12:00:04.000 FATAL ● ad java.lang.OutOfMemoryError: Java heap space";
export const JSON_ROW =
  '12:00:03.000 DEBUG ● frontend {"url.path":"/api/cart","http.response.status_code":200}';
export const ERROR_ROW = "12:00:02.000 ERROR ● payment Credit card info is invalid.";
export const WARN_ROW = "12:00:01.000 WARN ● payment Payment request failed. Invalid token.";
export const ORDER_ROW = "12:00:00.000 INFO ● checkout [PlaceOrder]";

export const NEWEST_FIRST = [
  NOTICE_ROW,
  CART_EVENT_ROW,
  FATAL_ROW,
  JSON_ROW,
  ERROR_ROW,
  WARN_ROW,
  ORDER_ROW,
];

export async function renderLogList(receiver: TestReceiver, options?: AppOptions) {
  await receiver.sendHttp("/v1/logs", otlpLogs);
  const app = await renderPage(receiver, "logs", options);
  await app.waitForFrame((frame) => tableRows(frame).length === NEWEST_FIRST.length);
  return app;
}
