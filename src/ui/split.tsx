import { SizeProvider, useRegionSize } from "./size.tsx";
import { THEME } from "./theme.ts";

export const SPLIT_PADDING_X = 1;

interface SplitProps {
  children: [React.ReactNode, React.ReactNode];
}

export function Split({ children: [top, bottom] }: SplitProps) {
  const { width } = useRegionSize();

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
        <SizeProvider value={{ width: width - 2 * SPLIT_PADDING_X, height: undefined }}>
          {bottom}
        </SizeProvider>
      </box>
    </box>
  );
}
