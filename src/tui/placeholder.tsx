import { THEME } from "./theme.ts";

interface PlaceholderProps {
  text: string;
}

export function Placeholder({ text }: PlaceholderProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      <text fg={THEME.textMuted}>{text}</text>
    </box>
  );
}
