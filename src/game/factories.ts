import type { Digit, GameState, PuzzleTable, Tile, TileIdFactory } from "./types";

export function createTitleState(): GameState {
  return {
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
  };
}

// A run's opening action: the table's hand, dealt in rack order. The reducer
// takes row 1's equation from the table.
export function createPuzzleStart(
  table: PuzzleTable,
  nextTileId: TileIdFactory,
): { type: "START_RUN"; table: PuzzleTable; inventory: Tile[] } {
  return { type: "START_RUN", table, inventory: sortTiles(createTiles(table.hand, nextTileId)) };
}

// Digit tiles in the given order, unsorted: a Puzzle pay arrives in its printed
// order.
export function createTiles(digits: readonly Digit[], idFactory: TileIdFactory): Tile[] {
  return digits.map((digit) => ({ id: idFactory(), digit, isNew: false }));
}

// Rack order (§1.3): digits ascending, then by id.
export function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.digit !== b.digit) return a.digit - b.digit;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
