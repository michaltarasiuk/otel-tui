import { Activity, useState } from "react";

export type ScreenMode = "visible" | "hidden";

interface ScreenProps {
  mode: ScreenMode;
  children: React.ReactNode;
}

export function Screen({ mode, children }: ScreenProps) {
  const [wasVisible, setWasVisible] = useState(mode === "visible");
  if (mode === "visible" && !wasVisible) {
    setWasVisible(true);
  }

  return <Activity mode={mode}>{wasVisible && children}</Activity>;
}
