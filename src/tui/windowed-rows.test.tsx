import { expect, test } from "bun:test";

import { render, textLines } from "../testing/render.tsx";
import { FocusScope } from "./focus.tsx";
import { useListState } from "./use-list-state.ts";
import { WindowedRows } from "./windowed-rows.tsx";

const SIZE = { width: 20, height: 5 };
const PAGE_DOWN = "\x1b[6~";
const PAGE_UP = "\x1b[5~";
const SCROLL_INDICATOR = "█";

interface NumberedRowsProps {
  count: number;
}

function NumberedRows({ count }: NumberedRowsProps) {
  const rows = Array.from({ length: count }, (_, index) => `row ${index + 1}`);
  const list = useListState({ items: rows, getKey: (row) => row });

  return (
    <WindowedRows state={list}>
      {(row, selected) => <text>{`${selected ? ">" : " "} ${row}`}</text>}
    </WindowedRows>
  );
}

function visibleRows(frame: string) {
  return textLines(frame.replaceAll(SCROLL_INDICATOR, ""));
}

function indicatorLine(frame: string) {
  return frame.split("\n").findIndex((line) => line.includes(SCROLL_INDICATOR));
}

function selected(row: number) {
  return (frame: string) => visibleRows(frame).includes(`> row ${row}`);
}

test("renders only the rows that fit", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);

  const frame = await screen.waitForFrame(selected(1));

  expect(visibleRows(frame)).toEqual(["> row 1", "row 2", "row 3", "row 4", "row 5"]);
});

test("keeps the selection in the middle as it moves down", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  for (const row of [2, 3, 4]) {
    screen.mockInput.pressArrow("down");
    await screen.waitForFrame(selected(row));
  }

  const frame = await screen.waitForFrame(selected(4));
  expect(visibleRows(frame)).toEqual(["row 2", "row 3", "> row 4", "row 5", "row 6"]);
});

test("moves with j and k", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  screen.mockInput.pressKey("j");
  await screen.waitForFrame(selected(2));
  screen.mockInput.pressKey("k");

  await screen.waitForFrame(selected(1));
});

test("stops at the first and last rows", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  screen.mockInput.pressArrow("up");
  await screen.waitForFrame(() => true);
  screen.mockInput.pressArrow("down");
  await screen.waitForFrame(selected(2));

  screen.mockInput.pressKey("END");
  let frame = await screen.waitForFrame(selected(20));
  expect(visibleRows(frame)).toEqual(["row 16", "row 17", "row 18", "row 19", "> row 20"]);

  screen.mockInput.pressArrow("down");
  await screen.waitForFrame(() => true);
  screen.mockInput.pressArrow("up");
  frame = await screen.waitForFrame(selected(19));
  expect(visibleRows(frame)).toContain("row 20");
});

test("pages by the number of visible rows", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  screen.mockInput.pressKey(PAGE_DOWN);
  await screen.waitForFrame(selected(6));
  screen.mockInput.pressKey(PAGE_DOWN);
  await screen.waitForFrame(selected(11));
  screen.mockInput.pressKey(PAGE_UP);
  await screen.waitForFrame(selected(6));
  screen.mockInput.pressKey("HOME");

  await screen.waitForFrame(selected(1));
});

test("moves the selection once for every scroll event, however fast they come", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  await Promise.all([
    screen.mockMouse.scroll(2, 1, "down"),
    screen.mockMouse.scroll(2, 1, "down"),
    screen.mockMouse.scroll(2, 1, "down"),
  ]);
  await screen.waitForFrame(selected(4));

  await Promise.all([screen.mockMouse.scroll(2, 1, "up"), screen.mockMouse.scroll(2, 1, "up")]);
  await screen.waitForFrame(selected(2));
});

test("places the scroll indicator by how far the list has scrolled", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  expect(indicatorLine(await screen.waitForFrame(selected(1)))).toBe(0);

  screen.mockInput.pressKey("END");

  expect(indicatorLine(await screen.waitForFrame(selected(20)))).toBe(SIZE.height - 1);
});

test("leaves out the scroll indicator when every row fits", async () => {
  await using screen = await render(<NumberedRows count={3} />, SIZE);

  const frame = await screen.waitForFrame(selected(1));

  expect(visibleRows(frame)).toEqual(["> row 1", "row 2", "row 3"]);
  expect(frame).not.toContain(SCROLL_INDICATOR);
});

test("ignores keys while its scope is not focused", async () => {
  await using screen = await render(
    <box flexDirection="row" flexGrow={1}>
      <box flexGrow={1}>
        <NumberedRows count={3} />
      </box>
      <box flexGrow={1}>
        <FocusScope focused={false}>
          <NumberedRows count={3} />
        </FocusScope>
      </box>
    </box>,
    { width: 40, height: 5 },
  );
  await screen.waitForFrame((frame) => visibleRows(frame)[0] === "> row 1 > row 1");

  screen.mockInput.pressArrow("down");

  const frame = await screen.waitForFrame((frame) => visibleRows(frame)[1] === "> row 2 row 2");
  expect(visibleRows(frame)).toEqual(["row 1 > row 1", "> row 2 row 2", "row 3 row 3"]);
});

test("shows more rows after the terminal grows", async () => {
  await using screen = await render(<NumberedRows count={20} />, SIZE);
  await screen.waitForFrame(selected(1));

  screen.resize(SIZE.width, 8);

  const frame = await screen.waitForFrame((frame) => visibleRows(frame).includes("row 8"));
  expect(visibleRows(frame)).toHaveLength(8);
});
