import { TextAttributes } from "@opentui/core";
import type { TextProps } from "@opentui/react";

import { THEME } from "./theme.ts";

export const COLUMN_GAP = 2;
export const TIME_WIDTH = 12;
export const SERVICE_WIDTH = 18;
export const SORT_ARROW_WIDTH = 2;

export const HEADER_CELL_PROPS = {
  fg: THEME.textMuted,
  attributes: TextAttributes.BOLD,
} satisfies TextProps;

export function secondaryCellColor(selected: boolean) {
  return selected ? THEME.text : THEME.textMuted;
}

export function sortArrow<Column>(sort: { column: Column; descending: boolean }, column: Column) {
  if (sort.column !== column) {
    return "";
  }
  return sort.descending ? "▼" : "▲";
}
