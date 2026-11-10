import { type CapturedFrame, type CapturedSpan, RGBA } from "@opentui/core";

import { THEME } from "#tui/theme/theme.ts";
import { collapseWhitespace } from "#utils/text.ts";

const DETAILS_BORDER = "─";
const SCROLLBAR = /[▀-▟]/g;
const TABLE_ROW = /^\d{2}:\d{2}:\d{2}\.\d{3} /;
const CHART_TITLE = /^\w+ over time /;

export const CHART_DOTS = /[⠁-⣿]/;
export const selectedBackground = RGBA.fromHex(THEME.backgroundSelected);
const textForeground = RGBA.fromHex(THEME.text);

const TAB_NAMES = ["Services", "Traces", "Metrics", "Logs"];

interface TabStyle {
  highlighted: boolean;
  fg: "text" | "muted";
}

export function textLines(frame: string) {
  return frame
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter((line) => line !== "");
}

export function tabBar(frame: string) {
  return textLines(frame)[0] ?? "";
}

export function pageHeader(frame: string) {
  return textLines(frame)[1] ?? "";
}

export function chartLines(frame: string) {
  const lines = textLines(frame);
  const title = lines.findIndex((line) => CHART_TITLE.test(line));
  const firstRow = lines.findIndex((line) => TABLE_ROW.test(line));
  const columnHeader = firstRow - 1;
  return title === -1 || firstRow === -1 ? [] : lines.slice(title, columnHeader);
}

export function listLines(frame: string) {
  const lines = textLines(frame);
  const border = lines.findIndex((line) => line.startsWith(DETAILS_BORDER));
  return border === -1 ? [] : lines.slice(1, border);
}

export function tableRows(frame: string) {
  return textLines(frame).filter((line) => TABLE_ROW.test(line));
}

export function detailsLines(frame: string) {
  const lines = textLines(frame.replaceAll(SCROLLBAR, ""));
  const border = lines.findIndex((line) => line.startsWith(DETAILS_BORDER));
  return border === -1 ? [] : lines.slice(border + 1, -1);
}

export function spanRows(frame: string) {
  const lines = frame.split("\n");
  const header = lines.findIndex((line) => line.includes("Service") && line.includes("Duration"));
  const panel = lines.findIndex((line) => line.startsWith(DETAILS_BORDER));
  if (header === -1 || panel === -1) {
    return [];
  }
  return lines.slice(header + 1, panel).filter((line) => line.trim() !== "");
}

export function keyHints(frame: string) {
  return textLines(frame).at(-1) ?? "";
}

export function onList(frame: string) {
  return frame.includes("/ search");
}

export function onDetails(frame: string) {
  return frame.includes("escape back");
}

export function lineSpans({ lines }: CapturedFrame, text: string) {
  const line = lines.find(({ spans }) =>
    spans
      .map((span) => span.text)
      .join("")
      .includes(text),
  );
  return line?.spans ?? [];
}

export function spanColors(spans: CapturedSpan[], text: string) {
  const span = spans.find((span) => span.text.trim().startsWith(text));
  return { fg: span?.fg.toInts(), bg: span?.bg.toInts() };
}

export function color(hex: string) {
  return RGBA.fromHex(hex).toInts();
}

export function tabStyles({ lines: [tabBar] }: CapturedFrame) {
  const styles: Record<string, TabStyle> = {};
  for (const span of tabBar?.spans ?? []) {
    const name = span.text.trim();
    if (!TAB_NAMES.includes(name)) {
      continue;
    }
    styles[name] = {
      highlighted: span.bg.equals(selectedBackground),
      fg: span.fg.equals(textForeground) ? "text" : "muted",
    };
  }
  return styles;
}
