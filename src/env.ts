import { z } from "zod";

const Env = z.object({
  OTEL_TUI_PORT: z.coerce.number().int().min(1).max(65535).default(4318),
  OTEL_TUI_RETENTION_MINUTES: z.coerce.number().positive().default(60),
});

export const env = Env.parse(process.env);
