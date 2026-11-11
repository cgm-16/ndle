import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import type { ShareDependencies } from "../../services/sharing";
import { makeEquation } from "../../test/fixtures";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import { GameOverScreen, type GameOverScreenProps } from "./GameOverScreen";
import styles from "./GameOverScreen.module.css";

// A table that ended early, two short of par: the run stopped on EQUATION.
const STATS = { kind: "practice", won: false, par: 7, rows: 8, score: 5, longestStreak: 4 } as const;
const PRACTICE = { kind: "practice" } as const;
const EQUATION = makeEquation(2, 3);
const URL = "https://example.test/";
const EN_TEXT =
  "9dle Practice — 2 short of par — Score: 5/8 · par 7\nLongest streak: 4\n\nCan you make par?\nhttps://example.test/";
const KO_TEXT =
  "구들 연습 — 목표까지 2점 부족 — 점수: 5/8 · 목표 7\n최장 연속 정답: 4\n\n목표를 달성할 수 있나요?\nhttps://example.test/";

function renderScreen(overrides: Partial<GameOverScreenProps> = {}) {
  const onPlayAgain = vi.fn();
  const onPractice = vi.fn();
  const dependencies: ShareDependencies = {
    writeClipboard: vi.fn().mockResolvedValue(undefined),
  };
  const { container } = render(
    <I18nProvider initialLanguage="en">
      <GameOverScreen
        equation={EQUATION}
        stats={STATS}
        variant={PRACTICE}
        url={URL}
        dependencies={dependencies}
        onPlayAgain={onPlayAgain}
        onPractice={onPractice}
        {...overrides}
      />
    </I18nProvider>,
  );
  return { onPlayAgain, onPractice, dependencies, container };
}

describe("GameOverScreen", () => {
  it("renders the terminal equation and its reason inside the main landmark", () => {
    renderScreen({ equation: makeEquation(7, 8) });

    const main = screen.getByRole("main");
    expect(within(main).getByText("7 × 8 =")).toBeInTheDocument();
    expect(within(main).getByText("Not enough tiles left to answer.")).toBeInTheDocument();
  });

  // §1.10: gameOver is the only phase that prints the product. During play
  // the answer slots complete the equation, and a run that ends on "not
  // enough tiles left to answer" never reaches feedback — so without this
  // the player is shown an equation whose answer they were never told.
  it("prints the product of the terminal equation", () => {
    renderScreen({ equation: makeEquation(7, 8) });

    const main = screen.getByRole("main");
    expect(within(main).getByText("56")).toBeInTheDocument();
    // The equation text keeps an element of its own: this suite and
    // App.test.tsx both pin it by exact text, and a product absorbed into
    // that element would match neither.
    expect(within(main).getByText("7 × 8 =")).toBeInTheDocument();
  });

  it("orders the statistics score, par, longest streak", () => {
    renderScreen();

    const score = screen.getByText("Score");
    const par = screen.getByText("Par");
    const streak = screen.getByText("Longest streak");

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(score.compareDocumentPosition(par) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(par.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Mirrors the HUD's emphasis guard in App.test.tsx: reading getComputedStyle
  // catches a `.primary` rule that loses the cascade, which a className
  // assertion would not.
  it("renders the score at a larger computed font size than par", () => {
    renderScreen();

    const scoreValue = screen.getByText("Score").nextElementSibling as HTMLElement;
    const parValue = screen.getByText("Par").nextElementSibling as HTMLElement;

    const scoreFontSize = parseFloat(getComputedStyle(scoreValue).fontSize);
    const parFontSize = parseFloat(getComputedStyle(parValue).fontSize);

    expect(scoreFontSize).toBeGreaterThan(parFontSize);
  });

  // The R shortcut has no other affordance in the product, so its hint has to
  // sit with the button it presses: after Play Again, before the alternatives.
  it("names the R shortcut between Play Again and the secondary actions, in either language", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <LanguageToggle />
        <GameOverScreen
          equation={EQUATION}
          stats={STATS}
          variant={PRACTICE}
          url={URL}
          dependencies={{ writeClipboard: vi.fn().mockResolvedValue(undefined) }}
          onPlayAgain={vi.fn()}
          onPractice={vi.fn()}
        />
      </I18nProvider>,
    );

    const hint = screen.getByText("Press R to play again");
    const playAgain = screen.getByRole("button", { name: "Play Again" });
    const share = screen.getByRole("button", { name: "Share" });

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(playAgain.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(screen.getByText("R 키를 눌러 다시 하기")).toBeInTheDocument();
  });

  it("invokes the Play Again callback", async () => {
    const { onPlayAgain } = renderScreen();
    await userEvent.click(screen.getByRole("button", { name: "Play Again" }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it("starts with an empty inline status", () => {
    renderScreen();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shares natively and leaves the clipboard untouched when sharing succeeds", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    renderScreen({ dependencies: { nativeShare, writeClipboard } });

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(nativeShare).toHaveBeenCalledWith({ text: EN_TEXT, url: URL });
    expect(writeClipboard).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("falls back to copying and reports success when native sharing is unavailable", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    renderScreen({ dependencies: { writeClipboard } });

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => expect(writeClipboard).toHaveBeenCalledTimes(1));
    expect(writeClipboard).toHaveBeenCalledWith(EN_TEXT);
    expect(screen.getByRole("status")).toHaveTextContent("Result copied.");
  });

  it("shows an inline failure status when native sharing is rejected, without copying", async () => {
    const nativeShare = vi.fn().mockRejectedValue(new Error("cancelled"));
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    renderScreen({ dependencies: { nativeShare, writeClipboard } });

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Could not share or copy the result."),
    );
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("always calls the clipboard writer for Copy Result and reports success", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    renderScreen({ dependencies: { writeClipboard } });

    await userEvent.click(screen.getByRole("button", { name: "Copy Result" }));

    await waitFor(() => expect(writeClipboard).toHaveBeenCalledTimes(1));
    expect(writeClipboard).toHaveBeenCalledWith(EN_TEXT);
    expect(screen.getByRole("status")).toHaveTextContent("Result copied.");
  });

  it("shows an inline failure status when the clipboard write rejects", async () => {
    const writeClipboard = vi.fn().mockRejectedValue(new Error("denied"));
    renderScreen({ dependencies: { writeClipboard } });

    await userEvent.click(screen.getByRole("button", { name: "Copy Result" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Could not share or copy the result."),
    );
  });

  it("regenerates the share text in the current language at click time", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nProvider initialLanguage="en">
        <LanguageToggle />
        <GameOverScreen
          equation={EQUATION}
          stats={STATS}
          variant={PRACTICE}
          url={URL}
          dependencies={{ nativeShare, writeClipboard }}
          onPlayAgain={vi.fn()}
          onPractice={vi.fn()}
        />
      </I18nProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(nativeShare).toHaveBeenNthCalledWith(1, { text: EN_TEXT, url: URL });

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));
    await userEvent.click(screen.getByRole("button", { name: "공유" }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(2));
    expect(nativeShare).toHaveBeenNthCalledWith(2, { text: KO_TEXT, url: URL });
  });
});

describe("GameOverScreen verdicts", () => {
  const PUZZLE_STATS = { kind: "practice", won: true, par: 7, rows: 8, score: 7, longestStreak: 4 } as const;
  const statValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

  // The table is finished and par is made: nothing is left to explain, so the
  // slot a loss gives its equation carries only the reason.
  it("sets made par in gold, with no equation", () => {
    renderScreen({ equation: null, stats: PUZZLE_STATS });

    expect(screen.getByRole("heading", { name: "Made par" })).toHaveClass(styles.won);
    expect(screen.getByText("All eight rows played.")).toBeInTheDocument();
    expect(screen.queryByText("2 × 3 =", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(statValue("Score")).toBe("7 / 8");
    expect(statValue("Par")).toBe("7");
    expect(statValue("Longest streak")).toBe("4");
  });

  // The terminal's first paragraph is styled as the stepped-down terminal
  // equation. With no equation, the reason is that first paragraph and must
  // not inherit the equation's treatment. Probed by computed style, since a
  // `.reason` that keeps its own size reads back unset in jsdom, which
  // substitutes no var().
  it("keeps the reason a caption when no equation precedes it", () => {
    renderScreen({ equation: null, stats: PUZZLE_STATS });

    const reason = screen.getByText("All eight rows played.");
    expect(getComputedStyle(reason).fontSize).not.toBe("var(--size-title)");
  });

  it("names the shortfall in ink when par is missed on a finished table", () => {
    renderScreen({ equation: null, stats: { ...PUZZLE_STATS, won: false, score: 5 } });

    const heading = screen.getByRole("heading", { name: "2 short of par" });
    expect(heading).not.toHaveClass(styles.won);
    // Ink, not vermilion: a short table is a score to read, not a tile
    // leaving. Read by computed colour, which jsdom resolves from the
    // cascade without substituting var().
    expect(heading).toHaveClass(styles.shortOfPar);
    expect(getComputedStyle(heading).color).toBe("var(--text-primary)");
    expect(screen.getByText("All eight rows played.")).toBeInTheDocument();
    expect(statValue("Score")).toBe("5 / 8");
  });

  it("keeps the terminal equation and the loss reason when the run ended early", () => {
    renderScreen({
      equation: makeEquation(7, 8),
      stats: { ...PUZZLE_STATS, won: false, score: 1 },
    });

    expect(screen.getByText("7 × 8 =")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("Not enough tiles left to answer.")).toBeInTheDocument();
    expect(screen.queryByText("All eight rows played.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "6 short of par" })).toBeInTheDocument();
  });

  it("copies the share text", async () => {
    const { dependencies } = renderScreen({ equation: null, stats: PUZZLE_STATS });

    await userEvent.click(screen.getByRole("button", { name: "Copy Result" }));

    await waitFor(() => expect(dependencies.writeClipboard).toHaveBeenCalledTimes(1));
    expect(dependencies.writeClipboard).toHaveBeenCalledWith(
      "9dle Practice — Made par — Score: 7/8 · par 7\nLongest streak: 4\n\nCan you make par?\nhttps://example.test/",
    );
  });
});

describe("GameOverScreen variants", () => {
  const DAILY = { kind: "daily", number: 12 } as const;
  const dailyStats = { ...STATS, ...DAILY };

  function renderVariant(initialLanguage: "en" | "ko", variant: GameOverScreenProps["variant"]) {
    const stats = variant.kind === "daily" ? dailyStats : STATS;
    const onPlayAgain = vi.fn();
    const onPractice = vi.fn();
    render(
      <I18nProvider initialLanguage={initialLanguage}>
        <GameOverScreen
          equation={EQUATION}
          stats={stats}
          variant={variant}
          url={URL}
          dependencies={{ writeClipboard: vi.fn().mockResolvedValue(undefined) }}
          onPlayAgain={onPlayAgain}
          onPractice={onPractice}
        />
      </I18nProvider>,
    );
    return { onPlayAgain, onPractice };
  }

  it.each([
    ["en", "Table #12", "The next table opens at midnight.", "Practice", "Play Again", "Press R to play again"],
    ["ko", "12번째 판", "다음 판은 자정에 열립니다.", "연습", "다시 하기", "R 키를 눌러 다시 하기"],
  ] as const)("shows a Daily's number, next table and Practice, and no Play Again, in %s", async (language, number, next, practice, playAgain, hint) => {
    const { onPractice } = renderVariant(language, DAILY);

    expect(screen.getByText(number)).toBeInTheDocument();
    expect(screen.getByText(next)).toBeInTheDocument();
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: playAgain })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: practice }));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["en", "Play Again", "Press R to play again", "Table #12", "The next table opens at midnight.", "Practice"],
    ["ko", "다시 하기", "R 키를 눌러 다시 하기", "12번째 판", "다음 판은 자정에 열립니다.", "연습"],
  ] as const)("shows a Practice run's Play Again and R hint, and no number or next table, in %s", async (language, playAgain, hint, number, next, practice) => {
    const { onPlayAgain } = renderVariant(language, PRACTICE);

    expect(screen.getByText(hint)).toBeInTheDocument();
    expect(screen.queryByText(number)).not.toBeInTheDocument();
    expect(screen.queryByText(next)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: practice })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: playAgain }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
