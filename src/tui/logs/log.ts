import { z } from "zod";

import { Attributes } from "../attributes.ts";
import { Timestamp } from "../timestamp.ts";
import { severityLevel } from "./severity.ts";

export const Log = z.object({
  log_id: z.string(),
  time: Timestamp.nullable(),
  service_name: z.string().nullable(),
  severity: z
    .number()
    .nullable()
    .transform((severityNumber) => severityLevel(severityNumber)),
  severity_text: z.string().nullable(),
  event_name: z.string().nullable(),
  body: z.string().nullable(),
  trace_id: z.string().nullable(),
  span_id: z.string().nullable(),
  scope_name: z.string().nullable(),
  scope_version: z.string().nullable(),
  attributes: Attributes,
  resource_attributes: Attributes,
});
export type Log = z.infer<typeof Log>;
