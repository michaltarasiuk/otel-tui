import { z } from "zod";

import { Attributes } from "#telemetry/attributes.ts";
import { Timestamp } from "#telemetry/timestamp.ts";

const SPAN_KINDS = ["unspecified", "internal", "server", "client", "producer", "consumer"] as const;

export const Span = z.object({
  span_id: z.string(),
  parent_span_id: z.string().nullable(),
  depth: z.number(),
  service_name: z.string().nullable(),
  name: z.string(),
  kind: z.number().transform((kind) => SPAN_KINDS[kind] ?? "unspecified"),
  is_error: z.boolean(),
  status_message: z.string().nullable(),
  start_time: Timestamp,
  offset_ms: z.number(),
  duration_ms: z.number(),
});
export type Span = z.infer<typeof Span>;

export const SpanContent = z.object({
  scope_name: z.string().nullable(),
  scope_version: z.string().nullable(),
  attributes: Attributes,
  resource_attributes: Attributes,
  events: z
    .array(z.object({ name: z.string(), offset_ms: z.number().nullable(), attributes: Attributes }))
    .nullable()
    .transform((events) => events ?? []),
  links: z
    .array(
      z.object({
        trace_id: z.string(),
        span_id: z.string(),
        attributes: Attributes,
        has_trace: z.boolean(),
      }),
    )
    .nullable()
    .transform((links) => links ?? []),
});
export type SpanLink = SpanContent["links"][number];
export type SpanContent = z.infer<typeof SpanContent>;
