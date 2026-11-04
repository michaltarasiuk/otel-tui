import { z } from "zod";

const Port = z.coerce.number().int().positive().max(65_535);

const Env = z.object({
  OTEL_TUI_HTTP_PORT: Port.default(4318),
  OTEL_TUI_GRPC_PORT: Port.default(4317),
  OTEL_TUI_RETENTION_MINUTES: z.coerce.number().positive().default(60),
  OTEL_TUI_MEMORY_LIMIT_MB: z.coerce.number().positive().default(1024),
});

export const env = Env.parse(process.env);
