import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Digit, Tile } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import { AnswerSlots, type AnswerSlotsProps } from "./AnswerSlots";
import styles from "./AnswerSlots.module.css";

const tile = (digit: Digit, id: string): Tile => ({ id, digit, isNew: false });

function slotsTree(onReturn: () => void, overrides: Partial<AnswerSlotsProps>) {
  return (
    <I18nProvider initialLanguage="en">
      <AnswerSlots
        slotCount={2}
        selectedTiles={[]}
        onReturn={onReturn}
        disabled={false}
        {...overrides}
      />
    </I18nProvider>
  );
}

function renderSlots(overrides: Partial<AnswerSlotsProps> = {}) {
  const onReturn = vi.fn();
  const view = render(slotsTree(onReturn, overrides));
  return {
    ...view,
    onReturn,
    rerenderSlots: (next: Partial<AnswerSlotsProps>) => view.rerender(slotsTree(onReturn, next)),
  };
}

describe("AnswerSlots", () => {
  it("renders exactly one slot for a one-digit product", () => {
    renderSlots({ slotCount: 1 });
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders exactly two slots for a two-digit product", () => {
    renderSlots({ slotCount: 2 });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows selected tile digits in slot order", () => {
    renderSlots({
      slotCount: 2,
      selectedTiles: [tile(5, "a"), tile(6, "b")],
    });
    expect(screen.getByRole("button", { name: "Answer slot 1: 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answer slot 2: 6" })).toBeInTheDocument();
  });

  it("labels an empty slot by its position", () => {
    renderSlots({
      slotCount: 2,
      selectedTiles: [tile(5, "a")],
    });
    expect(screen.getByRole("button", { name: "Answer slot 2: empty" })).toBeInTheDocument();
  });

  it("returns the exact tile id when a filled slot is clicked", async () => {
    const { onReturn } = renderSlots({
      slotCount: 2,
      selectedTiles: [tile(5, "a"), tile(6, "b")],
    });
    await userEvent.click(screen.getByRole("button", { name: "Answer slot 2: 6" }));
    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(onReturn).toHaveBeenCalledWith("b");
  });

  it("disables filled slots and blocks the return callback", async () => {
    const { onReturn } = renderSlots({
      slotCount: 1,
      selectedTiles: [tile(5, "a")],
      disabled: true,
    });
    const slot = screen.getByRole("button", { name: "Answer slot 1: 5" });
    expect(slot).toBeDisabled();
    await userEvent.click(slot);
    expect(onReturn).not.toHaveBeenCalled();
  });

  it("renders no button at all when onReturn is omitted", () => {
    renderSlots({
      slotCount: 2,
      selectedTiles: [tile(5, "a")],
      onReturn: undefined,
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The filled slot keeps its digit; the socket keeps its name without a control.
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Answer slot 2: empty" })).toBeInTheDocument();
  });

  it("never allows clicking an empty slot to trigger a return", async () => {
    const { onReturn } = renderSlots({
      slotCount: 1,
      selectedTiles: [],
    });
    const slot = screen.getByRole("button", { name: "Answer slot 1: empty" });
    expect(slot).toBeDisabled();
    await userEvent.click(slot);
    expect(onReturn).not.toHaveBeenCalled();
  });
});

/* What jsdom can decide about motion is which element carries which animation:
   getComputedStyle resolves the cascade, and `css: true` puts the module in it.
   That the animation ran, how long it took and what it looked like are not
   readable here and are measured in a browser instead. */
describe("AnswerSlots motion", () => {
  const momentOn = (digit: string) =>
    getComputedStyle(screen.getByText(digit).parentElement!).animationName;

  it("arrives a tile that has been put in a slot", () => {
    renderSlots({ slotCount: 2, selectedTiles: [tile(5, "a")] });
    expect(momentOn("5")).toBe("nd-slot-arrive");
  });

  it("blooms the submitted tiles once the round is judged correct", () => {
    renderSlots({
      slotCount: 1,
      selectedTiles: [tile(5, "a")],
      onReturn: undefined,
      verdict: "correct",
    });
    expect(momentOn("5")).toBe("nd-bloom");
  });

  it("draws the stroke across the submitted tiles once the round is judged incorrect, and leaves the tile still", () => {
    const { container } = renderSlots({
      slotCount: 1,
      selectedTiles: [tile(5, "a")],
      onReturn: undefined,
      verdict: "incorrect",
    });
    const stroke = container.querySelector(`.${styles.stroke}`);
    expect(stroke).not.toBeNull();
    expect(getComputedStyle(stroke!).animationName).toBe("nd-crack");
    expect(momentOn("5")).toBe("none");
  });

  it("dusts from a node of its own, so the stroke and the specks run apart", () => {
    const { container } = renderSlots({
      slotCount: 1,
      selectedTiles: [tile(5, "a")],
      onReturn: undefined,
      verdict: "incorrect",
    });
    const dust = container.querySelector(`.${styles.dust}`);
    expect(dust).not.toBeNull();
    expect(dust).not.toBe(container.querySelector(`.${styles.stroke}`));
    expect(getComputedStyle(dust!).animationName).toBe("nd-dust");
  });

  it("neither blooms nor strokes while the player is still answering", () => {
    const { container } = renderSlots({ slotCount: 1, selectedTiles: [tile(5, "a")] });
    expect(momentOn("5")).toBe("nd-slot-arrive");
    expect(container.querySelector(`.${styles.dust}`)).toBeNull();
  });

  /* The arrival is the most frequent motion in the app, so a re-render that
     changed nothing must not replay it. Keying the slot to the tile is what
     buys that: React keeps the node, and a kept node keeps its finished
     animation. */
  it("keeps a slot's node when the tile in it has not changed", () => {
    const { rerenderSlots } = renderSlots({ slotCount: 2, selectedTiles: [tile(5, "a")] });
    const arrived = screen.getByText("5");
    rerenderSlots({ slotCount: 2, selectedTiles: [tile(5, "a"), tile(6, "b")] });
    expect(screen.getByText("5")).toBe(arrived);
  });

  it("replaces a slot's node when the tile in it changes", () => {
    const { rerenderSlots } = renderSlots({ slotCount: 1, selectedTiles: [tile(5, "a")] });
    const arrived = screen.getByText("5");
    rerenderSlots({ slotCount: 1, selectedTiles: [tile(6, "b")] });
    expect(screen.getByText("6")).not.toBe(arrived);
  });
});

/* The streak ladder accumulates: what jsdom can decide is how many rings a
   given streak renders and whether the chips are there, which is the whole of
   this gate's logic. The colours, the delays and the trajectories are not
   readable here. Every count is asserted at a rung as well as below it: a
   mistyped CSS Modules key renders `class="undefined"`, and against that a
   zero-count assertion passes for the wrong reason. */
describe("AnswerSlots settling", () => {
  const end = (element: Element) => {
    fireEvent.animationEnd(element);
    fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
  };

  it("settles an incorrect verdict once each tile's stroke and dust have ended, and only once", () => {
    const onSettled = vi.fn();
    const { container } = renderSlots({
      selectedTiles: [tile(8, "a"), tile(7, "b")],
      onReturn: undefined,
      verdict: "incorrect",
      onSettled,
    });
    const moments = [...container.querySelectorAll("[data-moment]")];
    expect(moments).toHaveLength(4);

    // The same element twice is still one moment.
    end(moments[0]!);
    end(moments[0]!);
    moments.slice(1, -1).forEach(end);
    expect(onSettled).not.toHaveBeenCalled();
    end(moments[3]!);
    end(moments[3]!);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("marks no moment and never settles while the round is unjudged", () => {
    const onSettled = vi.fn();
    const { container } = renderSlots({ selectedTiles: [tile(5, "a")], onSettled });
    expect(container.querySelectorAll("[data-moment]")).toHaveLength(0);
    end(container.querySelector(`.${styles.arriving}`)!);
    expect(onSettled).not.toHaveBeenCalled();
  });
});

describe("AnswerSlots streak ladder", () => {
  // One slot, so the counts below are the ladder's own and not a multiple of
  // it: rings and chips are drawn per filled slot.
  const renderLadder = (overrides: Partial<AnswerSlotsProps>) =>
    renderSlots({
      slotCount: 1,
      selectedTiles: [tile(5, "a")],
      onReturn: undefined,
      verdict: "correct",
      ...overrides,
    });

  const ringCount = (container: HTMLElement) => container.querySelectorAll(`.${styles.ring}`).length;
  const chipCount = (container: HTMLElement) => container.querySelectorAll(`.${styles.chip}`).length;

  it("adds nothing to the bloom below the first rung", () => {
    const { container } = renderLadder({ streak: 2 });
    expect(ringCount(container)).toBe(0);
    expect(chipCount(container)).toBe(0);
  });

  it("adds the first ring at streak 3", () => {
    expect(ringCount(renderLadder({ streak: 3 }).container)).toBe(1);
  });

  it("holds at one ring below the second rung", () => {
    expect(ringCount(renderLadder({ streak: 4 }).container)).toBe(1);
  });

  it("adds a second ring at streak 5", () => {
    expect(ringCount(renderLadder({ streak: 5 }).container)).toBe(2);
  });

  it("holds at two rings and no burst below the third rung", () => {
    const { container } = renderLadder({ streak: 7 });
    expect(ringCount(container)).toBe(2);
    expect(chipCount(container)).toBe(0);
  });

  it("adds a third ring and the six-chip burst at streak 8", () => {
    const { container } = renderLadder({ streak: 8 });
    expect(ringCount(container)).toBe(3);
    expect(chipCount(container)).toBe(6);
  });

  it("does not escalate above the ceiling", () => {
    const { container } = renderLadder({ streak: 20 });
    expect(ringCount(container)).toBe(3);
    expect(chipCount(container)).toBe(6);
  });

  it("plays no rung on an incorrect answer", () => {
    const { container } = renderLadder({ verdict: "incorrect", streak: 8 });
    expect(ringCount(container)).toBe(0);
    expect(chipCount(container)).toBe(0);
  });

  it("plays no rung while the player is still answering", () => {
    const { container } = renderLadder({ verdict: undefined, streak: 8 });
    expect(ringCount(container)).toBe(0);
    expect(chipCount(container)).toBe(0);
  });

  it("carries nd-ring on every ring and nd-fan on every chip", () => {
    const { container } = renderLadder({ streak: 8 });
    for (const ring of container.querySelectorAll(`.${styles.ring}`)) {
      expect(getComputedStyle(ring).animationName).toBe("nd-ring");
    }
    for (const chip of container.querySelectorAll(`.${styles.chip}`)) {
      expect(getComputedStyle(chip).animationName).toBe("nd-fan");
    }
  });

  it("hides every ring and chip from the accessibility tree", () => {
    const { container } = renderLadder({ streak: 8 });
    for (const decoration of container.querySelectorAll(`.${styles.ring}, .${styles.chip}`)) {
      expect(decoration).toHaveAttribute("aria-hidden", "true");
    }
    // The tile keeps its digit and the slots offer no control: the ladder adds
    // no reachable node at its loudest rung.
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("starts each ring 60ms after the one before it", () => {
    const { container } = renderLadder({ streak: 8 });
    const orders = [...container.querySelectorAll<HTMLElement>(`.${styles.ring}`)].map((ring) =>
      ring.style.getPropertyValue("--ring-order"),
    );
    expect(orders).toEqual(["0", "1", "2"]);
    const delay = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .find((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === `.${styles.ring}`);
    expect(delay?.style.animationDelay).toBe("calc(var(--ring-order) * 60ms)");
  });

  it("leaves the bloom on the tile's own moment element", () => {
    renderLadder({ streak: 8 });
    expect(getComputedStyle(screen.getByText("5").parentElement!).animationName).toBe("nd-bloom");
  });
});
