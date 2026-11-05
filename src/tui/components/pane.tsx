import { createContext, use } from "react";

import { FocusScope } from "./focus.tsx";

const VisibleContext = createContext(true);

interface PaneProps {
  visible: boolean;
  children: React.ReactNode;
}

export function Pane({ visible, children }: PaneProps) {
  const parentVisible = useVisible();

  return (
    <box visible={visible} flexGrow={1}>
      <VisibleContext value={parentVisible && visible}>
        <FocusScope focused={visible}>{children}</FocusScope>
      </VisibleContext>
    </box>
  );
}

export function useVisible() {
  return use(VisibleContext);
}
