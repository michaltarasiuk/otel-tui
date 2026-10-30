import { z } from "zod";

export const Timestamp = z.date().transform((date) => date.getTime());
