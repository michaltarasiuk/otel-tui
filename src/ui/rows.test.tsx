import { expect, test } from "bun:test";

import { use } from "react";

import { render } from "#testing/render.tsx";
import { textLines } from "#testing/screen.ts";

import { FocusScope } from "./focus.tsx";
import { Rows } from "./rows.tsx";
import { SelectedContext } from "./table.tsx";
import { useSelection } from "./use-selection.ts";

const SCREEN_SIZE = { width: 20, height: 5 };

const PAGE_DOWN = "\x1b[6~";
const PAGE_UP = "\x1b[5~";

const SCROLL_INDICATOR = "█";

interface NumberedRowProps {
  name: string;
}

function NumberedRow({ name }: NumberedRowProps) {
  const selected = use(SelectedContext);

  return <text>{`${selected ? ">" : " "} ${name}`}</text>;
}

interface NumberedRowsProps {
  count: number;
  halfPageKeys?: boolean;
}

function NumberedRows({ count, halfPageKeys = false }: NumberedRowsProps) {
  const rows = Array.from({ length: count }, (_, index) => `row ${index + 1}`);
  const [selectedIndex, select] = useSelection(rows, (row) => row);

  return (
    <Rows
      items={rows}
      getKey={(row) => row}
      selectedIndex={selectedIndex}
      onSelect={(action) => select(action)}
      halfPageKeys={halfPageKeys}
    >
      {(row) => <NumberedRow name={row} />}
    </Rows>
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
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);

  const frame = await screen.waitForFrame(selected(1));

  expect(visibleRows(frame)).toEqual(["> row 1", "row 2", "row 3", "row 4", "row 5"]);
});

test("keeps the selection in the middle as it moves down", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  await screen.waitForFrame(selected(1));

  for (const row of [2, 3, 4]) {
    screen.mockInput.pressArrow("down");
    await screen.waitForFrame(selected(row));
  }

  const frame = await screen.waitForFrame(selected(4));
  expect(visibleRows(frame)).toEqual(["row 2", "row 3", "> row 4", "row 5", "row 6"]);
});

test("moves with j and k", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  await screen.waitForFrame(selected(1));

  screen.mockInput.pressKey("j");
  await screen.waitForFrame(selected(2));
  screen.mockInput.pressKey("k");

  await screen.waitForFrame(selected(1));
});

test("stops at the first and last rows", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
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
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
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

test("moves half a page with ctrl+d and ctrl+u when asked", async () => {
  await using screen = await render(<NumberedRows count={20} halfPageKeys />, SCREEN_SIZE);
  await screen.waitForFrame(selected(1));

  screen.mockInput.pressKey("d", { ctrl: true });
  await screen.waitForFrame(selected(3));
  screen.mockInput.pressKey("d", { ctrl: true });
  await screen.waitForFrame(selected(5));
  screen.mockInput.pressKey("u", { ctrl: true });

  await screen.waitForFrame(selected(3));
});

test("selects the row a click lands on", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  await screen.waitForFrame(selected(1));

  await screen.mockMouse.click(2, 3);

  await screen.waitForFrame(selected(4));
});

test("moves the selection once for every scroll event, however fast they come", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
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
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  const frame = await screen.waitForFrame((frame) => frame.includes(SCROLL_INDICATOR));
  expect(indicatorLine(frame)).toBe(0);

  screen.mockInput.pressKey("END");

  expect(indicatorLine(await screen.waitForFrame(selected(20)))).toBe(SCREEN_SIZE.height - 1);
});

test("draws the scroll indicator only beside rows", async () => {
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  const framesWithoutRows: string[] = [];

  await screen.waitForFrame((frame) => {
    if (frame.includes(SCROLL_INDICATOR) && visibleRows(frame).length === 0) {
      framesWithoutRows.push(frame);
    }
    return selected(1)(frame);
  });

  expect(framesWithoutRows).toEqual([]);
});

test("leaves out the scroll indicator when every row fits", async () => {
  await using screen = await render(<NumberedRows count={3} />, SCREEN_SIZE);

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
  await using screen = await render(<NumberedRows count={20} />, SCREEN_SIZE);
  await screen.waitForFrame(selected(1));

  screen.resize(SCREEN_SIZE.width, 8);

  const frame = await screen.waitForFrame((frame) => visibleRows(frame).includes("row 8"));
  expect(visibleRows(frame)).toHaveLength(8);
});
