import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { LANGUAGE_STORAGE_KEY } from "../i18n/storage";
import type { Language, PuzzleTable } from "../game/types";
import type { ShareDependencies } from "../services/sharing";
import {
  makePuzzleRow,
  PUZZLE_SAMPLE,
  PUZZLE_SAMPLE_PAR_LINE,
  sequenceRandom,
  sequentialIds,
  type PuzzleMove,
} from "../test/fixtures";
import { App, type AppDependencies } from "./App";

function makeShareDependencies(): ShareDependencies {
  return { writeClipboard: vi.fn().mockResolvedValue(undefined) };
}

function renderApp(
  randomValues: number[],
  options: {
    initialLanguage?: Language;
    gameUrl?: string;
    strictMode?: boolean;
    dealPuzzle?: () => PuzzleTable;
  } = {},
) {
  const dependencies: AppDependencies = {
    random: sequenceRandom(...randomValues),
    nextTileId: sequentialIds(),
    gameUrl: options.gameUrl ?? "https://example.test/",
    dealPuzzle: vi.fn(options.dealPuzzle ?? (() => PUZZLE_SAMPLE)),
  };
  const shareDependencies = makeShareDependencies();
  const tree = (
    <I18nProvider initialLanguage={options.initialLanguage}>
      <App dependencies={dependencies} shareDependencies={shareDependencies} />
    </I18nProvider>
  );
  const utils = render(options.strictMode ? <StrictMode>{tree}</StrictMode> : tree);
  return { ...utils, dependencies, shareDependencies };
}

// GameHud and GameOverScreen both render <dt>label</dt><dd>value</dd> pairs;
// only one of those screens is ever mounted at a time, so the label text is
// unambiguous. Digit tiles show plain digit text, never these labels.
// Plays out a discard: the 8c exits, then the 8a·2 drops of any rail tile the
// discard spared, and the verdict's moments on the answer slots, which mount
// with the feedback the discard completes. jsdom runs no animations, so each
// is ended by hand, on both event names React may bind (see
// TileInventory.test's endAnimation).
function finishDeparture(): void {
  for (const stage of ["[data-departing]", "[data-seating]", "[data-moment]"]) {
    for (const cell of document.querySelectorAll(stage)) {
      fireEvent.animationEnd(cell);
      fireEvent(cell, new Event("webkitAnimationEnd", { bubbles: true }));
    }
  }
}

function hudField(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

// A three-row loss on the sample: every submission below is deliberately
// incorrect, so no row pays and the hand only ever shrinks. It drains the five
// dealt tiles to none (5-2-2-1), and row 4, 1 × 7, cannot be attempted.
const LOSS_ROWS: PuzzleMove[] = [
  { spend: [5, 7] }, // "57" != 15
  { spend: [9, 1] }, // "91" != 14
  { spend: [4] }, //    "4"  != 9
];

// Plays rows by pointer, each advanced by Next Round.
async function playRows(user: ReturnType<typeof userEvent.setup>, moves: PuzzleMove[]) {
  for (const { spend } of moves) {
    await press(user, spend);
    await user.click(screen.getByRole("button", { name: "Next Round" }));
  }
}

async function driveToGameOver(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Start Run" }));
  await playRows(user, LOSS_ROWS);
}

beforeEach(() => {
  localStorage.clear();
});

// renderApp([]) gives an exhausted RandomSource throughout: a run deals its
// table and pays its rows without drawing randomness.
describe("App", () => {
  it("starts a Puzzle run from the title screen and reaches row 1", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    expect(screen.getByRole("heading", { name: "ozterisk" })).toBeVisible();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start Run" }));

    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("1");
    expect(hudField("Score")).toBe("0");
    expect(screen.getAllByRole("button", { name: /^Digit \d$/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("orders the HUD Round, Score, Streak so rounds survived reads as the headline stat", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await user.click(screen.getByRole("button", { name: "Start Run" }));

    const round = screen.getByText("Round");
    const score = screen.getByText("Score");
    const streak = screen.getByText("Streak");

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(round.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(score.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Regression guard for the `.primary` emphasis class actually winning the
  // cascade: `.entry dd` and `.primary` alone are NOT equal specificity
  // (0,1,1 vs 0,1,0), so `.entry dd` silently wins regardless of source
  // order and the emphasis never renders. Reading getComputedStyle catches
  // that class of bug; comparing className strings would not.
  it("renders Round's value at a larger computed font size than Score's", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await user.click(screen.getByRole("button", { name: "Start Run" }));

    const roundValue = screen.getByText("Round").nextElementSibling as HTMLElement;
    const scoreValue = screen.getByText("Score").nextElementSibling as HTMLElement;

    const roundFontSize = parseFloat(getComputedStyle(roundValue).fontSize);
    const scoreFontSize = parseFloat(getComputedStyle(scoreValue).fontSize);

    expect(roundFontSize).toBeGreaterThan(scoreFontSize);
  });

  it("resolves a correct answer through the row's pay, overflow, and an exact discard that advances the round on its own", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await user.click(screen.getByRole("button", { name: "Start Run" }));
    await playRows(user, PUZZLE_SAMPLE_PAR_LINE.slice(0, 3));
    await press(user, [7]); // row 4, 1 × 7, pays 4 4: six tiles in five sockets

    expect(hudField("Score")).toBe("3");
    expect(hudField("Streak")).toBe("3");
    expect(screen.getByRole("status")).toHaveTextContent("Correct");
    expect(screen.getByText("Choose a tile to discard.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Discard" })).not.toBeInTheDocument();

    // A forced single-tile excess collapses to one tap: marking an old
    // (non-reward) tile completes the discard immediately, no Confirm needed.
    await user.click(screen.getByRole("button", { name: "Digit 6" }));

    // No Confirm is ever rendered, so its absence proves nothing; check the
    // overflow instruction itself is gone: that only happens once the marking
    // TOGGLE_DISCARD has actually advanced the phase past "overflow".
    expect(screen.queryByText("Choose a tile to discard.")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Correct");
    expect(screen.getAllByRole("button", { name: "Digit 4, New tile" })).toHaveLength(2);

    // No Next Round after a discard (§1.7): the round advances once the
    // departing tile has played.
    expect(screen.queryByRole("button", { name: "Next Round" })).not.toBeInTheDocument();
    finishDeparture();

    expect(screen.getByText("4 × 1 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("5");
    expect(screen.getAllByRole("button", { name: /^Digit \d$/ })).toHaveLength(5);

    // §1.16 / AGENTS.md: no game field ever enters storage, even after a full round.
    expect(localStorage.length).toBe(0);
  });

  it("grants no reward and resets the streak on an incorrect answer, then advances via Next Round", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await user.click(screen.getByRole("button", { name: "Start Run" }));
    await playRows(user, PUZZLE_SAMPLE_PAR_LINE.slice(0, 2)); // the sacrifice, then 14

    expect(hudField("Streak")).toBe("1");

    // Row 3: "3 x 3 = 9"; deliberately submit "8" instead.
    await press(user, [8]);

    expect(screen.getByRole("status")).toHaveTextContent("Incorrect");
    expect(screen.getByText("Your answer: 8")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: 9")).toBeInTheDocument();
    expect(hudField("Score")).toBe("1"); // unchanged: no reward for an incorrect answer
    expect(hudField("Streak")).toBe("0"); // reset
    expect(hudField("Round")).toBe("3"); // feedback: round === totalRounds

    await user.click(screen.getByRole("button", { name: "Next Round" }));

    expect(screen.getByText("1 × 7 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("4");
  });

  it("reaches game over when the next equation exceeds the surviving inventory, keeping the terminal equation visible", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await driveToGameOver(user);

    expect(screen.getByRole("heading", { name: "7 short of par" })).toBeInTheDocument();
    expect(screen.getByText("1 × 7 =")).toBeInTheDocument(); // terminal equation stays visible (§1.10)
    // §1.8 keeps the equation to explain the loss, so the explanation has to be
    // on screen too. Without it the equation reads as an unanswered prompt.
    expect(screen.getByText("Not enough tiles left to answer.")).toBeInTheDocument();
    expect(hudField("Score")).toBe("0 / 8"); // every submission above was incorrect
    expect(hudField("Longest streak")).toBe("0");
    expect(screen.getByRole("button", { name: "Play Again" })).toBeInTheDocument();
  });

  it("starts a fresh run at round 1 with reset inventory and statistics via Play Again", async () => {
    const user = userEvent.setup();
    const { dependencies } = renderApp([], { initialLanguage: "en" });

    await driveToGameOver(user);
    await user.click(screen.getByRole("button", { name: "Play Again" }));

    expect(dependencies.dealPuzzle).toHaveBeenCalledTimes(2);
    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("1");
    expect(hudField("Score")).toBe("0");
    expect(hudField("Streak")).toBe("0");
    expect(screen.getAllByRole("button", { name: /^Digit \d$/ })).toHaveLength(5);
  });

  it("restarts via R on the game over screen, even when a non-Play-Again button has focus", async () => {
    const user = userEvent.setup();
    // Rendered under Strict Mode: a doubled handleRestart would deal a third
    // table, and the count below would read it.
    const { dependencies, shareDependencies } = renderApp([], {
      initialLanguage: "en",
      strictMode: true,
    });

    await driveToGameOver(user);
    screen.getByRole("button", { name: "Share" }).focus();

    await user.keyboard("r");

    expect(dependencies.dealPuzzle).toHaveBeenCalledTimes(2);
    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("1");
    expect(shareDependencies.writeClipboard).not.toHaveBeenCalled();
  });

  it("restarts on the key at R's physical position when the key value is not r", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await driveToGameOver(user);

    // A Korean IME hands the keydown a jamo rather than "r"; only event.code
    // still carries the physical key, so the binding accepts either property.
    fireEvent.keyDown(window, { key: "ㄱ", code: "KeyR" });

    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(hudField("Round")).toBe("1");
  });

  it("does not restart on Enter on the game over screen; a focused button keeps its own behavior", async () => {
    const user = userEvent.setup();
    // §1.11 gives gameOver no global Enter shortcut, so a restart here would
    // deal a second table as well as failing below.
    const { dependencies, shareDependencies } = renderApp([], { initialLanguage: "en" });

    await driveToGameOver(user);
    screen.getByRole("button", { name: "Share" }).focus();

    await user.keyboard("{Enter}");

    // Enter reaches the focused button and stops there: Share runs, the score
    // screen survives to be read.
    await waitFor(() => expect(shareDependencies.writeClipboard).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { name: "7 short of par" })).toBeInTheDocument();
    expect(hudField("Score")).toBe("0 / 8");
    expect(dependencies.dealPuzzle).toHaveBeenCalledTimes(1);
  });

  it("survives the stray Enter of a Submit/Enter rhythm arriving after the phase flips", async () => {
    const user = userEvent.setup();
    const { dependencies } = renderApp([], { initialLanguage: "en" });

    // The rhythm that produces the defect, entirely by keyboard: digits, Enter
    // to submit, Enter to advance. The last of those Enters flips the phase to
    // gameOver, and the player's next tap is already in flight.
    await user.click(screen.getByRole("button", { name: "Start Run" }));
    for (const { spend } of LOSS_ROWS) {
      for (const digit of spend) await user.keyboard(String(digit));
      await user.keyboard("{Enter}"); // submit
      await user.keyboard("{Enter}"); // next round
    }

    expect(screen.getByRole("heading", { name: "7 short of par" })).toBeInTheDocument();
    expect(document.activeElement?.tagName).toBe("BODY");

    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "7 short of par" })).toBeInTheDocument();
    expect(dependencies.dealPuzzle).toHaveBeenCalledTimes(1);
  });

  it("changes language mid-answering immediately, without resetting the run", async () => {
    const user = userEvent.setup();
    renderApp([], { initialLanguage: "en" });

    await user.click(screen.getByRole("button", { name: "Start Run" }));
    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    await user.click(screen.getByRole("button", { name: "Digit 5" })); // fills both answer slots

    const submitButtonEn = screen.getByRole("button", { name: "Submit" });
    expect(submitButtonEn).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "한국어" }));

    // Copy switches live; the run itself (equation, HUD, selection) is untouched.
    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(hudField("라운드")).toBe("1");
    const submitButtonKo = screen.getByRole("button", { name: "제출" });
    expect(submitButtonKo).toBe(submitButtonEn); // same node: not remounted
    expect(submitButtonKo).toBeEnabled(); // selection survived: still ready to submit
  });

  it("returns to the title phase on a fresh mount while the saved language persists", async () => {
    const user = userEvent.setup();
    const first = renderApp([]); // no forced language: reads storage like production

    await user.click(screen.getByRole("button", { name: "Start Run" }));
    await user.click(screen.getByRole("button", { name: "한국어" }));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ko");

    first.unmount(); // simulates a page reload discarding all in-memory state

    renderApp([]); // fresh mount: I18nProvider re-reads storage; App starts a new reducer

    expect(screen.getByRole("heading", { name: "ozterisk" })).toBeInTheDocument(); // back to title
    expect(screen.getByRole("button", { name: "게임 시작" })).toBeInTheDocument(); // language persisted
  });
});

async function startPuzzle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Puzzle/ }));
  await user.click(screen.getByRole("button", { name: "Start Run" }));
}

async function press(user: ReturnType<typeof userEvent.setup>, digits: number[]) {
  for (const digit of digits) {
    await user.click(screen.getAllByRole("button", { name: `Digit ${digit}` })[0]!);
  }
  await user.click(screen.getByRole("button", { name: "Submit" }));
}

describe("Puzzle", () => {
  it("deals the table's hand and shows row 1", async () => {
    const user = userEvent.setup();
    renderApp([]);
    await startPuzzle(user);
    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    for (const digit of [1, 4, 5, 7, 9]) {
      expect(screen.getByRole("button", { name: `Digit ${digit}` })).toBeInTheDocument();
    }
  });

  // renderApp([]) gives an exhausted RandomSource: any draw throws, so these
  // rows prove the pay and the next equation come from the table.
  it("pays the row's printed tiles and advances row by row without drawing randomness", async () => {
    const user = userEvent.setup();
    renderApp([]);
    await startPuzzle(user);
    await press(user, [5, 7]); // the sacrifice: 57 for 15
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    expect(screen.getByText("7 × 2 =")).toBeInTheDocument();
    await press(user, [1, 4]); // 14, paid 8 1 6
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    expect(screen.getByText("3 × 3 =")).toBeInTheDocument();
    for (const digit of [1, 6, 8, 9]) {
      expect(screen.getByRole("button", { name: `Digit ${digit}` })).toBeInTheDocument();
    }
  });

  it("advances to the next row on its own after a discard", async () => {
    const user = userEvent.setup();
    renderApp([]);
    await startPuzzle(user);
    await press(user, [5, 7]);
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    await press(user, [1, 4]);
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    await press(user, [9]);
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    await press(user, [7]); // 1 × 7, paid 4 4: six tiles in five sockets
    await user.click(screen.getByRole("button", { name: "Digit 6" }));
    finishDeparture();
    expect(await screen.findByText("4 × 1 =")).toBeInTheDocument();
  });

  it("deals once per run under StrictMode", async () => {
    const user = userEvent.setup();
    const firstTable: PuzzleTable = { hand: [1, 2, 3, 4], rows: [makePuzzleRow(1, 2, [1, 2])], par: 1 };
    const secondTable: PuzzleTable = { hand: [1, 2, 3, 4], rows: [makePuzzleRow(3, 4, [1, 2])], par: 1 };
    const dealPuzzle = vi.fn<() => PuzzleTable>().mockReturnValueOnce(firstTable).mockReturnValueOnce(secondTable);
    renderApp([], { strictMode: true, dealPuzzle });
    await startPuzzle(user);
    expect(dealPuzzle).toHaveBeenCalledTimes(1);
    await press(user, [2]);
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    await user.click(screen.getByRole("button", { name: "Play Again" }));
    expect(dealPuzzle).toHaveBeenCalledTimes(2);
    expect(screen.getByText("3 × 4 =")).toBeInTheDocument();
    expect(screen.queryByText("1 × 2 =")).not.toBeInTheDocument();
  });

  it("plays the sample's par line, sacrifice included, to Made par", async () => {
    const user = userEvent.setup();
    renderApp([]);
    await startPuzzle(user);
    for (const move of PUZZLE_SAMPLE_PAR_LINE) {
      await press(user, move.spend);
      if (move.discard === undefined) {
        await user.click(screen.getByRole("button", { name: "Next Round" }));
      } else {
        // A reward tile is named "Digit 0, New tile", so the digit is matched as a prefix.
        await user.click(screen.getAllByRole("button", { name: new RegExp(`^Digit ${move.discard}\\b`) })[0]!);
        finishDeparture();
      }
    }
    expect(await screen.findByRole("heading", { name: "Made par" })).toBeInTheDocument();
    expect(hudField("Par")).toBe("7");
  });

  it("ends early when the hand cannot fill the next row, short of par", async () => {
    const user = userEvent.setup();
    const twoTiles: PuzzleTable = {
      hand: [1, 2],
      rows: [makePuzzleRow(3, 4, [1, 2, 3]), makePuzzleRow(5, 5, [1, 2, 3])],
      par: 1,
    };
    renderApp([], { dealPuzzle: () => twoTiles });
    await startPuzzle(user);
    await press(user, [2, 1]); // 21 for 12: the hand is spent
    await user.click(screen.getByRole("button", { name: "Next Round" }));
    expect(screen.getByRole("heading", { name: "1 short of par" })).toBeInTheDocument();
    expect(screen.getByText("Not enough tiles left to answer.")).toBeInTheDocument();
  });
});
