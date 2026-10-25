export const THEME = {
  text: "#FFFFFF",
  textMuted: "#808080",
  textWarning: "#FFD75F",
  textError: "#FF5F5F",
  background: "#00000000",
  backgroundSelected: "#444444",
  serviceColors: ["#3987E5", "#D95926", "#199E70", "#C98500", "#D55181", "#008300", "#9085E9"],
} as const;

export function serviceColor(serviceName: string) {
  return THEME.serviceColors[Bun.hash.crc32(serviceName) % THEME.serviceColors.length]!;
}
