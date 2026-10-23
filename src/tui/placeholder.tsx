import { THEME } from "./theme.ts";

const VARIANT_COLORS = {
  muted: THEME.textMuted,
  error: THEME.textError,
};

interface PlaceholderProps {
  text: string;
  variant?: keyof typeof VARIANT_COLORS;
}

export function Placeholder({ text, variant = "muted" }: PlaceholderProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      <text fg={VARIANT_COLORS[variant]} textAlign="center">
        {text}
      </text>
    </box>
  );
}
