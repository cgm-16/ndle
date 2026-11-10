import { createPuzzleStart, createTitleState } from "../game/factories";
import { gameReducer } from "../game/gameReducer";
import { applyMove, type Replay } from "../game/replay";
import type {
  Digit,
  Equation,
  GameState,
  PuzzleMove,
  PuzzleRow,
  PuzzleTable,
  RandomSource,
  Tile,
  TileIdFactory,
} from "../game/types";

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

export type { PuzzleMove };

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

export const puzzleStart = (table = PUZZLE_SAMPLE, ids = sequentialIds()): GameState =>
  gameReducer(createTitleState(), createPuzzleStart(table, ids));

export const tileWith = (state: GameState, digit: Digit): Tile =>
  state.inventory.find((tile) => tile.digit === digit)!;

/** Selects a held tile of each digit, in order. */
export const selectDigits = (state: GameState, ...digits: Digit[]): GameState =>
  digits.reduce(
    (next, digit) => gameReducer(next, { type: "SELECT_TILE", tileId: tileWith(next, digit).id }),
    state,
  );

// One move through the reducer exactly as App plays it (see applyMove). It
// stops before the advance.
export function playRow(state: GameState, move: PuzzleMove, ids: TileIdFactory): GameState {
  const replay: Replay = { state, actions: [] };
  if (!applyMove(replay, move, ids)) throw new Error(`move refused: ${JSON.stringify(move)}`);
  return replay.state;
}

// Plays moves, each advanced to the next row as App does.
export function play(state: GameState, line: PuzzleMove[], ids: TileIdFactory): GameState {
  for (const move of line) {
    state = gameReducer(playRow(state, move, ids), { type: "NEXT_ROUND" });
  }
  return state;
}

// The sample's par line, played through the reducer. Each state deals its own
// ids unless given some, so the hand is tile-0 to tile-4 in deal order and the
// pays follow.

/** The par line played up to `row`, which is then answering. */
export const parLineAt = (row: number, ids = sequentialIds()): GameState =>
  play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE.slice(0, row - 1), ids);

/** Row 1 of the sample, its hand 1 4 5 7 9 dealt. */
export const makeAnsweringState = (overrides: Partial<GameState> = {}): GameState => ({
  ...puzzleStart(),
  ...overrides,
});

/** Row 1's sacrifice judged: 57 for 15, incorrect, leaving 1 4 9. */
export const makeFeedbackState = (overrides: Partial<GameState> = {}): GameState => {
  const ids = sequentialIds();
  return { ...playRow(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE[0]!, ids), ...overrides };
};

/** Row 4's 7 answered: six tiles, 1 2 4 6 8 seated and the second 4 on the rail. */
export const makeOverflowState = (overrides: Partial<GameState> = {}): GameState => {
  const ids = sequentialIds();
  return { ...playRow(parLineAt(4, ids), { spend: PUZZLE_SAMPLE_PAR_LINE[3]!.spend }, ids), ...overrides };
};

/** The whole par line: score 7 against par 7, longest streak 7. */
export const makeGameOverState = (overrides: Partial<GameState> = {}): GameState => {
  const ids = sequentialIds();
  return { ...play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE, ids), ...overrides };
};
