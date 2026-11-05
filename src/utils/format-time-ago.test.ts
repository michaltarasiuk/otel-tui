import { expect, test } from "bun:test";

import { formatTimeAgo } from "./format-time-ago.ts";

test("rounds down to whole seconds, minutes, or hours", () => {
  expect(formatTimeAgo(999)).toBe("just now");
  expect(formatTimeAgo(1000)).toBe("1s ago");
  expect(formatTimeAgo(59_999)).toBe("59s ago");
  expect(formatTimeAgo(60_000)).toBe("1m ago");
  expect(formatTimeAgo(3_599_999)).toBe("59m ago");
  expect(formatTimeAgo(90_000_000)).toBe("25h ago");
});
