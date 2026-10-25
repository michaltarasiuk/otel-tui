import { z } from "zod";

import { Attributes } from "../attributes.ts";

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
  start_time: z.date(),
  offset_ms: z.number(),
  duration_ms: z.number(),
});
export type Span = z.infer<typeof Span>;

const NullableString = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

export const SpanDetails = z.object({
  scope_name: NullableString,
  scope_version: NullableString,
  attributes: Attributes,
  resource_attributes: Attributes,
  events: z
    .array(z.object({ name: z.string(), offset_ms: z.number(), attributes: Attributes }))
    .nullish()
    .transform((events) => events ?? []),
  links: z
    .array(z.object({ trace_id: z.string(), span_id: z.string(), attributes: Attributes }))
    .nullish()
    .transform((links) => links ?? []),
});
export type SpanDetails = z.infer<typeof SpanDetails>;
