import { THEME } from "./theme.ts";

interface FooterProps {
  receiverUrl: string;
}

export function Footer({ receiverUrl }: FooterProps) {
  return (
    <box alignItems="flex-end">
      <text fg={THEME.textMuted}>Listening for OTLP/HTTP on {receiverUrl}</text>
    </box>
  );
}
