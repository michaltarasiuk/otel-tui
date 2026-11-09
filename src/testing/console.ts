import { onTestFinished, spyOn } from "bun:test";

export function silenceConsoleError() {
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  onTestFinished(() => consoleError.mockRestore());
  return consoleError;
}
