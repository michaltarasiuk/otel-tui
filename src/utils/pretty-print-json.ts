const JSON_INDENT = 2;

export function prettyPrintJson(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null
      ? JSON.stringify(value, null, JSON_INDENT)
      : text;
  } catch {
    return text;
  }
}
