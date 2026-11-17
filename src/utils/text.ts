const INDENT_WIDTH = 2;

const collator = new Intl.Collator("en-US", { numeric: true });

export function collapseWhitespace(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export function indent(depth: number) {
  return " ".repeat(depth * INDENT_WIDTH);
}

export function compareText(a: string, b: string) {
  return collator.compare(a, b);
}

export function formatJson(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : text;
  } catch {
    return text;
  }
}
