import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";

type Flash = (message: string) => void;

const FLASH_DURATION_MS = 2000;

const MessageContext = createContext<string | undefined>(undefined);
const FlashContext = createContext<Flash | undefined>(undefined);

export function StatusProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function flash(message: string) {
    clearTimeout(timeoutRef.current);
    setMessage(message);
    timeoutRef.current = setTimeout(() => setMessage(undefined), FLASH_DURATION_MS);
  }

  return (
    <MessageContext value={message}>
      <FlashContext value={flash}>{children}</FlashContext>
    </MessageContext>
  );
}

export function useStatusMessage() {
  return use(MessageContext);
}

export function useFlash() {
  const flash = use(FlashContext);
  if (flash === undefined) {
    throw new Error("useFlash must be used within a StatusProvider");
  }
  return flash;
}
