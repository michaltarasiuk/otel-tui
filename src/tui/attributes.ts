import { z } from "zod";

export const Attributes = z
  .array(z.object({ key: z.string(), value: z.string().nullable() }))
  .nullish()
  .transform((attributes) => attributes ?? []);
export type Attributes = z.infer<typeof Attributes>;
