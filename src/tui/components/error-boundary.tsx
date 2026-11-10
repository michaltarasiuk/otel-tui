import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, createContext, use } from "react";

const RetryContext = createContext(() => {});

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
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <RetryContext value={() => this.setState({ failed: false })}>
        {this.props.fallback}
      </RetryContext>
    );
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

export function useRetry() {
  return use(RetryContext);
}
