import { FocusScope } from "./focus.tsx";

interface PaneProps {
  visible: boolean;
  children: React.ReactNode;
}

export function Pane({ visible, children }: PaneProps) {
  return (
    <box visible={visible} flexGrow={1}>
      <FocusScope focused={visible}>{children}</FocusScope>
    </box>
  );
}
