const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

export function substringPattern(search: string) {
  return `%${search.replace(LIKE_SPECIAL_CHARACTERS, "\\$&")}%`;
}
