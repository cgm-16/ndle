import { isInaccessible, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { PUZZLE_SAMPLE } from "../../test/fixtures";
import { PuzzleLedger } from "./PuzzleLedger";

function renderLedger(round: number, rowResults: ("correct" | "incorrect")[], language: "en" | "ko" = "en") {
  return render(
    <I18nProvider initialLanguage={language}>
      <PuzzleLedger table={PUZZLE_SAMPLE} round={round} rowResults={rowResults} />
    </I18nProvider>,
  );
}

describe("PuzzleLedger", () => {
  it("lists all eight rows with their pays, row 1 current", () => {
    renderLedger(1, []);
    const rows = within(screen.getByRole("list", { name: "Table" })).getAllByRole("listitem");
    expect(rows).toHaveLength(8);
    expect(rows[0]).toHaveAttribute("aria-current", "step");
    expect(rows[0]).toHaveTextContent("Row 1, 3 × 5, pays 9, 5, and 5");
    expect(rows[2]).toHaveTextContent("Row 3, 3 × 3, pays 2 and 7");
    expect(rows[1]).not.toHaveAttribute("aria-current");
  });

  it("marks played rows answered or missed and moves the current row", () => {
    renderLedger(4, ["incorrect", "correct", "correct"]);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("missed");
    expect(rows[1]).toHaveTextContent("answered");
    expect(rows[3]).toHaveAttribute("aria-current", "step");
  });

  // Row 2 of the sample is 7 × 2, paying 8, 1 and 6. Right after a submit the
  // round has not advanced, so the row is played and current at once.
  it.each([
    ["correct", "answered", "check"],
    ["incorrect", "missed", "cross"],
  ] as const)("keeps the row just submitted current and shows its mark, not its pay: %s", (kind, word, shape) => {
    renderLedger(2, ["incorrect", kind]);
    const row = screen.getAllByRole("listitem")[1]!;
    expect(row).toHaveAttribute("aria-current", "step");
    expect(within(row).getByText(`Row 2, 7 × 2, pays 8, 1, and 6, ${word}`)).toBeInTheDocument();
    expect(within(row).getByText("7 × 2")).toBeInTheDocument();
    expect(row.querySelector("svg")).toHaveAttribute("data-shape", shape);
    for (const digit of ["8", "1", "6"]) {
      expect(within(row).queryByText(digit)).not.toBeInTheDocument();
    }
  });

  it("reads each row once, by its label, and hides what the row draws", () => {
    renderLedger(1, []);
    const [current, , later] = screen.getAllByRole("listitem");
    expect(isInaccessible(within(later!).getByText("Row 3, 3 × 3, pays 2 and 7"))).toBe(false);
    expect(isInaccessible(within(later!).getByText("3 × 3"))).toBe(true);
    expect(isInaccessible(within(later!).getByText("2"))).toBe(true);
    expect(isInaccessible(within(later!).getByText("7"))).toBe(true);
    expect(isInaccessible(within(current!).getByText("3 × 5"))).toBe(true);
  });

  it("labels the current row Now and pays, visibly", () => {
    renderLedger(1, []);
    const current = screen.getAllByRole("listitem")[0]!;
    expect(within(current).getByText("Now")).toBeInTheDocument();
    expect(within(current).getByText("pays")).toBeInTheDocument();
    expect(within(screen.getAllByRole("listitem")[2]!).queryByText("Now")).not.toBeInTheDocument();
  });

  it("draws the answered row's mark and word: a check in English, a circle in Korean", () => {
    const { unmount } = renderLedger(2, ["correct"]);
    let row = screen.getAllByRole("listitem")[0]!;
    expect(row.querySelector("svg")).toHaveAttribute("data-shape", "check");
    expect(within(row).getByText("answered")).toBeInTheDocument();
    unmount();
    renderLedger(2, ["correct"], "ko");
    row = screen.getAllByRole("listitem")[0]!;
    expect(row.querySelector("svg")).toHaveAttribute("data-shape", "circle");
    expect(within(row).getByText("정답")).toBeInTheDocument();
  });

  it("draws a missed row with a cross and its word", () => {
    renderLedger(2, ["incorrect"]);
    const row = screen.getAllByRole("listitem")[0]!;
    expect(row.querySelector("svg")).toHaveAttribute("data-shape", "cross");
    expect(within(row).getByText("missed")).toBeInTheDocument();
  });

  it("reads the pay as a Korean list in Korean", () => {
    renderLedger(1, [], "ko");
    const rows = within(screen.getByRole("list", { name: "판" })).getAllByRole("listitem");
    const list = new Intl.ListFormat("ko", { type: "conjunction" }).format(["2", "7"]);
    expect(rows[2]).toHaveTextContent(`3번째 줄, 3 × 3, 보상 ${list}`);
  });
});
