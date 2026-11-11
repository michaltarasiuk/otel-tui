import { THEME } from "./theme.ts";

export const SPLIT_PADDING_X = 1;

interface SplitProps {
  children: [React.ReactNode, React.ReactNode];
}

export function Split({ children: [top, bottom] }: SplitProps) {
  return (
    <box flexGrow={1}>
      {top}
      <box
        flexGrow={1}
        flexBasis={0}
        border={["top"]}
        borderColor={THEME.textMuted}
        paddingX={SPLIT_PADDING_X}
      >
        {bottom}
      </box>
    </box>
  );
}
