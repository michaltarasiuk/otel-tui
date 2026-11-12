export const THEME = {
  text: "#FFFFFF",
  textMuted: "#808080",
  textWarning: "#FFD75F",
  textError: "#FF5F5F",
  background: "#00000000",
  backgroundSelected: "#444444",
  backgroundOverlay: "#1C1C1C",
  bar: "#3987E5",
  serviceColors: ["#3987E5", "#B9440F", "#01A38C", "#B08A01", "#AC3D8F", "#077C06", "#B56EF1"],
} as const;

export function serviceColor(serviceName: string) {
  return THEME.serviceColors[Bun.hash.crc32(serviceName) % THEME.serviceColors.length]!;
}
