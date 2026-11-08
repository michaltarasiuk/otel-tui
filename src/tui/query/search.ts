import { substringPattern } from "./like-pattern.ts";

const ATTRIBUTE_TERM = /^([^\s=]+)=(\S*)$/;

interface AttributeFilter {
  key: string;
  value: string;
}

export function parseSearch(search: string) {
  const words: string[] = [];
  const attributes: AttributeFilter[] = [];

  for (const term of search.split(/\s+/)) {
    const match = ATTRIBUTE_TERM.exec(term);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      attributes.push({ key: match[1], value: match[2] });
    } else if (term !== "") {
      words.push(term);
    }
  }

  return { text: words.join(" "), attributes };
}

export function searchParams(search: string) {
  const { text, attributes } = parseSearch(search);
  return { pattern: substringPattern(text), attributes: JSON.stringify(attributes) };
}
