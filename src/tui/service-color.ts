import { THEME } from "./theme.ts";

export function serviceColor(serviceName: string) {
  return THEME.serviceColors[Bun.hash.crc32(serviceName) % THEME.serviceColors.length]!;
}
