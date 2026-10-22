import { THEME } from "./theme.ts";

interface PlaceholderProps {
  text: string;
  fg?: string;
}

export function Placeholder({ text, fg = THEME.textMuted }: PlaceholderProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      <text fg={fg} textAlign="center">
        {text}
      </text>
    </box>
  );
}
