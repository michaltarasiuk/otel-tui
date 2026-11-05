import { type ColorInput, TextAttributes } from "@opentui/core";

import { COLUMN_GAP } from "../theme/columns.ts";
import { IGNORE_CONTENT_SIZE } from "../theme/flex.ts";
import { THEME } from "../theme/theme.ts";

interface HeadingProps {
  title: string;
  titleColor?: ColorInput;
  aside: string;
}

export function Heading({ title, titleColor = THEME.text, aside }: HeadingProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP}>
      <text
        flexGrow={1}
        flexBasis={IGNORE_CONTENT_SIZE}
        fg={titleColor}
        attributes={TextAttributes.BOLD}
      >
        {title}
      </text>
      <text fg={THEME.textMuted} flexShrink={0}>
        {aside}
      </text>
    </box>
  );
}

interface FactsProps {
  children: React.ReactNode;
}

export function Facts({ children }: FactsProps) {
  return (
    <box flexDirection="row" gap={COLUMN_GAP} overflow="hidden">
      {children}
    </box>
  );
}
