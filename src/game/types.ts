export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Language = "en" | "ko";
export type GameMode = "endless" | "puzzle";
export type GamePhase =
  | "title"
  | "answering"
  | "feedback"
  | "overflow"
  | "gameOver";

export type Tile = { id: string; digit: Digit; isNew: boolean };

export interface Equation {
  left: number;
  right: number;
  product: number;
}

export interface RoundResult {
  kind: "correct" | "incorrect";
  /** The product on a correct answer; the spelled number on an incorrect answer. */
  submittedValue: number;
  correctValue: number;
  submittedTiles: Tile[];
  rewardTileIds: string[];
  /** Set when this round's overflow discard completed; the round then advances on its own (§1.7). */
  discarded?: boolean;
}

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  equation: Equation | null;
  inventory: Tile[];
  selectedTiles: Tile[];
  pendingDiscards: string[];
  score: number;
  round: number;
  totalRounds: number;
  currentStreak: number;
  longestStreak: number;
  lastResult: RoundResult | null;
  /** Set only in Puzzle: the dealt table, for checking pays and ending the run. */
  table?: PuzzleTable;
  /** Set only in Puzzle: one entry per submitted row, in order, for the ledger's marks. */
  rowResults?: RoundResult["kind"][];
}

export type GameAction =
  | { type: "START_RUN"; mode: GameMode; equation: Equation; inventory: Tile[]; table?: PuzzleTable }
  | { type: "SELECT_TILE"; tileId: string }
  | { type: "RETURN_TILE"; tileId: string }
  | { type: "SUBMIT_CORRECT"; rewardTiles: Tile[] }
  | { type: "SUBMIT_INCORRECT" }
  | { type: "TOGGLE_DISCARD"; tileId: string }
  | { type: "NEXT_ROUND"; equation: Equation }
  | { type: "RESTART_RUN"; equation: Equation; inventory: Tile[]; table?: PuzzleTable } // keeps state.mode
  | { type: "CLEAR_SELECTION" };

export interface PuzzleRow {
  equation: Equation;
  /** The digits a correct answer takes, in arrival order. */
  pay: Digit[];
}

export interface PuzzleTable {
  hand: Digit[];
  rows: PuzzleRow[];
  par: number;
}

/** A table before the solver has priced it. */
export type PuzzleDeal = Omit<PuzzleTable, "par">;

export type RandomSource = () => number; // Contract: 0 <= value < 1
export type TileIdFactory = () => string;
