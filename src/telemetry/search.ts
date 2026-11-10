import { parseDuration } from "#utils/time.ts";

import { substringPattern } from "./like-pattern.ts";

const OPERATORS = ["=", "!=", ">", ">=", "<", "<="] as const;
type Operator = (typeof OPERATORS)[number];

const FILTER_TERM = /^([^\s=!<>]+)(!=|>=|<=|=|>|<)(\S*)$/;

const DURATION_KEY = "duration";

interface Filter {
  key: string;
  operator: Operator;
  value: string;
  number: number | null;
}

function isOperator(text: string): text is Operator {
  return OPERATORS.some((operator) => operator === text);
}

function isOrdered(operator: Operator) {
  return operator !== "=" && operator !== "!=";
}

function parseNumber(key: string, value: string) {
  if (key === DURATION_KEY) {
    return parseDuration(value);
  }
  const number = Number(value);
  return value === "" || Number.isNaN(number) ? undefined : number;
}

function parseFilter(term: string): Filter | undefined {
  const match = FILTER_TERM.exec(term);
  const [, key, operator, value] = match ?? [];
  if (key === undefined || operator === undefined || !isOperator(operator) || value === undefined) {
    return undefined;
  }
  if (!isOrdered(operator)) {
    return { key, operator, value, number: null };
  }
  const number = parseNumber(key, value);
  return number === undefined ? undefined : { key, operator, value, number };
}

export function parseSearch(search: string) {
  const words: string[] = [];
  const attributes: Filter[] = [];

  for (const term of search.split(/\s+/)) {
    const filter = parseFilter(term);
    if (filter !== undefined) {
      attributes.push(filter);
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
