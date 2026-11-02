import type { ReceiverUrls } from "../db/receiver.ts";
import { THEME } from "./theme.ts";

interface ReceiverStatusProps {
  receiverUrls: ReceiverUrls;
}

export function ReceiverStatus({ receiverUrls }: ReceiverStatusProps) {
  return (
    <text fg={THEME.textMuted} wrapMode="none" flexShrink={0}>
      OTLP/HTTP {new URL(receiverUrls.http).host} · OTLP/gRPC {new URL(receiverUrls.grpc).host}
    </text>
  );
}
