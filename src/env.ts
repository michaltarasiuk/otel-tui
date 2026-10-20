import { z } from "zod";

const envSchema = z.object({
  OTEL_TUI_PORT: z.coerce.number().int().min(1).max(65535).default(4318),
});

export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
