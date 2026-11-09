import { describe, expect, it } from "vitest";
import type { Tile } from "./types";
import { createPuzzleStart, createTiles, createTitleState, sortTiles } from "./factories";
import { PUZZLE_SAMPLE, sequentialIds } from "../test/fixtures";

describe("createTitleState", () => {
  it("returns empty arrays, null table/equation/result, zero statistics, round 0, and phase title", () => {
    expect(createTitleState()).toEqual({
      phase: "title",
      table: null,
      equation: null,
      inventory: [],
      selectedTiles: [],
      pendingDiscards: [],
      score: 0,
      round: 0,
      totalRounds: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastResult: null,
      rowResults: [],
    });
  });

  it("returns a fresh state object on every call", () => {
    const first = createTitleState();
    const second = createTitleState();
    expect(first).not.toBe(second);
    expect(first.inventory).not.toBe(second.inventory);
  });
});

describe("sortTiles", () => {
  it("sorts duplicate digits by stable ID without mutating input", () => {
    const input = [
      { id: "b", digit: 4, isNew: false },
      { id: "a", digit: 4, isNew: true },
      { id: "z", digit: 1, isNew: false },
    ] satisfies Tile[];
    expect(sortTiles(input).map((tile) => tile.id)).toEqual(["z", "a", "b"]);
    expect(input.map((tile) => tile.id)).toEqual(["b", "a", "z"]);
  });
});

describe("createTiles", () => {
  it("builds tiles from digits in the given order", () => {
    expect(createTiles([5, 9, 1], sequentialIds())).toEqual([
      { id: "tile-0", digit: 5, isNew: false },
      { id: "tile-1", digit: 9, isNew: false },
      { id: "tile-2", digit: 1, isNew: false },
    ]);
  });
});

describe("createPuzzleStart", () => {
  it("starts the table with its hand dealt in rack order", () => {
    expect(createPuzzleStart(PUZZLE_SAMPLE, sequentialIds())).toEqual({
      type: "START_RUN",
      table: PUZZLE_SAMPLE,
      inventory: [
        { id: "tile-2", digit: 1, isNew: false },
        { id: "tile-3", digit: 4, isNew: false },
        { id: "tile-0", digit: 5, isNew: false },
        { id: "tile-4", digit: 7, isNew: false },
        { id: "tile-1", digit: 9, isNew: false },
      ],
    });
  });
});
