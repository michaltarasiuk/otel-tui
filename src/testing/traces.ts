import { type AppOptions, renderPage, selectRow } from "./app.tsx";
import { at } from "./clock.ts";
import { SPAN_KIND, STATUS_CODE, tracesRequest } from "./otlp.ts";
import type { TestReceiver } from "./receiver.ts";
import { tableRows } from "./screen.ts";

export const cartTraceId = "1".repeat(32);
export const checkoutTraceId = "2".repeat(32);
export const statusTraceId = "3".repeat(32);
export const rootlessTraceId = "4".repeat(32);
export const missingParentId = "5".repeat(16);

export const PLACE_ORDER = "oteldemo.CheckoutService/PlaceOrder";
export const GET_CART = "POST /oteldemo.CartService/GetCart";

export const CHARGE_DECLINED = "Credit card info is invalid.";
export const CHARGE_FAILED = `failed to charge card: could not charge the card: rpc error: code = Unknown desc = ${CHARGE_DECLINED}`;

export const CART_ROW = "12:00:00.000 ● frontend GET /api/cart 3 120.0ms";
export const CHECKOUT_ROW = `12:00:01.000 ● checkout ${PLACE_ORDER} 3 2 500.0ms`;
export const STATUS_ROW = "12:00:02.000 ● image-provider GET /status 1 1.0ms";

export const NEWEST_FIRST = [STATUS_ROW, CHECKOUT_ROW, CART_ROW];

export const otlpTraces = tracesRequest(
  {
    service: "frontend",
    attributes: { "host.name": "colima" },
    scope: { name: "next.js", version: "0.0.1" },
    spans: [
      {
        traceId: cartTraceId,
        spanId: "1a".repeat(8),
        name: "GET /api/cart",
        kind: SPAN_KIND.server,
        start: at(0),
        end: at(120),
        attributes: { "http.route": "/api/cart" },
      },
    ],
  },
  {
    service: "image-provider",
    spans: [
      {
        traceId: statusTraceId,
        spanId: "3a".repeat(8),
        name: "GET /status",
        start: at(2000),
        end: at(2001),
      },
    ],
  },
  {
    service: "cart",
    spans: [
      {
        traceId: cartTraceId,
        spanId: "1b".repeat(8),
        parentSpanId: "1a".repeat(8),
        name: GET_CART,
        kind: SPAN_KIND.server,
        start: at(10),
        end: at(90),
        events: [
          { name: "Enqueued", time: at(8) },
          {
            name: "feature_flag.evaluation",
            time: at(15),
            attributes: { "feature_flag.key": "cartFailure" },
          },
          { name: "Fetch cart" },
        ],
      },
      {
        traceId: cartTraceId,
        spanId: "1c".repeat(8),
        parentSpanId: "1b".repeat(8),
        name: "valkey-cart:6379",
        kind: SPAN_KIND.client,
        start: at(20),
        end: at(80),
        attributes: { "db.system": "redis" },
      },
    ],
  },
  {
    service: "checkout",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2a".repeat(8),
        name: PLACE_ORDER,
        kind: SPAN_KIND.server,
        start: at(1000),
        end: at(1450),
        status: { code: STATUS_CODE.error, message: CHARGE_FAILED },
        links: [
          {
            traceId: cartTraceId,
            spanId: "1a".repeat(8),
            attributes: { "demo.cart.items.count": 4 },
          },
        ],
      },
    ],
  },
  {
    service: "payment",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2b".repeat(8),
        parentSpanId: "2a".repeat(8),
        name: "charge",
        kind: SPAN_KIND.client,
        start: at(1100),
        end: at(1400),
        status: { code: STATUS_CODE.error, message: CHARGE_DECLINED },
      },
    ],
  },
  {
    service: "accounting",
    spans: [
      {
        traceId: rootlessTraceId,
        spanId: "4b".repeat(8),
        parentSpanId: "4a".repeat(8),
        name: "order-consumed",
        start: at(3000),
        end: at(3100),
      },
    ],
  },
  {
    service: "fraud-detection",
    spans: [
      {
        traceId: checkoutTraceId,
        spanId: "2c".repeat(8),
        parentSpanId: missingParentId,
        name: "orders process",
        kind: SPAN_KIND.consumer,
        start: at(1460),
        end: at(1500),
      },
    ],
  },
);

export async function renderTraceList(receiver: TestReceiver, options?: AppOptions) {
  await receiver.sendHttp("/v1/traces", otlpTraces);
  const app = await renderPage(receiver, "traces", options);
  await app.waitForFrame((frame) => tableRows(frame).length === NEWEST_FIRST.length);
  return app;
}

export async function openTrace(receiver: TestReceiver, row: string, options?: AppOptions) {
  const app = await renderTraceList(receiver, options);
  await selectRow(app, NEWEST_FIRST, row);
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("escape back"));
  return app;
}
