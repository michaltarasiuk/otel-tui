import { type ColorInput, TextAttributes } from "@opentui/core";
import { createContext, use } from "react";

import { COLUMN_GAP } from "#tui/theme/columns.ts";
import { THEME } from "#tui/theme/theme.ts";

import { useFocused } from "./focus.tsx";

type Align = "left" | "right";
export type SortDirection = "ascending" | "descending";

const SORT_ARROWS = { ascending: "▲", descending: "▼" } satisfies Record<SortDirection, string>;

export function sortDirection<C>(
  sort: { column: C; descending: boolean },
  column: C,
): SortDirection | undefined {
  if (sort.column !== column) {
    return undefined;
  }
  return sort.descending ? "descending" : "ascending";
}

export const SelectedContext = createContext(false);

interface CellLayout {
  width?: number | undefined;
  grow?: number | undefined;
  align?: Align | undefined;
}

function cellLayoutProps({ width, grow, align = "left" }: CellLayout) {
  return {
    ...(width === undefined ? {} : { width }),
    ...(grow === undefined ? {} : { flexGrow: grow, flexBasis: 0 }),
    textAlign: align,
    wrapMode: "none",
    truncate: true,
  } as const;
}

interface TableHeaderProps {
  children: React.ReactNode;
}

export function TableHeader({ children }: TableHeaderProps) {
  return <Row>{children}</Row>;
}

interface ColumnProps extends CellLayout {
  sort?: SortDirection | undefined;
  children: string;
}

export function Column({ sort, children, ...layout }: ColumnProps) {
  const arrow = sort === undefined ? [] : [SORT_ARROWS[sort]];
  const parts = layout.align === "right" ? [...arrow, children] : [children, ...arrow];

  return (
    <text {...cellLayoutProps(layout)} fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
      {parts.join(" ")}
    </text>
  );
}

interface RowProps {
  children: React.ReactNode;
}

export function Row({ children }: RowProps) {
  const focused = useFocused();
  const selected = use(SelectedContext);

  return (
    <box
      flexDirection="row"
      gap={COLUMN_GAP}
      paddingX={1}
      backgroundColor={selected && focused ? THEME.backgroundSelected : THEME.background}
    >
      {children}
    </box>
  );
}

interface CellProps extends CellLayout {
  muted?: boolean;
  color?: ColorInput | undefined;
  children?: React.ReactNode;
}

function useMutedColor() {
  const selected = use(SelectedContext);
  return selected ? THEME.text : THEME.textMuted;
}

export function Cell({ muted = false, color, children, ...layout }: CellProps) {
  const mutedColor = useMutedColor();

  return (
    <text {...cellLayoutProps(layout)} fg={color ?? (muted ? mutedColor : THEME.text)}>
      {children}
    </text>
  );
}

interface SecondaryProps {
  children: React.ReactNode;
}

export function Secondary({ children }: SecondaryProps) {
  return <span fg={useMutedColor()}>{children}</span>;
}
