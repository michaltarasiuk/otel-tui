import { Activity, useState } from "react";

interface ScreenProps {
  when: boolean;
  children: React.ReactNode;
}

export function Screen({ when, children }: ScreenProps) {
  const [shown, setShown] = useState(when);
  if (when && !shown) {
    setShown(true);
  }

  return <Activity mode={when ? "visible" : "hidden"}>{shown && children}</Activity>;
}
