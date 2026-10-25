import type { BoxRenderable, ColorInput } from "@opentui/core";
import { useRef, useState } from "react";

import { COLUMN_GAP } from "../columns.ts";
import { THEME } from "../theme.ts";
import { type Bucket, bucketsOf, coarsen, type Distribution } from "./distribution.ts";
import { formatMetricValue } from "./metric-value.ts";

const MAX_BUCKETS = 16;
const LABEL_WIDTH = 11;
const COUNT_WIDTH = 9;
const BAR_MARK = "■";

function nonEmptyRange(buckets: Bucket[]) {
  const first = buckets.findIndex((bucket) => bucket.count > 0);
  const last = buckets.findLastIndex((bucket) => bucket.count > 0);
  return first === -1 ? [] : buckets.slice(first, last + 1);
}

function bucketLabel({ lower, upper }: Bucket, unit: string) {
  return upper === Infinity
    ? `> ${formatMetricValue(lower, unit)}`
    : `≤ ${formatMetricValue(upper, unit)}`;
}

interface BucketBarsProps {
  distribution: Distribution;
  unit: string;
  color: ColorInput;
}

export function BucketBars({ distribution, unit, color }: BucketBarsProps) {
  const [width, setWidth] = useState(0);

  const barsRef = useRef<BoxRenderable>(null);

  const buckets = nonEmptyRange(bucketsOf(coarsen(distribution, MAX_BUCKETS)));
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count));
  const barColumns = Math.max(0, width - LABEL_WIDTH - COUNT_WIDTH - 2 * COLUMN_GAP);

  function barLength(count: number) {
    return count > 0 ? Math.max(1, Math.round((count / maxCount) * barColumns)) : 0;
  }

  return (
    <box ref={barsRef} onSizeChange={() => setWidth(barsRef.current?.width ?? 0)}>
      {buckets.map((bucket) => (
        <box key={`${bucket.lower} ${bucket.upper}`} flexDirection="row" gap={COLUMN_GAP}>
          <text width={LABEL_WIDTH} flexShrink={0} fg={THEME.textMuted} wrapMode="none" truncate>
            {bucketLabel(bucket, unit)}
          </text>
          <text flexGrow={1} fg={color} wrapMode="none">
            {BAR_MARK.repeat(barLength(bucket.count))}
          </text>
          <text width={COUNT_WIDTH} flexShrink={0} textAlign="right" fg={THEME.text}>
            {bucket.count.toLocaleString()}
          </text>
        </box>
      ))}
    </box>
  );
}
