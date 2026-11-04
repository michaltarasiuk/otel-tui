export function formatCount(count: number, noun: string) {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

export function formatShownCount(shownCount: number, totalCount: number, noun: string) {
  const total = formatCount(totalCount, noun);
  return shownCount < totalCount ? `${shownCount.toLocaleString()} of ${total}` : total;
}

export function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function prettyPrintJson(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : text;
  } catch {
    return text;
  }
}
