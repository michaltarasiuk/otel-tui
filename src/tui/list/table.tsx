import type { ReactNode } from "react";

import { THEME } from "../theme.ts";

export interface Column {
  title: string;
  // Omitted for the one column that takes the remaining space.
  width?: number;
  align?: "left" | "center" | "right";
}

const COLUMN_GAP = 2;

// Fixed columns never shrink, so a narrow terminal cuts the fill column
// instead of pushing header and row cells out of line.
export function columnLayout(column: Column) {
  return column.width === undefined
    ? { flexGrow: 1, flexBasis: 0, minWidth: 0 }
    : { width: column.width, flexShrink: 0 };
}

const ROW_LAYOUT = {
  flexDirection: "row",
  height: 1,
  flexShrink: 0,
  gap: COLUMN_GAP,
} as const;

interface TableHeaderProps {
  children: ReactNode;
}

export function TableHeader({ children }: TableHeaderProps) {
  return <box {...ROW_LAYOUT}>{children}</box>;
}

interface TableRowProps {
  id: string;
  selected: boolean;
  children: ReactNode;
}

export function TableRow({ id, selected, children }: TableRowProps) {
  return (
    <box
      id={id}
      {...ROW_LAYOUT}
      backgroundColor={selected ? THEME.backgroundSelected : "transparent"}
    >
      {children}
    </box>
  );
}

interface CellProps {
  column: Column;
  fg?: string;
  children?: ReactNode;
}

export function Cell({ column, fg = THEME.text, children }: CellProps) {
  return (
    <text
      {...columnLayout(column)}
      fg={fg}
      textAlign={column.align ?? "left"}
      wrapMode="none"
      truncate
    >
      {children}
    </text>
  );
}

interface HeaderCellProps {
  column: Column;
}

export function HeaderCell({ column }: HeaderCellProps) {
  return (
    <Cell column={column} fg={THEME.textMuted}>
      {column.title}
    </Cell>
  );
}
