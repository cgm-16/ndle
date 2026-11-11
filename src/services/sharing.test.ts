import { describe, expect, it, vi } from "vitest";
import { createTitleState } from "../game/factories";
import { DAILY_TABLES } from "../game/dailyTables";
import { solvePuzzle } from "../game/puzzle";
import { replayMoves } from "../game/replay";
import { makeGameOverState, sequentialIds } from "../test/fixtures";
import { copyResult, formatShareText, getShareStats, shareResult } from "./sharing";
import type { PlayVariant, ShareDependencies } from "./sharing";

const URL = "https://example.test/";
const PRACTICE = { kind: "practice" } as const;
const DAILY = { kind: "daily", number: 12 } as const;
const MADE_PAR_TEXT =
  "9dle Practice — Made par — Score: 7/8 · par 7\nLongest streak: 7\n\nCan you make par?\nhttps://example.test/";

describe("getShareStats", () => {
  const madePar = makeGameOverState();

  it("reports made par as won, with the table's par and length", () => {
    expect(getShareStats(madePar, PRACTICE)).toEqual({ kind: "practice", won: true, par: 7, rows: 8, score: 7, longestStreak: 7 });
    expect(getShareStats({ ...madePar, score: 6 }, PRACTICE).won).toBe(false);
  });

  it("carries a Daily's number", () => {
    expect(getShareStats(madePar, DAILY)).toMatchObject({ kind: "daily", number: 12 });
  });

  it("throws for a state with no table", () => {
    expect(() => getShareStats(createTitleState(), PRACTICE)).toThrow(RangeError);
  });
});

describe("formatShareText", () => {
  const madePar = makeGameOverState();
  const short = { ...madePar, score: 6 };
  const text = (state: typeof madePar, variant: PlayVariant, language: "en" | "ko") =>
    formatShareText(getShareStats(state, variant), language, URL);

  it("formats a Daily's English text, made par", () => {
    expect(text(madePar, DAILY, "en")).toBe("9dle #12 — Made par — 7/8 · par 7\nhttps://example.test/");
  });

  it("formats a Daily's English text, short of par", () => {
    expect(text(short, DAILY, "en")).toBe("9dle #12 — 1 short of par — 6/8 · par 7\nhttps://example.test/");
  });

  it("formats a Daily's Korean text, made par", () => {
    expect(text(madePar, DAILY, "ko")).toBe("구들 #12 — 목표 달성 — 7/8 · 목표 7\nhttps://example.test/");
  });

  it("formats a Daily's Korean text, short of par", () => {
    expect(text(short, DAILY, "ko")).toBe("구들 #12 — 목표까지 1점 부족 — 6/8 · 목표 7\nhttps://example.test/");
  });

  it("formats Practice's English text", () => {
    expect(text(madePar, PRACTICE, "en")).toBe(MADE_PAR_TEXT);
  });

  it("formats Practice's Korean text", () => {
    expect(text(madePar, PRACTICE, "ko")).toBe(
      "구들 연습 — 목표 달성 — 점수: 7/8 · 목표 7\n최장 연속 정답: 7\n\n목표를 달성할 수 있나요?\nhttps://example.test/",
    );
  });

  it("never puts a row in the daily text", () => {
    for (const table of DAILY_TABLES.slice(0, 10)) {
      const ids = sequentialIds();
      const state = replayMoves(table, solvePuzzle(table).parLine, ids)!.state;
      for (const language of ["en", "ko"] as const) {
        const shared = text(state, DAILY, language);
        expect(shared).not.toContain("×");
        expect(shared).not.toContain("=");
      }
    }
  });
});

describe("shareResult", () => {
  const text = MADE_PAR_TEXT;
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
  const text = MADE_PAR_TEXT;

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
