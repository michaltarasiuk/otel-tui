import { createContext, use, useEffect, useState } from "react";

import { Key } from "./components/key-hints.tsx";

const NOTICE_MS = 1500;

type CopyNotice = "copied" | "copy failed";

export const ClipboardContext = createContext<((text: string) => Promise<boolean>) | undefined>(
  undefined,
);

function useClipboard() {
  const write = use(ClipboardContext);
  if (write === undefined) {
    throw new Error("useClipboard must be used within a ClipboardContext provider");
  }
  return write;
}

function useCopy() {
  const write = useClipboard();
  const [notice, setNotice] = useState<CopyNotice>();

  useEffect(() => {
    if (notice === undefined) {
      return;
    }
    const timeout = setTimeout(() => setNotice(undefined), NOTICE_MS);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function copy(text: string) {
    try {
      setNotice((await write(text)) ? "copied" : "copy failed");
    } catch (error) {
      console.error("Copying to the clipboard failed", error);
      setNotice("copy failed");
    }
  }

  return [notice, copy] as const;
}

interface CopyKeyProps {
  name: string;
  text: string;
  description?: string;
  children?: string;
}

export function CopyKey({ name, text, description, children }: CopyKeyProps) {
  const [notice, copy] = useCopy();

  if (text === "") {
    return null;
  }

  return (
    <Key name={name} description={description} onPress={() => copy(text)}>
      {children === undefined ? undefined : (notice ?? children)}
    </Key>
  );
}
