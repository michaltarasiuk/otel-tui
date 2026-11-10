import { useRetry } from "./error-boundary.tsx";
import { Key, KeyHints } from "./key-hints.tsx";
import { Placeholder } from "./placeholder.tsx";

export function PageLoading() {
  return (
    <box flexGrow={1}>
      <Placeholder text="Loading..." />
      <KeyHints />
    </box>
  );
}

interface PageErrorProps {
  text: string;
  onBack?: (() => void) | undefined;
}

export function PageError({ text, onBack }: PageErrorProps) {
  const retry = useRetry();

  return (
    <box flexGrow={1}>
      <Placeholder text={text} variant="error" />
      <KeyHints>
        <Key name="r" onPress={() => retry()}>
          retry
        </Key>
        {onBack !== undefined && (
          <Key name="escape" onPress={() => onBack()}>
            back
          </Key>
        )}
      </KeyHints>
    </box>
  );
}
