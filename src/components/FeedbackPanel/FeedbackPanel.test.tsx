import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Digit, Language, RoundResult, Tile as TileModel } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import { FeedbackPanel } from "./FeedbackPanel";
import styles from "./FeedbackPanel.module.css";

const tile = (digit: Digit, id: string): TileModel => ({
  id,
  digit,
  isNew: false,
});

const correct: RoundResult = {
  kind: "correct",
  submittedValue: 12,
  correctValue: 12,
  submittedTiles: [tile(1, "a"), tile(2, "b")],
  rewardTileIds: ["r1", "r2"],
};

const incorrect: RoundResult = {
  ...correct,
  kind: "incorrect",
  submittedValue: 21,
  rewardTileIds: [],
};

/** Renders a feedback result in the requested locale for focused assertions. */
function renderPanel(
  result: RoundResult,
  rewardTiles: readonly TileModel[] = [],
  language: Language = "en",
) {
  return render(
    <I18nProvider initialLanguage={language}>
      <FeedbackPanel result={result} rewardTiles={rewardTiles} />
    </I18nProvider>,
  );
}

describe("FeedbackPanel", () => {
  it("prints a miss as its number, with no dot", () => {
    renderPanel(incorrect);
    expect(screen.getByText("Your answer: 21")).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent("·");
  });

  it("states the outcome in words, not only in color", () => {
    renderPanel(incorrect);
    expect(screen.getByRole("status")).toHaveTextContent("Incorrect");
  });

  it("shows what was submitted and what was right on an incorrect answer", () => {
    renderPanel(incorrect);
    expect(screen.getByText("Your answer: 21")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: 12")).toBeInTheDocument();
  });

  // result.rewards already states the count; a caption under each tile said
  // the same thing a second time (#142).
  it("shows each reward tile without a caption of its own", () => {
    renderPanel(correct, [tile(4, "r1"), tile(7, "r2")]);
    expect(screen.getByRole("status").querySelectorAll("li")).toHaveLength(2);
    expect(screen.queryByText("New tile")).not.toBeInTheDocument();
  });

  // On a correct answer the answer slots carry no accessible name (§95 —
  // `Tile`'s roleless form drops `label`), so the status region is the only
  // place the submitted value is stated.
  it("states the submitted value on a correct answer, in both locales", () => {
    renderPanel(correct, [tile(4, "r1"), tile(7, "r2")]);
    // A CSS Modules key that does not exist renders class="undefined" and
    // reports no error, so the line's own class is asserted alongside its text.
    expect(screen.getByText("Your answer: 12")).toHaveClass(styles.submitted);

    renderPanel(correct, [tile(4, "r1"), tile(7, "r2")], "ko");
    expect(screen.getByText("제출한 답: 12")).toBeInTheDocument();
  });

  // §1.14 requires `result.rewards`, and the panel is role="status" with
  // aria-live="polite": one badge per tile announced "New tile" once per
  // arrival, where the specified string states the count once.
  it("summarises the arrivals once, inside the live region, in both locales", () => {
    const { unmount } = renderPanel(correct, [tile(4, "r1"), tile(7, "r2")]);
    // A CSS Modules key that does not exist renders class="undefined" and
    // reports no error, so the line's own class is asserted alongside its text.
    expect(within(screen.getByRole("status")).getByText("Received 2 tiles")).toHaveClass(
      styles.rewardSummary,
    );
    unmount();

    renderPanel(correct, [tile(4, "r1"), tile(7, "r2")], "ko");
    expect(screen.getByText("타일 2개 획득")).toBeInTheDocument();
  });

  // The tiles stay on screen and leave the accessibility tree: the summary
  // above states the count, and TileInventory renders the same arrivals in
  // every phase with "Digit N, New tile" as their accessible names, so the
  // digits are still reachable rather than dropped.
  it("leaves the reward list out of the live region", () => {
    renderPanel(correct, [tile(4, "r1"), tile(7, "r2")]);
    expect(within(screen.getByRole("status")).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("status").querySelectorAll("li")).toHaveLength(2);
  });

  // A correct result rather than an incorrect one: the incorrect branch renders
  // no rewards block at all, so it exercises the branch and not the count.
  it("states no summary when a correct round granted nothing", () => {
    renderPanel(correct, []);
    expect(screen.queryByText(/^Received/)).not.toBeInTheDocument();
  });

  // The verdict's color comes from a class derived from the same `kind` the
  // headline is rendered from. A CSS Modules key that does not exist renders
  // `class="undefined"` and reports no error, so both halves are asserted: the
  // branch class is applied, and it resolved to a real value.
  it("carries a branch class rather than keying color off a sibling element", () => {
    const { unmount } = renderPanel(correct, [tile(4, "r1")]);
    const passed = screen.getByRole("status");
    expect(passed).toHaveClass(styles.correct);
    expect(passed.className).not.toMatch(/undefined/);
    unmount();

    renderPanel(incorrect);
    const failed = screen.getByRole("status");
    expect(failed).toHaveClass(styles.incorrect);
    expect(failed).not.toHaveClass(styles.correct);
    expect(failed.className).not.toMatch(/undefined/);
  });
});
