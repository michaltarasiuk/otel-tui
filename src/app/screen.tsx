import { Activity, useState } from "react";

interface ScreenProps {
  mode: "visible" | "hidden";
  children: React.ReactNode;
}

export function Screen({ mode, children }: ScreenProps) {
  const [wasVisible, setWasVisible] = useState(mode === "visible");
  if (mode === "visible" && !wasVisible) {
    setWasVisible(true);
  }

  return <Activity mode={mode}>{wasVisible && children}</Activity>;
}
