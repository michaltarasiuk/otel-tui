import { Activity } from "react";

interface ScreenProps {
  when: boolean;
  children: React.ReactNode;
}

export function Screen({ when, children }: ScreenProps) {
  return <Activity mode={when ? "visible" : "hidden"}>{children}</Activity>;
}
