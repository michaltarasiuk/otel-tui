import type { ReceiverUrls } from "../db/receiver.ts";
import { COLUMN_GAP } from "./columns.ts";
import { KeyHints } from "./key-hints.tsx";
import { THEME } from "./theme.ts";

interface FooterProps {
  receiverUrls: ReceiverUrls;
}

export function Footer({ receiverUrls }: FooterProps) {
  return (
    <box paddingX={1} flexDirection="row" justifyContent="space-between" gap={COLUMN_GAP}>
      <KeyHints />
      <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
        OTLP/HTTP {new URL(receiverUrls.http).host} · OTLP/gRPC {new URL(receiverUrls.grpc).host}
      </text>
    </box>
  );
}
