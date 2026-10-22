import { KeyHints } from "./key-hints.tsx";
import { THEME } from "./theme.ts";

interface FooterProps {
  receiverUrl: string;
}

export function Footer({ receiverUrl }: FooterProps) {
  return (
    <box flexDirection="row" justifyContent="space-between">
      <KeyHints />
      <text fg={THEME.textMuted}>Listening for OTLP/HTTP on {receiverUrl}</text>
    </box>
  );
}
