import { z } from "zod";

const EnvSchema = z.object({
  OTEL_TUI_PORT: z.coerce.number().int().default(4318),
  OTEL_TUI_RETENTION_MINUTES: z.coerce.number().int().default(60),
});

export const env = EnvSchema.parse(process.env);
