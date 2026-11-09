import { describe, expect, it } from "vitest";
import type { Tile } from "./types";
import { createInitialInventory, createTiles, createTitleState, sortTiles } from "./factories";
import { sequentialIds } from "../test/fixtures";

describe("createTitleState", () => {
  it("returns empty arrays, null equation/result, zero statistics, round 0, and phase title", () => {
    expect(createTitleState()).toEqual({
      phase: "title",
      mode: "endless",
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
    });
  });

  it("returns a fresh state object on every call", () => {
    const first = createTitleState();
    const second = createTitleState();
    expect(first).not.toBe(second);
    expect(first.inventory).not.toBe(second.inventory);
  });
});

describe("createInitialInventory", () => {
  it("creates one sorted non-new tile for every digit", () => {
    const inventory = createInitialInventory(sequentialIds());
    expect(inventory.map((tile) => tile.digit)).toEqual([0,1,2,3,4,5,6,7,8,9]);
    expect(new Set(inventory.map((tile) => tile.id)).size).toBe(10);
    expect(inventory.every((tile) => tile.isNew === false)).toBe(true);
  });
});

describe("createInitialInventory with a count", () => {
  it("deals round-robin, two of each digit at twenty, sorted", () => {
    const inventory = createInitialInventory(sequentialIds(), 20);
    expect(inventory.map((tile) => tile.digit)).toEqual(
      [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9],
    );
    expect(new Set(inventory.map((tile) => tile.id)).size).toBe(20);
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
