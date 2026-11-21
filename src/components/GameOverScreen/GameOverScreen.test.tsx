import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { messages } from "../../i18n/messages";
import { formatShareText, type ShareDependencies, type ShareStats } from "../../services/sharing";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import { GameOverScreen, type GameOverScreenProps } from "./GameOverScreen";

// A table that ended early, two short of par, after five rows: four answered, one missed.
const STATS = { kind: "practice", won: false, par: 7, rows: 8, score: 5, longestStreak: 4 } as const;
const ROWS = ["correct", "correct", "incorrect", "correct", "correct"] as const;
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
        rowResults={ROWS}
        stats={STATS}
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
  it("orders the score, par, longest streak", () => {
    renderScreen();

    const score = screen.getByText("5 / 8");
    const par = screen.getByText("Par");
    const streak = screen.getByText("Longest streak");

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(score.compareDocumentPosition(par) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(par.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // The R shortcut has no other affordance in the product, so its hint has to
  // sit with the button it presses.
  it("names the R shortcut under Play Again, in either language", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <LanguageToggle />
        <GameOverScreen
          rowResults={ROWS}
          stats={STATS}
          url={URL}
          dependencies={{ writeClipboard: vi.fn().mockResolvedValue(undefined) }}
          onPlayAgain={vi.fn()}
          onPractice={vi.fn()}
        />
      </I18nProvider>,
    );

    const hint = screen.getByText("Press R to play again");
    const playAgain = screen.getByRole("button", { name: "Play Again" });

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(playAgain.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
          rowResults={ROWS}
          stats={STATS}
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
  const FULL = Array<"correct">(8).fill("correct");
  const PUZZLE_STATS = { kind: "practice", won: true, par: 7, rows: 8, score: 7, longestStreak: 4 } as const;
  const statValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

  it("states made par on a finished table, with the table reason", () => {
    renderScreen({ rowResults: FULL, stats: PUZZLE_STATS });

    expect(screen.getByRole("heading", { name: "Made par" })).toBeInTheDocument();
    expect(screen.getByText("All eight rows played.")).toBeInTheDocument();
    expect(screen.getByText("7 / 8")).toBeInTheDocument();
    expect(statValue("Par")).toBe("7");
    expect(statValue("Longest streak")).toBe("4");
  });

  it("names the shortfall when par is missed on a finished table", () => {
    renderScreen({ rowResults: FULL, stats: { ...PUZZLE_STATS, won: false, score: 5 } });

    expect(screen.getByRole("heading", { name: "2 short of par" })).toBeInTheDocument();
    expect(screen.getByText("All eight rows played.")).toBeInTheDocument();
    expect(screen.getByText("5 / 8")).toBeInTheDocument();
  });

  it("gives the early end's reason and draws no equation", () => {
    renderScreen({ stats: { ...PUZZLE_STATS, won: false, score: 1 } });

    expect(screen.getByText("Not enough tiles left to answer.")).toBeInTheDocument();
    expect(screen.queryByText("All eight rows played.")).not.toBeInTheDocument();
    expect(screen.queryByText("=", { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "6 short of par" })).toBeInTheDocument();
  });

  it("copies the share text", async () => {
    const { dependencies } = renderScreen({ rowResults: FULL, stats: PUZZLE_STATS });

    await userEvent.click(screen.getByRole("button", { name: "Copy Result" }));

    await waitFor(() => expect(dependencies.writeClipboard).toHaveBeenCalledTimes(1));
    expect(dependencies.writeClipboard).toHaveBeenCalledWith(
      "9dle Practice — Made par — Score: 7/8 · par 7\nLongest streak: 4\n\nCan you make par?\nhttps://example.test/",
    );
  });
});

describe("GameOverScreen variants", () => {
  const DAILY_STATS = { ...STATS, kind: "daily", number: 12 } as const;

  function renderVariant(initialLanguage: "en" | "ko", stats: ShareStats, rowResults: GameOverScreenProps["rowResults"] = ROWS) {
    const onPlayAgain = vi.fn();
    const onPractice = vi.fn();
    render(
      <I18nProvider initialLanguage={initialLanguage}>
        <GameOverScreen
          rowResults={rowResults}
          stats={stats}
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
    const { onPractice } = renderVariant(language, DAILY_STATS);

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
    const { onPlayAgain } = renderVariant(language, STATS);

    expect(screen.getByText(hint)).toBeInTheDocument();
    expect(screen.queryByText(number)).not.toBeInTheDocument();
    expect(screen.queryByText(next)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: practice })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: playAgain }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["en", "Table #12 Made par", "Rows", "Row 1: answered", "Row 3: missed", "Row 6: not played", "Share", "Copy Result", "Practice"],
    ["ko", "12번째 판 목표 달성", "줄별 결과", "1번째 줄: 정답", "3번째 줄: 오답", "6번째 줄: 풀지 않음", "공유", "결과 복사", "연습"],
  ] as const)("names the Daily heading, the row marks and the button order in %s", (language, heading, rows, first, third, sixth, share, copy, last) => {
    renderVariant(language, { ...DAILY_STATS, won: true });

    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(heading);
    const list = screen.getByRole("list", { name: rows });
    expect(within(list).getAllByRole("listitem")).toHaveLength(8);
    // WebKit strips an unstyled list's role, so the attribute is explicit.
    expect(list).toHaveAttribute("role", "list");
    const item = (name: string) => within(list).getByText(name).closest("li") as HTMLElement;
    // The words are text inside the item; the mark itself is hidden from assistive tech.
    const shape = language === "ko" ? "circle" : "check";
    expect(item(first).querySelector("svg")).toHaveAttribute("data-shape", shape);
    expect(item(third).querySelector("svg")).toHaveAttribute("data-shape", "cross");
    expect(item(sixth).querySelector("svg")).toBeNull();
    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual([share, copy, last]);
  });

  it("says the table was played to its end when all eight rows are played and the last is a miss", () => {
    const eight = ["correct", "correct", "incorrect", "correct", "correct", "correct", "correct", "incorrect"] as const;
    renderVariant("en", STATS, eight);
    expect(screen.getByText(messages.en.gameOver.tableReason)).toBeInTheDocument();
    expect(screen.queryByText(messages.en.gameOver.reason)).not.toBeInTheDocument();
  });

  it("names a Practice heading by the verdict alone", () => {
    renderVariant("en", STATS);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("2 short of par");
  });

  it.each([
    ["en", { ...STATS }, EN_TEXT],
    ["ko", { ...STATS }, KO_TEXT],
    ["en", { ...STATS, kind: "daily", number: 12 }, formatShareText({ ...STATS, kind: "daily", number: 12 }, "en", URL)],
    ["ko", { ...STATS, kind: "daily", number: 12 }, formatShareText({ ...STATS, kind: "daily", number: 12 }, "ko", URL)],
  ] as const)("previews exactly the shared text, in %s", (language, stats, text) => {
    renderVariant(language, stats);
    // getByText would collapse the preview's line breaks, so compare the raw text.
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === text)).toBeInTheDocument();
  });
});
