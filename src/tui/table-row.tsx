import { COLUMN_GAP } from "./columns.ts";
import { useFocused } from "./focus.tsx";
import { THEME } from "./theme.ts";

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
