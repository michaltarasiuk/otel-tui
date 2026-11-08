import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Component } from "react";

interface CatchProps {
  fallback: React.ReactNode;
  onCatch: () => void;
  children: React.ReactNode;
}

interface CatchState {
  failed: boolean;
}

class Catch extends Component<CatchProps, CatchState> {
  override state: CatchState = { failed: false };

  static getDerivedStateFromError(): CatchState {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onCatch();
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

export function ErrorBoundary({ fallback, children }: ErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <Catch fallback={fallback} onCatch={() => reset()}>
      {children}
    </Catch>
  );
}
