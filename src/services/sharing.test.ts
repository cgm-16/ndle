import { describe, expect, it, vi } from "vitest";
import { makeEquation, makeGameOverState, PUZZLE_SAMPLE } from "../test/fixtures";
import { copyResult, formatShareText, getShareStats, shareResult } from "./sharing";
import type { ShareDependencies, ShareStats } from "./sharing";

describe("getShareStats", () => {
  it("never reports an Endless run as won", () => {
    const state = makeGameOverState(makeEquation(3, 3), { mode: "endless", totalRounds: 28 });
    expect(getShareStats(state).won).toBe(false);
  });

  it("does not let an Endless run be typed as won", () => {
    // @ts-expect-error — only Puzzle can win.
    const endlessWin: ShareStats = { mode: "endless", won: true, score: 0, totalRounds: 0, longestStreak: 0 };
    expect(endlessWin.mode).toBe("endless");
  });
});

describe("formatShareText", () => {
  it("formats the English share text exactly", () => {
    const text = formatShareText(
      { mode: "endless", won: false, score: 7, totalRounds: 12, longestStreak: 4 },
      "en",
      "https://example.test/",
    );

    expect(text).toBe(
      "ozterisk — Rounds: 12\nScore: 7\nLongest streak: 4\n\nCan you beat it?\nhttps://example.test/",
    );

    const lines = text.split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[3]).toBe("");
    expect(lines[5]).toBe("https://example.test/");
  });

  it("formats the Korean share text exactly", () => {
    const text = formatShareText(
      { mode: "endless", won: false, score: 7, totalRounds: 12, longestStreak: 4 },
      "ko",
      "https://example.test/",
    );

    expect(text).toBe(
      "ozterisk — 라운드: 12\n점수: 7\n최장 연속 정답: 4\n\n이 기록을 넘을 수 있나요?\nhttps://example.test/",
    );

    const lines = text.split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[3]).toBe("");
    expect(lines[5]).toBe("https://example.test/");
  });
});

describe("Puzzle", () => {
  const madePar = { ...makeGameOverState(PUZZLE_SAMPLE.rows[7]!.equation), mode: "puzzle" as const,
    table: PUZZLE_SAMPLE, rowResults: [], score: 7, totalRounds: 8, longestStreak: 4 };

  it("reports made par as won, with the table's par and length", () => {
    expect(getShareStats(madePar)).toEqual({
      mode: "puzzle", won: true, par: 7, rows: 8, score: 7, totalRounds: 8, longestStreak: 4,
    });
    expect(getShareStats({ ...madePar, score: 6 }).won).toBe(false);
  });

  it("formats the English Puzzle share text exactly", () => {
    expect(formatShareText(getShareStats(madePar), "en", "https://example.test/")).toBe(
      "ozterisk Puzzle — Made par — Score: 7/8 · par 7\nLongest streak: 4\n\nCan you make par?\nhttps://example.test/",
    );
    expect(formatShareText(getShareStats({ ...madePar, score: 4 }), "en", "https://example.test/")).toMatch(
      /^ozterisk Puzzle — 3 short of par — Score: 4\/8 · par 7\n/,
    );
  });

  it("formats the Korean Puzzle share text exactly", () => {
    expect(formatShareText(getShareStats(madePar), "ko", "https://example.test/")).toBe(
      "ozterisk 묘수풀이 — 목표 달성 — 점수: 7/8 · 목표 7\n최장 연속 정답: 4\n\n목표를 달성할 수 있나요?\nhttps://example.test/",
    );
    expect(formatShareText(getShareStats({ ...madePar, score: 4 }), "ko", "https://example.test/")).toMatch(
      /^ozterisk 묘수풀이 — 목표까지 3점 부족 — 점수: 4\/8 · 목표 7\n/,
    );
  });
});

describe("shareResult", () => {
  const text = "ozterisk — Rounds: 9\nScore: 7\nLongest streak: 4\n\nCan you beat it?\nhttps://example.test/";
  const url = "https://example.test/";

  it("shares natively when available and never touches the clipboard", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const dependencies: ShareDependencies = { nativeShare, writeClipboard };

    const outcome = await shareResult(text, url, dependencies);

    expect(outcome).toBe("shared");
    expect(nativeShare).toHaveBeenCalledTimes(1);
    expect(nativeShare).toHaveBeenCalledWith({ text, url });
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when native sharing is unavailable", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const dependencies: ShareDependencies = { writeClipboard };

    const outcome = await shareResult(text, url, dependencies);

    expect(outcome).toBe("copied");
    expect(writeClipboard).toHaveBeenCalledTimes(1);
    expect(writeClipboard).toHaveBeenCalledWith(text);
  });

  it("reports failure when native sharing rejects, without an implicit clipboard call", async () => {
    const nativeShare = vi.fn().mockRejectedValue(new Error("cancelled"));
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const dependencies: ShareDependencies = { nativeShare, writeClipboard };

    const outcome = await shareResult(text, url, dependencies);

    expect(outcome).toBe("failed");
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("reports failure when the clipboard fallback also rejects", async () => {
    const writeClipboard = vi.fn().mockRejectedValue(new Error("denied"));
    const dependencies: ShareDependencies = { writeClipboard };

    const outcome = await shareResult(text, url, dependencies);

    expect(outcome).toBe("failed");
  });
});

describe("copyResult", () => {
  const text = "ozterisk — Rounds: 9\nScore: 7\nLongest streak: 4\n\nCan you beat it?\nhttps://example.test/";

  it("resolves to copied when the clipboard write succeeds", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);

    const outcome = await copyResult(text, { writeClipboard });

    expect(outcome).toBe("copied");
    expect(writeClipboard).toHaveBeenCalledWith(text);
  });

  it("resolves to failed when the clipboard write rejects", async () => {
    const writeClipboard = vi.fn().mockRejectedValue(new Error("denied"));

    const outcome = await copyResult(text, { writeClipboard });

    expect(outcome).toBe("failed");
  });
});
