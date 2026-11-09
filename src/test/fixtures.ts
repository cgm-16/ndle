import { createInitialInventory, createTitleState } from "../game/factories";
import type {
  Digit,
  Equation,
  GameState,
  PuzzleRow,
  PuzzleTable,
  RandomSource,
  Tile,
  TileIdFactory,
} from "../game/types";

export const sequenceRandom = (...values: number[]): RandomSource => {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error("Random sequence exhausted");
    index += 1;
    return value;
  };
};

// mulberry32, for tests only: the research tables were dealt with it, so a
// seeded source can replay them. Production never seeds a run.
export const seededRandom = (seed: number): RandomSource => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const sequentialIds = (prefix = "tile"): TileIdFactory => {
  let index = 0;
  return () => `${prefix}-${index++}`;
};

export const makeEquation = (left: number, right: number): Equation => ({
  left,
  right,
  product: left * right,
});

export const makeTile = (
  digit: Digit,
  id = `tile-${digit}`,
  isNew = false,
): Tile => ({ id, digit, isNew });

export const makeAnsweringState = (
  equation: Equation,
  overrides: Partial<GameState> = {},
): GameState => ({
  ...createTitleState(),
  phase: "answering",
  equation,
  inventory: createInitialInventory(sequentialIds()),
  round: 1,
  ...overrides,
});

// A §2.5-legal feedback-phase state: lastResult is non-null and round === totalRounds.
export const makeFeedbackState = (
  equation: Equation,
  overrides: Partial<GameState> = {},
): GameState => ({
  ...makeAnsweringState(equation, { round: 1, totalRounds: 1 }),
  phase: "feedback",
  lastResult: {
    kind: "incorrect",
    // Operands are 1..9, so no product is ever 0: this cannot collide with
    // correctValue the way a literal 1 does against the equation 1 x 1.
    submittedValue: 0,
    correctValue: equation.product,
    submittedTiles: [],
    rewardTileIds: [],
  },
  ...overrides,
});

// Overflow inventories are defined by size alone; the digits only need to
// exist. `size - INVENTORY_CAPACITY` is the excess the player must discard.
export const makeOverflowInventory = (size: number): Tile[] =>
  Array.from({ length: size }, (_, index) => makeTile((index % 9) as Digit, `tile-${index}`));

// A §2.5-legal overflow-phase state: inventory exceeds capacity (excess 1 by
// default), lastResult is non-null, and round === totalRounds.
export const makeOverflowState = (
  equation: Equation,
  overrides: Partial<GameState> = {},
): GameState => ({
  ...makeFeedbackState(equation, { inventory: makeOverflowInventory(11) }),
  phase: "overflow",
  ...overrides,
});

// A §2.5-legal gameOver state: round === totalRounds + 1 and the terminal
// equation is still on screen (§1.8).
export const makeGameOverState = (
  equation: Equation,
  overrides: Partial<GameState> = {},
): GameState => ({
  ...makeAnsweringState(equation, { round: 13, totalRounds: 12 }),
  phase: "gameOver",
  score: 7,
  longestStreak: 4,
  ...overrides,
});

export const makePuzzleRow = (left: number, right: number, pay: Digit[]): PuzzleRow => ({
  equation: makeEquation(left, right),
  pay,
});

// The draft's showcase table (its §5): mulberry32 seed 16641, par 7, and par
// needs a sacrifice on row 1. Hand in deal order.
export const PUZZLE_SAMPLE: PuzzleTable = {
  hand: [5, 9, 1, 4, 7],
  rows: [
    makePuzzleRow(3, 5, [9, 5, 5]),
    makePuzzleRow(7, 2, [8, 1, 6]),
    makePuzzleRow(3, 3, [2, 7]),
    makePuzzleRow(1, 7, [4, 4]),
    makePuzzleRow(4, 1, [6, 2]),
    makePuzzleRow(8, 3, [0, 7, 7]),
    makePuzzleRow(2, 3, [8, 8]),
    makePuzzleRow(3, 4, [2, 0, 2]),
  ],
  par: 7,
};

/** One row's play: the tiles spent, in slot order, and the overflow discard. */
export interface PuzzleMove {
  spend: Digit[];
  discard?: Digit;
}

// The sample's canonical par line. Row 1 is the sacrifice: 57 for 15.
export const PUZZLE_SAMPLE_PAR_LINE: PuzzleMove[] = [
  { spend: [5, 7] },
  { spend: [1, 4] },
  { spend: [9] },
  { spend: [7], discard: 6 },
  { spend: [4], discard: 8 },
  { spend: [2, 4], discard: 0 },
  { spend: [6], discard: 7 },
  { spend: [1, 2], discard: 0 },
];
