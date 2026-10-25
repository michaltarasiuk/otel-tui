import { TextAttributes } from "@opentui/core";
import type { TextProps } from "@opentui/react";

import { THEME } from "../theme.ts";

export const COLUMN_GAP = 2;
export const SERVICE_WIDTH = 18;

export const HEADER_CELL_PROPS = {
  fg: THEME.textMuted,
  attributes: TextAttributes.BOLD,
} satisfies TextProps;
