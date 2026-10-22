import { z } from "zod";

const MAX_PORT = 65_535;

const Env = z.object({
  OTEL_TUI_PORT: z.coerce.number().int().positive().max(MAX_PORT).default(4318),
  OTEL_TUI_RETENTION_MINUTES: z.coerce.number().positive().default(60),
});

export const env = Env.parse(process.env);
