type AttributeValue = string | number | boolean;
type AttributeMap = Record<string, AttributeValue>;

export const SPAN_KIND = { server: 2, client: 3, consumer: 5 } as const;
export const STATUS_CODE = { error: 2 } as const;
export const SEVERITY_NUMBER = { debug: 5, info: 9, warn: 13, error: 17, fatal: 21 } as const;
export const TEMPORALITY = { delta: 1, cumulative: 2 } as const;

interface ResourceFixture {
  service: string;
  attributes?: AttributeMap;
  scope?: { name: string; version?: string };
}

interface SpanFixture {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  start: Date;
  end: Date;
  status?: { code: number; message?: string };
  attributes?: AttributeMap;
  events?: { name: string; time: Date; attributes?: AttributeMap }[];
  links?: { traceId: string; spanId: string; attributes?: AttributeMap }[];
}

interface LogFixture {
  time?: Date;
  observedTime?: Date;
  severityNumber?: number;
  severityText?: string;
  eventName?: string;
  body?: AttributeValue | AttributeMap;
  traceId?: string;
  spanId?: string;
  attributes?: AttributeMap;
}

interface DataPointFixture {
  attributes?: AttributeMap;
  start?: Date;
  time: Date;
  exemplars?: { time: Date; value: number; traceId?: string; spanId?: string }[];
}

interface NumberPointFixture extends DataPointFixture {
  value: number;
}

interface HistogramPointFixture extends DataPointFixture {
  count: number;
  sum?: number;
  min?: number;
  max?: number;
  bounds: number[];
  counts: number[];
}

interface ExponentialBucketsFixture {
  offset: number;
  counts: number[];
}

interface ExponentialHistogramPointFixture extends DataPointFixture {
  count: number;
  sum?: number;
  min?: number;
  max?: number;
  scale: number;
  zeroCount?: number;
  zeroThreshold?: number;
  positive?: ExponentialBucketsFixture;
  negative?: ExponentialBucketsFixture;
}

type MetricFixture = { name: string; unit?: string; description?: string } & (
  | { gauge: NumberPointFixture[] }
  | { sum: NumberPointFixture[]; monotonic: boolean; temporality: number }
  | { histogram: HistogramPointFixture[]; temporality: number }
  | { exponentialHistogram: ExponentialHistogramPointFixture[]; temporality: number }
);

function anyValue(value: AttributeValue) {
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "boolean":
      return { boolValue: value };
    default:
      return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
}

function keyValues(attributes: AttributeMap = {}) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: anyValue(value) }));
}

function unixNano(time: Date | undefined) {
  return time === undefined ? undefined : String(BigInt(time.getTime()) * 1_000_000n);
}

function resource({ service, attributes }: ResourceFixture) {
  return { attributes: keyValues({ "service.name": service, ...attributes }) };
}

function logBody(body: LogFixture["body"]) {
  if (body === undefined) {
    return undefined;
  }
  return typeof body === "object" ? { kvlistValue: { values: keyValues(body) } } : anyValue(body);
}

function numberValue(value: number) {
  return Number.isInteger(value) ? { asInt: String(value) } : { asDouble: value };
}

function int64s(values: number[]) {
  return values.map((value) => String(value));
}

function dataPoint({ attributes, start, time, exemplars }: DataPointFixture) {
  return {
    attributes: keyValues(attributes),
    startTimeUnixNano: unixNano(start),
    timeUnixNano: unixNano(time),
    exemplars: exemplars?.map(({ time, value, ...exemplar }) => ({
      ...exemplar,
      timeUnixNano: unixNano(time),
      ...numberValue(value),
    })),
  };
}

function numberDataPoints(points: NumberPointFixture[]) {
  return points.map((point) => ({ ...dataPoint(point), ...numberValue(point.value) }));
}

function exponentialBuckets(buckets: ExponentialBucketsFixture | undefined) {
  return buckets === undefined
    ? undefined
    : { offset: buckets.offset, bucketCounts: int64s(buckets.counts) };
}

function metric(fixture: MetricFixture) {
  const { name, unit, description } = fixture;
  if ("gauge" in fixture) {
    return { name, unit, description, gauge: { dataPoints: numberDataPoints(fixture.gauge) } };
  }
  if ("sum" in fixture) {
    return {
      name,
      unit,
      description,
      sum: {
        aggregationTemporality: fixture.temporality,
        isMonotonic: fixture.monotonic,
        dataPoints: numberDataPoints(fixture.sum),
      },
    };
  }
  if ("histogram" in fixture) {
    return {
      name,
      unit,
      description,
      histogram: {
        aggregationTemporality: fixture.temporality,
        dataPoints: fixture.histogram.map(({ count, bounds, counts, ...point }) => ({
          ...dataPoint(point),
          count: String(count),
          sum: point.sum,
          min: point.min,
          max: point.max,
          explicitBounds: bounds,
          bucketCounts: int64s(counts),
        })),
      },
    };
  }
  return {
    name,
    unit,
    description,
    exponentialHistogram: {
      aggregationTemporality: fixture.temporality,
      dataPoints: fixture.exponentialHistogram.map(({ count, zeroCount = 0, ...point }) => ({
        ...dataPoint(point),
        count: String(count),
        sum: point.sum,
        min: point.min,
        max: point.max,
        scale: point.scale,
        zeroCount: String(zeroCount),
        zeroThreshold: point.zeroThreshold,
        positive: exponentialBuckets(point.positive),
        negative: exponentialBuckets(point.negative),
      })),
    },
  };
}

export function tracesRequest(...resources: (ResourceFixture & { spans: SpanFixture[] })[]) {
  return {
    resourceSpans: resources.map((fixture) => ({
      resource: resource(fixture),
      scopeSpans: [
        {
          scope: fixture.scope,
          spans: fixture.spans.map(({ start, end, attributes, events, links, ...span }) => ({
            ...span,
            startTimeUnixNano: unixNano(start),
            endTimeUnixNano: unixNano(end),
            attributes: keyValues(attributes),
            events: events?.map((event) => ({
              name: event.name,
              timeUnixNano: unixNano(event.time),
              attributes: keyValues(event.attributes),
            })),
            links: links?.map((link) => ({
              traceId: link.traceId,
              spanId: link.spanId,
              attributes: keyValues(link.attributes),
            })),
          })),
        },
      ],
    })),
  };
}

export function logsRequest(...resources: (ResourceFixture & { logs: LogFixture[] })[]) {
  return {
    resourceLogs: resources.map((fixture) => ({
      resource: resource(fixture),
      scopeLogs: [
        {
          scope: fixture.scope,
          logRecords: fixture.logs.map(({ time, observedTime, body, attributes, ...log }) => ({
            ...log,
            timeUnixNano: unixNano(time),
            observedTimeUnixNano: unixNano(observedTime),
            body: logBody(body),
            attributes: keyValues(attributes),
          })),
        },
      ],
    })),
  };
}

export function metricsRequest(...resources: (ResourceFixture & { metrics: MetricFixture[] })[]) {
  return {
    resourceMetrics: resources.map((fixture) => ({
      resource: resource(fixture),
      scopeMetrics: [
        { scope: fixture.scope, metrics: fixture.metrics.map((item) => metric(item)) },
      ],
    })),
  };
}
