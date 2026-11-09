import type { Digit, GameState, Tile, TileIdFactory } from "./types";

const ALL_DIGITS: readonly Digit[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createTitleState(): GameState {
  return {
    phase: "title",
    mode: "puzzle",
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
  };
}

// Deals round-robin through the digits, so a hand of 10 holds one of each and a
// hand of 20 two of each (§1.3). Sorted, since the deal order is by digit.
export function createInitialInventory(
  idFactory: TileIdFactory,
  count = ALL_DIGITS.length,
): Tile[] {
  const digits = Array.from({ length: count }, (_, index) => ALL_DIGITS[index % ALL_DIGITS.length]);
  return sortTiles(createTiles(digits, idFactory));
}

// Digit tiles in the given order, unsorted: a Puzzle pay arrives in its printed
// order.
export function createTiles(digits: readonly Digit[], idFactory: TileIdFactory): Tile[] {
  return digits.map((digit) => ({ id: idFactory(), digit, isNew: false }));
}

// Rack order (§1.4a): digits ascending, then by id.
export function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.digit !== b.digit) return a.digit - b.digit;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
