export function containsPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}
