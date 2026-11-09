import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { INVENTORY_CAPACITY } from "../../game/balance";
import type { Digit, Tile } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import tileStyles from "../Tile/Tile.module.css";
import { TileInventory, type TileInventoryProps } from "./TileInventory";
import rackStyles from "./TileInventory.module.css";

const tile = (digit: Digit, id: string, isNew = false): Tile => ({ id, digit, isNew });

/** Renders the rack with stable callbacks and exposes a same-tree rerender helper. */
function renderInventory(overrides: Partial<TileInventoryProps> = {}) {
  const onTile = vi.fn();
  const onSettled = vi.fn();
  const inventory = (props: Partial<TileInventoryProps>) => (
    <I18nProvider initialLanguage="en">
      <TileInventory
        tiles={[]}
        mode="select"
        pendingDiscards={[]}
        liftedIds={[]}
        capacity={INVENTORY_CAPACITY}
        onTile={onTile}
        onSettled={onSettled}
        {...props}
      />
    </I18nProvider>
  );
  const result = render(inventory(overrides));
  return {
    onTile,
    onSettled,
    container: result.container,
    // The rack holds a departing tile across a props change, so the moments
    // that outlive one render can only be read by re-rendering the same tree.
    rerender: (next: Partial<TileInventoryProps>) =>
      result.rerender(inventory({ ...overrides, ...next })),
  };
}

// The rack renders a fixed grid of cells (one child per socket or tile),
// independent of accessible roles — an empty or lifted cell carries no role
// at all, so cell count has to be read off the DOM shape rather than a query
// that only ever finds buttons.
function cellCount(container: HTMLElement): number {
  return cells(container).length;
}

function cells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelector(`.${rackStyles.inventory}`)?.children ?? []) as HTMLElement[];
}

// The rail band above the grid, where tiles past capacity perch (§1.12).
function railCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelector(`.${rackStyles.rail}`)?.children ?? []) as HTMLElement[];
}

// The one motion fact jsdom can settle: which element the cascade puts an
// animation on. Durations, distances and appearance are measured in a browser.
function animationOn(cell: HTMLElement): string {
  return getComputedStyle(cell).animationName;
}

// React picks the event name onAnimationEnd listens for by feature-detecting
// window.AnimationEvent, and jsdom implements no such constructor — so under
// test React is bound to the webkit-prefixed name and fireEvent.animationEnd
// alone reaches nothing. Both are dispatched, so this says "the animation
// ended" rather than "this jsdom ended it", and keeps saying it if jsdom ever
// grows the constructor and React switches back to the unprefixed name.
function endAnimation(cell: HTMLElement): void {
  fireEvent.animationEnd(cell);
  fireEvent(cell, new Event("webkitAnimationEnd", { bubbles: true }));
}

// jsdom has no AnimationEvent constructor, so the name a real cancel carries
// is set by hand.
function cancelEvent(animationName: string): Event {
  return Object.assign(new Event("animationcancel", { bubbles: true }), { animationName });
}

// Ten seated tiles and one on the rail, as the reducer leaves an Endless
// overflow: sorted seats, the newest arrival past capacity.
function railedRack(): Tile[] {
  return [
    ...Array.from({ length: 10 }, (_, index) => tile((index % 10) as Digit, `s${index}`)),
    tile(7, "rail", true),
  ];
}

describe("TileInventory", () => {
  it("renders tiles in the exact order given", () => {
    renderInventory({
      tiles: [tile(0, "a"), tile(2, "b"), tile(2, "c"), tile(5, "d")],
    });
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Digit 0",
      "Digit 2",
      "Digit 2",
      "Digit 5",
    ]);
  });

  it("invokes the callback with the exact id of the duplicate tile clicked", async () => {
    const { onTile } = renderInventory({
      tiles: [tile(2, "b"), tile(2, "c")],
    });
    const duplicates = screen.getAllByRole("button", { name: "Digit 2" });
    await userEvent.click(duplicates[1]);
    expect(onTile).toHaveBeenCalledTimes(1);
    expect(onTile).toHaveBeenCalledWith("c");
  });

  it("marks a new tile with a textual label and visible state", () => {
    renderInventory({
      tiles: [tile(7, "a", true)],
    });
    expect(screen.getByRole("button", { name: "Digit 7, New tile" })).toBeInTheDocument();
    // The badge span is gone (#84); the reward state is what now makes a new
    // tile visibly distinct, so that is what the test has to hold on to.
    expect(screen.getByRole("button", { name: "Digit 7, New tile" })).toHaveClass(tileStyles.reward);
  });

  it("marks a pending discard with a textual label and pressed state", () => {
    renderInventory({
      mode: "discard",
      tiles: [tile(3, "a")],
      pendingDiscards: ["a"],
    });
    const button = screen.getByRole("button", { name: "Digit 3, Marked for discard" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  // The whole rack is a toggle set while discarding, so an unmarked tile has
  // to say so. Reporting only the marked tile's "true" would leave the other
  // nine announcing as plain buttons with nothing to suggest they can be
  // marked at all.
  it("reports the unmarked tiles as unpressed while discarding", () => {
    renderInventory({
      mode: "discard",
      tiles: [tile(3, "a"), tile(4, "b")],
      pendingDiscards: ["a"],
    });
    expect(screen.getByRole("button", { name: "Digit 4" })).toHaveAttribute("aria-pressed", "false");
  });

  // Whether the rack ends up on screen is layout, which only a browser can
  // measure; jsdom can hold the call, its options, and that it happens once.
  it("scrolls the rack into view once, instantly, when a discard starts", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const { container, rerender } = renderInventory({ tiles: railedRack() });
    expect(scroll).not.toHaveBeenCalled();

    rerender({ mode: "discard" });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior: "instant" });
    expect(scroll.mock.contexts[0]).toBe(container.querySelector(`.${rackStyles.rack}`));

    rerender({ mode: "discard", pendingDiscards: ["s0"] });
    expect(scroll).toHaveBeenCalledTimes(1);
    scroll.mockRestore();
  });

  it("does not mark a tile as pending discard outside discard mode", () => {
    renderInventory({
      mode: "select",
      tiles: [tile(3, "a")],
      pendingDiscards: ["a"],
    });
    expect(screen.getByRole("button", { name: "Digit 3" })).toBeInTheDocument();
  });

  it("does not invoke the callback in read-only mode", async () => {
    const { onTile } = renderInventory({
      mode: "readOnly",
      tiles: [tile(4, "a")],
    });
    const button = screen.getByRole("button", { name: "Digit 4" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onTile).not.toHaveBeenCalled();
  });

  it("renders ten cells whether one tile is held or all ten are", () => {
    const { container: oneHeld } = renderInventory({ tiles: [tile(1, "a")] });
    expect(cellCount(oneHeld)).toBe(INVENTORY_CAPACITY);
    cleanup();

    const tenHeld = Array.from({ length: 10 }, (_, index) =>
      tile((index % 10) as Digit, `t${index}`),
    );
    const { container: allHeld } = renderInventory({ tiles: tenHeld });
    expect(cellCount(allHeld)).toBe(INVENTORY_CAPACITY);
  });

  // M6·1 reads every seat's layout after each commit to re-seat at a size
  // change; Endless never changes size, so its taps pay for no forced layout.
  it("reads no layout on an Endless render", () => {
    const offsetLeft = vi.spyOn(HTMLElement.prototype, "offsetLeft", "get");
    try {
      const tiles = railedRack().slice(0, 10);
      const { rerender } = renderInventory({ tiles });
      rerender({ tiles: tiles.slice(1) });
      expect(offsetLeft).not.toHaveBeenCalled();
    } finally {
      offsetLeft.mockRestore();
    }
  });

  it("keeps ten sockets and perches an eleventh tile on the rail, never in a new row", () => {
    const eleven = Array.from({ length: 11 }, (_, index) => tile(0, `t${index}`));
    const { container } = renderInventory({ tiles: eleven });
    expect(cellCount(container)).toBe(10);
    expect(railCells(container)).toHaveLength(1);
  });

  it("draws no rail while nothing is past capacity", () => {
    const { container } = renderInventory({ tiles: [tile(1, "a")] });
    expect(container.querySelector(`.${rackStyles.rail}`)).toBeNull();
  });

  it("keeps the cell count and every other tile's cell unchanged when a tile becomes lifted", () => {
    const tiles = [tile(1, "a"), tile(2, "b"), tile(3, "c")];
    const { container: before } = renderInventory({ tiles });
    const textsBefore = cells(before).map((cell) => cell.textContent);
    cleanup();

    const { container: after } = renderInventory({ tiles, liftedIds: ["b"] });
    const textsAfter = cells(after).map((cell) => cell.textContent);

    expect(textsAfter).toHaveLength(textsBefore.length);
    expect(textsAfter[0]).toBe(textsBefore[0]); // tile "a" untouched
    expect(textsAfter[2]).toBe(textsBefore[2]); // tile "c" untouched
    expect(textsAfter[1]).toBe(""); // tile "b"'s cell is now an empty-looking socket
  });

  it("gives a lifted cell no Digit accessible name", () => {
    renderInventory({ tiles: [tile(4, "a")], liftedIds: ["a"] });
    expect(screen.queryByRole("button", { name: /^Digit \d$/ })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("fires 9i on an arriving tile and leaves the residents still", () => {
    const { container } = renderInventory({ tiles: [tile(7, "a", true), tile(3, "b")] });
    expect(animationOn(cells(container)[0])).toBe("oz-fire");
    expect(animationOn(cells(container)[1])).toBe("none");
  });

  // 9i plays on arrival and never again. React reuses the cell's DOM node
  // across a re-render, and an animation-name that does not change starts no
  // new animation — so the node's identity is what makes the once true.
  it("does not restart 9i when a discard is toggled under it", () => {
    const tiles = [tile(7, "a", true)];
    const { container, rerender } = renderInventory({ tiles, mode: "discard" });
    const before = cells(container)[0];
    const classesBefore = before.className;
    rerender({ pendingDiscards: ["a"] });
    const after = cells(container)[0];
    expect(after).toBe(before);
    expect(after.className).toBe(classesBefore);
    expect(animationOn(after)).toBe("oz-fire");
  });

  it("rim-rejects the perched tile and none of the ten sockets", () => {
    const eleven = Array.from({ length: 11 }, (_, index) => tile(0, `t${index}`));
    const { container } = renderInventory({ tiles: eleven });
    expect(animationOn(railCells(container)[0])).toBe("oz-rim-reject");
    expect(cells(container).slice(0, INVENTORY_CAPACITY).map(animationOn)).toEqual(
      Array.from({ length: INVENTORY_CAPACITY }, () => "none"),
    );
  });

  // 8a is positional and 9i is per-tile, and the tile that overflows the rack
  // is a reward tile almost every time — so the two collide on the eleventh
  // cell. It is the arrival that did not land, so it rim-rejects.
  it("rim-rejects an eleventh cell that holds a reward tile rather than firing it", () => {
    const eleven = Array.from({ length: 11 }, (_, index) => tile(0, `t${index}`, index === 10));
    const { container } = renderInventory({ tiles: eleven });
    expect(animationOn(railCells(container)[0])).toBe("oz-rim-reject");
  });

  it("holds a confirmed discard in its own cell and retires it on animationend", () => {
    const tiles = [tile(1, "a"), tile(2, "b"), tile(3, "c")];
    const { container, rerender } = renderInventory({
      tiles,
      mode: "discard",
      pendingDiscards: ["b"],
    });
    rerender({ tiles: [tiles[0], tiles[2]], mode: "readOnly", pendingDiscards: [] });

    const departing = cells(container)[1];
    expect(departing.textContent).toBe("2");
    expect(animationOn(departing)).toBe("oz-slide-off");
    expect(cells(container)[2].textContent).toBe("3");

    endAnimation(departing);
    expect(cells(container)[1].textContent).toBe("3");
  });

  // The only discard the product can actually reach. INVENTORY_CAPACITY plus
  // REWARD_BONUS caps overflow at one tile, so GameScreen dispatches
  // TOGGLE_DISCARD and CONFIRM_DISCARD from the same click handler; React
  // batches them, and the rack is never once rendered with the tile's id in
  // pendingDiscards. Measured in a browser against the real game: keying the
  // exit off pendingDiscards meant 8c never played at all.
  it("tips off a discard that was never rendered as pending", () => {
    const tiles = [tile(1, "a"), tile(2, "b"), tile(3, "c")];
    const { container, rerender } = renderInventory({
      tiles,
      mode: "discard",
      pendingDiscards: [],
    });
    rerender({ tiles: [tiles[0], tiles[2]], mode: "readOnly", pendingDiscards: [] });

    const departing = cells(container)[1];
    expect(departing.textContent).toBe("2");
    expect(animationOn(departing)).toBe("oz-slide-off");
  });

  // A tile leaving the rack from the answering phase was submitted, not
  // discarded, and the slots already carry it — tipping it off the end would
  // draw it in two places going two ways.
  it("does not tip off a tile that leaves while the rack is selectable", () => {
    const tiles = [tile(1, "a"), tile(2, "b"), tile(3, "c")];
    const { container, rerender } = renderInventory({
      tiles,
      mode: "select",
      pendingDiscards: [],
    });
    rerender({ tiles: [tiles[0], tiles[2]], mode: "readOnly", pendingDiscards: [] });

    expect(cells(container)[1].textContent).toBe("3");
  });

  // A reward tile is the usual thing to discard, so this is the ordinary case
  // rather than the odd one: if 9i kept the cell, its animation-name would not
  // change, no animation would start, animationend would never fire and the
  // tile would sit in the rack for the rest of the run.
  it("tips off a departing reward tile instead of leaving it firing", () => {
    const tiles = [tile(7, "a", true), tile(3, "b")];
    const { container, rerender } = renderInventory({
      tiles,
      mode: "discard",
      pendingDiscards: ["a"],
    });
    rerender({ tiles: [tiles[1]], mode: "readOnly", pendingDiscards: [] });

    const departing = cells(container)[0];
    expect(animationOn(departing)).toBe("oz-slide-off");
    endAnimation(departing);
    expect(cells(container)[0].textContent).toBe("3");
  });

  // The departing tile has already left the game: the reducer dropped it and
  // nothing outside the rack knows it is still drawn.
  it("gives a departing tile no role and no accessible name", () => {
    const tiles = [tile(1, "a"), tile(2, "b")];
    const { container, rerender } = renderInventory({
      tiles,
      mode: "discard",
      pendingDiscards: ["b"],
    });
    rerender({ tiles: [tiles[0]], mode: "readOnly", pendingDiscards: [] });

    const departing = cells(container)[1];
    expect(departing).toHaveAttribute("aria-hidden", "true");
    expect(departing.querySelector("button")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Digit 2$/ })).not.toBeInTheDocument();
  });

  // Only a discard tips off. A submitted tile leaves the rack too — it is
  // consumed by SUBMIT_CORRECT — and holding that one would draw a tile back
  // into a socket the player just emptied.
  it("does not hold a tile that leaves without having been marked", () => {
    const tiles = [tile(1, "a"), tile(2, "b")];
    const { container, rerender } = renderInventory({ tiles });
    rerender({ tiles: [tiles[0]] });
    expect(cells(container)[1].textContent).toBe("");
  });

  it("sizes the rack by the capacity it is given, and rim-rejects the first cell past it", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => tile((index % 10) as Digit, `t${index}`));
    const { container } = renderInventory({ tiles: twenty, capacity: 19 });
    expect(cellCount(container)).toBe(19);
    expect(railCells(container).map(animationOn)).toEqual(["oz-rim-reject"]);
    expect(animationOn(cells(container)[10])).toBe("none");
    cleanup();

    const { container: sparse } = renderInventory({ tiles: [tile(1, "a")], capacity: 19 });
    expect(cellCount(sparse)).toBe(19);
  });

  // The grid is five columns wide, so five sockets fill one row and
  // six need the second.
  it("draws one row for five sockets and keeps two rows for six", () => {
    const { container: five } = renderInventory({ capacity: 5 });
    expect(five.querySelector(`.${rackStyles.rack}`)).toHaveAttribute("data-size", "row");
    cleanup();

    const { container: six } = renderInventory({ capacity: 6 });
    expect(six.querySelector(`.${rackStyles.rack}`)).not.toHaveAttribute("data-size");
  });

  // The reducer seats a surviving rail tile in the freed socket in the same
  // action that drops the discarded one. Splicing the departing tile back in
  // would shove every later tile one cell over; the rack instead keeps
  // drawing the hand as it stood until the departure has played.
  it("draws the pre-discard hand while a seated tile departs, then the reducer's", () => {
    const before = railedRack();
    const after = [...before.slice(0, 10)];
    after[4] = before[10]!;
    const { container, rerender } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: after, mode: "readOnly" });

    expect(cells(container)[4].textContent).toBe("4");
    expect(cells(container)[5].textContent).toBe("5");
    expect(railCells(container)[0].textContent).toBe("7");

    endAnimation(cells(container)[4]);
    expect(cellCount(container)).toBe(10);
    expect(railCells(container)).toHaveLength(0);
    expect(cells(container)[4].textContent).toBe("7");
    expect(cells(container)[5].textContent).toBe("5");
  });

  it("settles once, when the last of two departing tiles has played", () => {
    const before = [...railedRack(), tile(8, "rail-2", true)];
    const after = [...before.slice(0, 10)];
    after[2] = before[10]!;
    after[6] = before[11]!;
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: after, mode: "readOnly" });

    endAnimation(cells(container)[2]);
    expect(onSettled).not.toHaveBeenCalled();
    endAnimation(cells(container)[6]);
    // Both rail tiles now drop into the freed seats (8a·2); the discard
    // settles when they land.
    expect(onSettled).not.toHaveBeenCalled();
    endAnimation(cells(container)[2]);
    endAnimation(cells(container)[6]);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // Two tiles leaving together finish in the same frame, and React batches the
  // updates their animationend handlers make. Measured in a real browser: a
  // retire that read the departure from its render's closure let the second
  // handler undo the first, one id was never retired, and the run froze.
  it("settles when two departures end in the same batch", () => {
    const before = [...railedRack(), tile(8, "rail-2", true)];
    const after = [...before.slice(0, 10)];
    after[2] = before[10]!;
    after[6] = before[11]!;
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: after, mode: "readOnly" });

    const [first, second] = [cells(container)[2], cells(container)[6]];
    const endTogether = (pair: HTMLElement[]) =>
      act(() => {
        for (const cell of pair) {
          cell.dispatchEvent(new Event("animationend", { bubbles: true }));
          cell.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }));
        }
      });
    endTogether([first, second]);
    // The two perched tiles land together too.
    endTogether([cells(container)[2], cells(container)[6]]);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // 8a·2: the tile perched on the rail takes the seat the discard freed, and
  // falls into it from where it perched — the perch was real, so the fall is.
  it("drops the surviving rail tile into the freed seat, and settles when it lands", () => {
    const before = railedRack();
    const after = [...before.slice(0, 10)];
    after[4] = before[10]!;
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: after, mode: "readOnly" });

    // jsdom lays nothing out, so place the perch up and to the right of seat 4:
    // the drop's offsets are rail minus seat, and a flipped sign would show.
    const at = (element: HTMLElement, rail: number, seat: number) =>
      element.dataset.rail !== undefined ? rail : element.dataset.cell === "4" ? seat : 0;
    const offsetLeft = vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
      return at(this, 200, 120);
    });
    const offsetTop = vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (this: HTMLElement) {
      return at(this, 9, 90);
    });
    try {
      endAnimation(cells(container)[4]); // the slide-off
    } finally {
      offsetLeft.mockRestore();
      offsetTop.mockRestore();
    }
    const seated = cells(container)[4];
    expect(seated.textContent).toBe("7");
    expect(animationOn(seated)).toBe("oz-perch-drop");
    expect(seated.style.getPropertyValue("--dx")).toBe("80px");
    expect(seated.style.getPropertyValue("--dy")).toBe("-81px");
    // The rail stays in flow until the tile lands: dropping it with the fall
    // would move the seat up by the rail's height under the measured offsets.
    expect(container.querySelector(`.${rackStyles.rail}`)).not.toBeNull();
    expect(onSettled).not.toHaveBeenCalled();

    endAnimation(seated);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(container.querySelector(`.${rackStyles.rail}`)).toBeNull();
    expect(animationOn(cells(container)[4])).not.toBe("oz-perch-drop");
    // Still new until the round changes, the landed tile must not fire 9i:
    // oz-fire starts from nothing and would blink it out of the seat.
    expect(animationOn(cells(container)[4])).not.toBe("oz-fire");
  });

  it("settles when the rail tile itself is the one discarded", () => {
    const before = railedRack();
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: before.slice(0, 10), mode: "readOnly" });

    endAnimation(railCells(container)[0]);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(cellCount(container)).toBe(10);
  });

  // With Next Round gone after a discard, a departure that never reports its
  // end would freeze the run. A cancelled animation still ends the departure.
  it("settles on animationcancel as well as animationend", () => {
    const before = railedRack();
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: before.slice(0, 10), mode: "readOnly" });

    // React has no onAnimationCancel, so the rack listens natively.
    fireEvent(railCells(container)[0], cancelEvent("oz-slide-off"));
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // Swapping a cell's animation-name cancels the animation it replaces: a
  // reward tile discarded inside its 380ms 9i fire cancels oz-fire as its exit
  // starts. That cancel is not the exit's, and must not settle the discard.
  it("ignores the cancel of the animation a departing cell replaced", () => {
    const before = railedRack();
    const { container, rerender, onSettled } = renderInventory({ tiles: before, mode: "discard" });
    rerender({ tiles: before.slice(0, 10), mode: "readOnly" });

    fireEvent(railCells(container)[0], cancelEvent("oz-fire"));
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("does not settle for a tile that leaves the rack by submission", () => {
    const tiles = [tile(1, "a"), tile(2, "b")];
    const { rerender, onSettled } = renderInventory({ tiles });
    rerender({ tiles: [tiles[0]] });
    expect(onSettled).not.toHaveBeenCalled();
  });
});
