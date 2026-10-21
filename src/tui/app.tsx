export interface AppProps {
  receiverUrl: string;
}

export function App({ receiverUrl }: AppProps) {
  return (
    <box border title="otel-tui" padding={1} flexGrow={1}>
      <text>Listening for OTLP/HTTP on {receiverUrl}</text>
    </box>
  );
}
