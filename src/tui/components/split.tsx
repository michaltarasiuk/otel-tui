import { THEME } from "#tui/theme/theme.ts";

interface SplitProps {
  children: [React.ReactNode, React.ReactNode];
}

export function Split({ children: [top, bottom] }: SplitProps) {
  return (
    <box flexGrow={1}>
      {top}
      <box flexGrow={1} flexBasis={0} border={["top"]} borderColor={THEME.textMuted} paddingX={1}>
        {bottom}
      </box>
    </box>
  );
}
