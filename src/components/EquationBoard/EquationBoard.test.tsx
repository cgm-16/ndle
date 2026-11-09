import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Equation } from "../../game/types";
import { EquationBoard } from "./EquationBoard";

const equation = (left: number, right: number): Equation => ({
  left,
  right,
  product: left * right,
});

describe("EquationBoard", () => {
  it("renders the factors and the equals sign, never the product", () => {
    render(<EquationBoard equation={equation(2, 3)} />);
    expect(screen.getByText("2 × 3 =")).toBeInTheDocument();
    expect(screen.queryByText(/6/)).not.toBeInTheDocument();
  });
});

/* 10b. What jsdom can decide is which element carries the rise and whether a
   round change produces a fresh element to play it on; that it ran, and how it
   looked, are measured in a browser instead. */
describe("EquationBoard motion", () => {
  it("carries the round rise", () => {
    render(<EquationBoard equation={equation(2, 3)} />);
    expect(getComputedStyle(screen.getByText("2 × 3 =")).animationName).toBe("oz-round-rise");
  });

  it("replaces its node when the round's equation changes, so the rise plays again", () => {
    const { rerender } = render(<EquationBoard equation={equation(2, 3)} />);
    const first = screen.getByText("2 × 3 =");
    rerender(<EquationBoard equation={equation(4, 5)} />);
    expect(screen.getByText("4 × 5 =")).not.toBe(first);
  });

  // The reducer holds one equation object per round and hands the same one back
  // on every render within it, so this is what a re-render inside a round looks
  // like — not a fresh object carrying equal digits, which is the next case.
  it("keeps its node while the round's own equation re-renders, so the rise does not replay", () => {
    const round = equation(2, 3);
    const { rerender } = render(<EquationBoard equation={round} />);
    const first = screen.getByText("2 × 3 =");
    rerender(<EquationBoard equation={round} />);
    expect(screen.getByText("2 × 3 =")).toBe(first);
  });

  // plantTable draws each row from the 45 pairs and never rejects a repeat, so
  // a row can arrive with the digits already on the board. Keying on those
  // digits skips the rise on exactly those rows — and it fails by staying
  // still, which is indistinguishable from correct rest.
  it("replaces its node when a new round redraws the pair already on the board", () => {
    const { rerender } = render(<EquationBoard equation={equation(2, 3)} />);
    const first = screen.getByText("2 × 3 =");
    rerender(<EquationBoard equation={equation(2, 3)} />);
    expect(screen.getByText("2 × 3 =")).not.toBe(first);
  });
});
