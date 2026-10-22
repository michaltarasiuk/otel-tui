export const THEME = {
  text: "#FFFFFF",
  textMuted: "#808080",
  backgroundSelected: "#444444",
  border: "#555555",
  error: "#F7768E",
  warning: "#E0AF68",
  success: "#9ECE6A",
  services: [
    "#7AA2F7",
    "#BB9AF7",
    "#7DCFFF",
    "#9ECE6A",
    "#E0AF68",
    "#FF9E64",
    "#73DACA",
    "#C0CAF5",
  ],
} as const;

export function serviceColor(service: string) {
  let hash = 0;
  for (const char of service) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return THEME.services[Math.abs(hash) % THEME.services.length]!;
}
