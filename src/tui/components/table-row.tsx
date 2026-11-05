import { COLUMN_GAP } from "../theme/columns.ts";
import { THEME } from "../theme/theme.ts";
import { useFocused } from "./focus.tsx";

interface TableRowProps {
  selected?: boolean;
  children: React.ReactNode;
}

export function TableRow({ selected = false, children }: TableRowProps) {
  const focused = useFocused();

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
