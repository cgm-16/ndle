import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Digit, Equation, Language, RoundResult, Tile as TileModel } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import { FeedbackPanel } from "./FeedbackPanel";
import styles from "./FeedbackPanel.module.css";

const tile = (digit: Digit, id: string): TileModel => ({
  id,
  digit,
  isNew: false,
});

// Row 1 of the sample, 3 × 5 = 15: the sacrifice plays 5 7.
const equation: Equation = { left: 3, right: 5, product: 15 };

const correct: RoundResult = {
  kind: "correct",
  submittedValue: 15,
  correctValue: 15,
  submittedTiles: [tile(1, "a"), tile(5, "b")],
  rewardTileIds: ["r1", "r2", "r3"],
};

const incorrect: RoundResult = {
  ...correct,
  kind: "incorrect",
  submittedValue: 57,
  rewardTileIds: [],
};

const rewards = [tile(8, "r1"), tile(1, "r2"), tile(6, "r3")];

/** Renders a feedback result in the requested locale for focused assertions. */
function renderPanel(
  result: RoundResult,
  rewardTiles: readonly TileModel[] = [],
  language: Language = "en",
) {
  return render(
    <I18nProvider initialLanguage={language}>
      <FeedbackPanel result={result} equation={equation} rewardTiles={rewardTiles} />
    </I18nProvider>,
  );
}

describe("FeedbackPanel", () => {
  it.each([
    ["en", "Correct · Received 8 1 6", "check"],
    ["ko", "정답 · 받은 타일 8 1 6", "circle"],
  ] as const)("reads the correct verdict and the received digits in %s", (language, text, shape) => {
    renderPanel(correct, rewards, language);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(text);
    expect(status.querySelector("svg")).toHaveAttribute("data-shape", shape);
  });

  it.each([
    ["en", "Missed · 3 × 5 = 15", "You played 57"],
    ["ko", "오답 · 3 × 5 = 15", "제출한 답 57"],
  ] as const)("reads a miss with its equation, and announces the played answer, in %s", (language, text, played) => {
    renderPanel(incorrect, [], language);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(text);
    expect(status).toHaveTextContent(played);
    expect(status.querySelector("svg")).toHaveAttribute("data-shape", "cross");
  });

  // toHaveTextContent normalises whitespace and matches a substring, so it
  // cannot see two sentences run together. The region's raw text can.
  it.each([
    ["en", "Missed · 3 × 5 = 15. You played 57"],
    ["ko", "오답 · 3 × 5 = 15. 제출한 답 57"],
  ] as const)("announces a miss as two sentences in %s", (language, text) => {
    renderPanel(incorrect, [], language);
    expect(screen.getByRole("status").textContent).toBe(text);
  });

  it("states a correct verdict in words, with no played-answer sentence", () => {
    renderPanel(correct, rewards);
    expect(screen.getByRole("status")).not.toHaveTextContent("You played");
  });

  it("keeps clear of the rail cell after a discard", () => {
    renderPanel({ ...correct, discarded: true }, rewards);
    const status = screen.getByRole("status");
    expect(status).toHaveClass(styles.beforeRail);
    expect(status.className).not.toMatch(/undefined/);
  });

  it("renders no reward-tile list", () => {
    renderPanel(correct, rewards);
    expect(screen.getByRole("status").querySelector("ul, li")).toBeNull();
  });

  it("states no detail when a correct round granted nothing", () => {
    renderPanel(correct, []);
    expect(screen.getByRole("status")).not.toHaveTextContent("Received");
  });

  // A CSS Modules key that does not exist renders class="undefined" and
  // reports no error, so both halves are asserted.
  it("carries a branch class derived from the result's kind", () => {
    const { unmount } = renderPanel(correct, rewards);
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
