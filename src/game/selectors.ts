import type { Equation, GameState, Tile } from "./types";
import {
  INVENTORY_CAPACITY,
  PUZZLE_CAPACITY,
  REWARD_BONUS,
} from "./balance";

export function getAnswerLength(equation: Equation): 1 | 2 {
  return equation.product >= 10 ? 2 : 1;
}

// Single source of truth for the reward count: App.tsx generates this many
// tiles and gameReducer.ts validates the action against it, so the two can
// no longer disagree by drifting apart independently.
export function getRewardCount(spentCount: number): number {
  return spentCount + REWARD_BONUS;
}

// The number a selection spells; null when empty.
export function constructAnswer(selectedTiles: readonly Tile[]): number | null {
  if (selectedTiles.length === 0) return null;
  return Number(selectedTiles.map((tile) => tile.digit).join(""));
}

// Correct when each slot's tile holds the digit that slot needs (§1.4).
export function answerMatches(selectedTiles: readonly Tile[], product: number): boolean {
  const needed = String(product);
  return (
    selectedTiles.length === needed.length &&
    selectedTiles.every((tile, slot) => tile.digit === Number(needed[slot]))
  );
}

export function canAttemptEquation(
  inventory: readonly Tile[],
  equation: Equation,
): boolean {
  return inventory.length >= getAnswerLength(equation);
}

// Tries every ordered pair of distinct tiles (every tile, for one digit):
// answers are at most two digits.
export function canConstruct(inventory: readonly Tile[], product: number): boolean {
  if (product < 10) return inventory.some((tile) => answerMatches([tile], product));
  return inventory.some((first, i) =>
    inventory.some((second, j) => i !== j && answerMatches([first, second], product)),
  );
}

export function getCapacity(state: Pick<GameState, "mode">): number {
  return state.mode === "puzzle" ? PUZZLE_CAPACITY : INVENTORY_CAPACITY;
}

export function getOverflowCount(state: Pick<GameState, "inventory" | "mode">): number {
  return Math.max(0, state.inventory.length - getCapacity(state));
}

// A run is complete once every row of its Puzzle table is submitted. The next
// advance then ends it (§1.8 step 0).
export function isRunComplete(state: Pick<GameState, "mode" | "totalRounds" | "table">): boolean {
  return state.mode === "puzzle" && state.totalRounds >= state.table!.rows.length;
}

// Par is made at game over with a score equal to the table's par, however the
// run ended.
export function isParMade(state: Pick<GameState, "phase" | "mode" | "score" | "table">): boolean {
  return (
    state.phase === "gameOver" &&
    state.mode === "puzzle" &&
    state.table !== undefined &&
    state.score === state.table.par
  );
}

export function isSubmissionReady(state: GameState): boolean {
  return (
    state.phase === "answering" &&
    state.equation !== null &&
    state.selectedTiles.length === getAnswerLength(state.equation)
  );
}

