export const SPAN_KIND = { server: 2, client: 3, consumer: 5 } as const;
export const STATUS_CODE = { error: 2 } as const;
export const SEVERITY_NUMBER = { debug: 5, info: 9, warn: 13, error: 17, fatal: 21 } as const;
export const TEMPORALITY = { delta: 1, cumulative: 2 } as const;

type AttributeValue = string | number | boolean;
type AttributeMap = Record<string, AttributeValue>;

interface ScopeFixture {
  name: string;
  version?: string;
}

interface ResourceFixture {
  service: string;
  attributes?: AttributeMap;
  scope?: ScopeFixture;
}

interface SpanEventFixture {
  name: string;
  time?: Date;
  attributes?: AttributeMap;
}

interface SpanLinkFixture {
  traceId: string;
  spanId: string;
  attributes?: AttributeMap;
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
  events?: SpanEventFixture[];
  links?: SpanLinkFixture[];
}

interface LogFixture {
  time?: Date;
  observedTime?: Date;
  severityNumber?: number;
  severityText?: string;
  eventName?: string;
  body?: AttributeValue | AttributeMap;
  attributes?: AttributeMap;
  traceId?: string;
  spanId?: string;
}

interface ExemplarFixture {
  time: Date;
  value: number;
  traceId?: string;
  spanId?: string;
}

interface DataPointFixture {
  start?: Date;
  time: Date;
  attributes?: AttributeMap;
  exemplars?: ExemplarFixture[];
}

interface NumberPointFixture extends DataPointFixture {
  value: number;
}

interface DistributionPointFixture extends DataPointFixture {
  count: number;
  sum?: number;
  min?: number;
  max?: number;
}

interface HistogramPointFixture extends DistributionPointFixture {
  bounds: number[];
  counts: number[];
}

interface ExponentialBucketsFixture {
  offset: number;
  counts: number[];
}

interface ExponentialHistogramPointFixture extends DistributionPointFixture {
  scale: number;
  zeroCount?: number;
  zeroThreshold?: number;
  positive?: ExponentialBucketsFixture;
  negative?: ExponentialBucketsFixture;
}

interface MetricHeaderFixture {
  name: string;
  unit?: string;
  description?: string;
}

interface GaugeFixture extends MetricHeaderFixture {
  gauge: NumberPointFixture[];
}

interface SumFixture extends MetricHeaderFixture {
  sum: NumberPointFixture[];
  monotonic: boolean;
  temporality: number;
}

interface HistogramFixture extends MetricHeaderFixture {
  histogram: HistogramPointFixture[];
  temporality: number;
}

interface ExponentialHistogramFixture extends MetricHeaderFixture {
  exponentialHistogram: ExponentialHistogramPointFixture[];
  temporality: number;
}

type MetricFixture = GaugeFixture | SumFixture | HistogramFixture | ExponentialHistogramFixture;

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

function int64(value: number) {
  return String(value);
}

function int64s(values: number[]) {
  return values.map((value) => int64(value));
}

function numberValue(value: number) {
  return Number.isInteger(value) ? { asInt: int64(value) } : { asDouble: value };
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

function spanEvent({ time, attributes, ...event }: SpanEventFixture) {
  return { ...event, timeUnixNano: unixNano(time), attributes: keyValues(attributes) };
}

function spanLink({ attributes, ...link }: SpanLinkFixture) {
  return { ...link, attributes: keyValues(attributes) };
}

function span({ start, end, attributes, events, links, ...fields }: SpanFixture) {
  return {
    ...fields,
    startTimeUnixNano: unixNano(start),
    endTimeUnixNano: unixNano(end),
    attributes: keyValues(attributes),
    events: events?.map((event) => spanEvent(event)),
    links: links?.map((link) => spanLink(link)),
  };
}

function logRecord({ time, observedTime, body, attributes, ...log }: LogFixture) {
  return {
    ...log,
    timeUnixNano: unixNano(time),
    observedTimeUnixNano: unixNano(observedTime),
    body: logBody(body),
    attributes: keyValues(attributes),
  };
}

function exemplar({ time, value, ...fields }: ExemplarFixture) {
  return { ...fields, timeUnixNano: unixNano(time), ...numberValue(value) };
}

function dataPoint({ start, time, attributes, exemplars }: DataPointFixture) {
  return {
    startTimeUnixNano: unixNano(start),
    timeUnixNano: unixNano(time),
    attributes: keyValues(attributes),
    exemplars: exemplars?.map((item) => exemplar(item)),
  };
}

function distributionPoint(point: DistributionPointFixture) {
  return {
    ...dataPoint(point),
    count: int64(point.count),
    sum: point.sum,
    min: point.min,
    max: point.max,
  };
}

function numberDataPoint(point: NumberPointFixture) {
  return { ...dataPoint(point), ...numberValue(point.value) };
}

function histogramDataPoint(point: HistogramPointFixture) {
  return {
    ...distributionPoint(point),
    explicitBounds: point.bounds,
    bucketCounts: int64s(point.counts),
  };
}

function exponentialBuckets(buckets: ExponentialBucketsFixture | undefined) {
  return buckets === undefined
    ? undefined
    : { offset: buckets.offset, bucketCounts: int64s(buckets.counts) };
}

function exponentialHistogramDataPoint(point: ExponentialHistogramPointFixture) {
  return {
    ...distributionPoint(point),
    scale: point.scale,
    zeroCount: int64(point.zeroCount ?? 0),
    zeroThreshold: point.zeroThreshold,
    positive: exponentialBuckets(point.positive),
    negative: exponentialBuckets(point.negative),
  };
}

function metricData(fixture: MetricFixture) {
  if ("gauge" in fixture) {
    return { gauge: { dataPoints: fixture.gauge.map((point) => numberDataPoint(point)) } };
  }
  if ("sum" in fixture) {
    return {
      sum: {
        aggregationTemporality: fixture.temporality,
        isMonotonic: fixture.monotonic,
        dataPoints: fixture.sum.map((point) => numberDataPoint(point)),
      },
    };
  }
  if ("histogram" in fixture) {
    return {
      histogram: {
        aggregationTemporality: fixture.temporality,
        dataPoints: fixture.histogram.map((point) => histogramDataPoint(point)),
      },
    };
  }
  return {
    exponentialHistogram: {
      aggregationTemporality: fixture.temporality,
      dataPoints: fixture.exponentialHistogram.map((point) => exponentialHistogramDataPoint(point)),
    },
  };
}

function metric(fixture: MetricFixture) {
  const { name, unit, description } = fixture;
  return { name, unit, description, ...metricData(fixture) };
}

export function tracesRequest(...resources: (ResourceFixture & { spans: SpanFixture[] })[]) {
  return {
    resourceSpans: resources.map((fixture) => ({
      resource: resource(fixture),
      scopeSpans: [{ scope: fixture.scope, spans: fixture.spans.map((item) => span(item)) }],
    })),
  };
}

export function logsRequest(...resources: (ResourceFixture & { logs: LogFixture[] })[]) {
  return {
    resourceLogs: resources.map((fixture) => ({
      resource: resource(fixture),
      scopeLogs: [
        { scope: fixture.scope, logRecords: fixture.logs.map((item) => logRecord(item)) },
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
