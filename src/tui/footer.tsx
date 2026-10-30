import { COLUMN_GAP } from "./columns.ts";
import { KeyHints } from "./key-hints.tsx";
import { THEME } from "./theme.ts";

interface FooterProps {
  receiverUrl: string;
}

export function Footer({ receiverUrl }: FooterProps) {
  return (
    <box paddingX={1} flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP}>
      <KeyHints />
      <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
        Listening for OTLP/HTTP on {receiverUrl}
      </text>
    </box>
  );
}
