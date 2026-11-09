import { describe, expect, it, vi } from "vitest";
import { createTitleState } from "../game/factories";
import { makeGameOverState } from "../test/fixtures";
import { copyResult, formatShareText, getShareStats, shareResult } from "./sharing";
import type { ShareDependencies } from "./sharing";

const MADE_PAR_TEXT =
  "ozterisk — Made par — Score: 7/8 · par 7\nLongest streak: 7\n\nCan you make par?\nhttps://example.test/";

describe("getShareStats", () => {
  const madePar = makeGameOverState();

  it("reports made par as won, with the table's par and length", () => {
    expect(getShareStats(madePar)).toEqual({ won: true, par: 7, rows: 8, score: 7, longestStreak: 7 });
    expect(getShareStats({ ...madePar, score: 6 }).won).toBe(false);
  });

  it("throws for a state with no table", () => {
    expect(() => getShareStats(createTitleState())).toThrow(RangeError);
  });
});

describe("formatShareText", () => {
  const madePar = makeGameOverState();

  it("formats the English share text exactly", () => {
    const text = formatShareText(getShareStats(madePar), "en", "https://example.test/");

    expect(text).toBe(MADE_PAR_TEXT);
    expect(formatShareText(getShareStats({ ...madePar, score: 4 }), "en", "https://example.test/")).toMatch(
      /^ozterisk — 3 short of par — Score: 4\/8 · par 7\n/,
    );

    const lines = text.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[2]).toBe("");
    expect(lines[4]).toBe("https://example.test/");
  });

  it("formats the Korean share text exactly", () => {
    expect(formatShareText(getShareStats(madePar), "ko", "https://example.test/")).toBe(
      "ozterisk — 목표 달성 — 점수: 7/8 · 목표 7\n최장 연속 정답: 7\n\n목표를 달성할 수 있나요?\nhttps://example.test/",
    );
    expect(formatShareText(getShareStats({ ...madePar, score: 4 }), "ko", "https://example.test/")).toMatch(
      /^ozterisk — 목표까지 3점 부족 — 점수: 4\/8 · 목표 7\n/,
    );
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
