import { THEME } from "./theme.ts";

const ABOVE_ROWS = 1;

interface ScrollIndicatorProps {
  firstVisibleIndex: number;
  visibleRowCount: number;
  rowCount: number;
}

export function ScrollIndicator({
  firstVisibleIndex,
  visibleRowCount,
  rowCount,
}: ScrollIndicatorProps) {
  const hiddenRowCount = rowCount - visibleRowCount;
  if (hiddenRowCount <= 0) {
    return null;
  }

  const top = Math.round((firstVisibleIndex / hiddenRowCount) * (visibleRowCount - 1));
  return (
    <text position="absolute" right={0} top={top} zIndex={ABOVE_ROWS} fg={THEME.textMuted}>
      █
    </text>
  );
}
