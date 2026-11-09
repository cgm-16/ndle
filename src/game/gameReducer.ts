import type { Equation, GameAction, GameMode, GameState, PuzzleTable, Tile } from "./types";
import { sortTiles } from "./factories";
import {
  answerMatches,
  canAttemptEquation,
  constructAnswer,
  getAnswerLength,
  getOverflowCount,
  getRewardCount,
  isRunComplete,
} from "./selectors";

// Round 1, zero statistics, straight into answering — shared by START_RUN and
// RESTART_RUN, which both begin a run from action-provided equation/inventory.
// A table makes it a Puzzle run; other modes carry neither Puzzle key.
function freshRunState(
  mode: GameMode,
  equation: Equation,
  inventory: Tile[],
  table?: PuzzleTable,
): GameState {
  return {
    phase: "answering",
    mode,
    equation,
    inventory,
    selectedTiles: [],
    pendingDiscards: [],
    score: 0,
    round: 1,
    totalRounds: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastResult: null,
    ...(table && { table, rowResults: [] }),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Unguarded by phase, unlike RESTART_RUN: only TitleScreen dispatches it,
    // so title is the only phase it arrives from, and a fresh run owes
    // nothing to the state it replaces.
    case "START_RUN":
      if (action.mode === "puzzle" && !action.table) return state;
      return freshRunState(action.mode, action.equation, action.inventory, action.table);

    case "SELECT_TILE": {
      if (state.phase !== "answering" || state.equation === null) return state;
      if (state.selectedTiles.length >= getAnswerLength(state.equation)) return state;
      const tile = state.inventory.find((item) => item.id === action.tileId);
      if (!tile) return state;
      return {
        ...state,
        inventory: state.inventory.filter((item) => item.id !== action.tileId),
        selectedTiles: [...state.selectedTiles, tile],
      };
    }

    case "RETURN_TILE": {
      if (state.phase !== "answering") return state;
      const tile = state.selectedTiles.find((item) => item.id === action.tileId);
      if (!tile) return state;
      return {
        ...state,
        selectedTiles: state.selectedTiles.filter((item) => item.id !== action.tileId),
        inventory: sortTiles([...state.inventory, tile]),
      };
    }

    case "SUBMIT_CORRECT": {
      if (state.phase !== "answering" || state.equation === null) return state;
      if (state.selectedTiles.length !== getAnswerLength(state.equation)) return state;
      if (!answerMatches(state.selectedTiles, state.equation.product)) return state;
      if (action.rewardTiles.length !== getRewardCount(state.selectedTiles.length)) return state;
      // A Puzzle row pays the digits printed on it, in order.
      if (state.table) {
        const pay = state.table.rows[state.round - 1]?.pay;
        if (!pay || action.rewardTiles.some((tile, index) => tile.digit !== pay[index])) {
          return state;
        }
      }
      const inventoryIds = new Set(state.inventory.map((tile) => tile.id));
      if (action.rewardTiles.some((tile) => inventoryIds.has(tile.id))) return state;

      const newRewardTiles = action.rewardTiles.map((tile) => ({ ...tile, isNew: true }));
      const arrived = [...state.inventory, ...newRewardTiles];
      const nextCurrentStreak = state.currentStreak + 1;
      const nextTotalRounds = state.totalRounds + 1;
      // Checked against the capacity after this submission, so a seal it makes
      // is already counted (§1.7).
      const overflowCount = getOverflowCount({
        mode: state.mode,
        inventory: arrived,
        totalRounds: nextTotalRounds,
      });
      // Sort only what fits. The tiles past capacity are the newest arrivals, in
      // arrival order, and perch on the rail — sorting first would always perch
      // the highest digits (§1.5 step 7).
      const fits = arrived.length - overflowCount;
      const nextInventory = [...sortTiles(arrived.slice(0, fits)), ...arrived.slice(fits)];

      return {
        ...state,
        phase: overflowCount > 0 ? "overflow" : "feedback",
        inventory: nextInventory,
        selectedTiles: [],
        score: state.score + 1,
        currentStreak: nextCurrentStreak,
        longestStreak: Math.max(state.longestStreak, nextCurrentStreak),
        totalRounds: nextTotalRounds,
        lastResult: {
          kind: "correct",
          submittedValue: state.equation.product,
          correctValue: state.equation.product,
          submittedTiles: state.selectedTiles,
          rewardTileIds: action.rewardTiles.map((tile) => tile.id),
        },
        ...(state.rowResults && { rowResults: [...state.rowResults, "correct"] }),
      };
    }

    case "SUBMIT_INCORRECT": {
      if (state.phase !== "answering" || state.equation === null) return state;
      if (state.selectedTiles.length !== getAnswerLength(state.equation)) return state;
      if (answerMatches(state.selectedTiles, state.equation.product)) return state;
      const submittedValue = constructAnswer(state.selectedTiles);
      if (submittedValue === null) return state;

      return {
        ...state,
        phase: "feedback",
        selectedTiles: [],
        currentStreak: 0,
        totalRounds: state.totalRounds + 1,
        lastResult: {
          kind: "incorrect",
          submittedValue,
          correctValue: state.equation.product,
          submittedTiles: state.selectedTiles,
          rewardTileIds: [],
        },
        ...(state.rowResults && { rowResults: [...state.rowResults, "incorrect"] }),
      };
    }

    case "TOGGLE_DISCARD": {
      if (state.phase !== "overflow") return state;
      const tile = state.inventory.find((item) => item.id === action.tileId);
      if (!tile) return state;
      const alreadyMarked = state.pendingDiscards.includes(action.tileId);
      const required = getOverflowCount(state);
      if (!alreadyMarked && state.pendingDiscards.length >= required) {
        return state;
      }
      const pendingDiscards = alreadyMarked
        ? state.pendingDiscards.filter((id) => id !== action.tileId)
        : [...state.pendingDiscards, action.tileId];
      if (pendingDiscards.length < required) return { ...state, pendingDiscards };

      // The mark that reaches the required count completes the discard (§1.7).
      // Surviving rail tiles take the freed sockets in order; nothing else moves.
      // Exactly `required` tiles go and exactly `required` sit on the rail, so
      // every freed seat has a survivor to fill it.
      const discardIds = new Set(pendingDiscards);
      const seatCount = state.inventory.length - required;
      const railSurvivors = state.inventory
        .slice(seatCount)
        .filter((tile) => !discardIds.has(tile.id));
      const nextInventory = state.inventory
        .slice(0, seatCount)
        .map((tile) => (discardIds.has(tile.id) ? railSurvivors.shift()! : tile));
      return {
        ...state,
        phase: "feedback",
        inventory: nextInventory,
        pendingDiscards: [],
        lastResult: state.lastResult && { ...state.lastResult, discarded: true },
      };
    }

    case "NEXT_ROUND": {
      if (state.phase !== "feedback") return state;
      // The one re-sort per round (§1.8).
      const nextInventory = sortTiles(
        state.inventory.map((tile) => (tile.isNew ? { ...tile, isNew: false } : tile)),
      );
      // A complete run (Classic at the floor, Puzzle past its last row) is over
      // before the loss check, so a hand that could still answer does not play
      // on; isClassicWin tells Classic's win from an empty-hand loss (§1.8).
      const canPlay = !isRunComplete(state) && canAttemptEquation(nextInventory, action.equation);
      return {
        ...state,
        phase: canPlay ? "answering" : "gameOver",
        equation: action.equation,
        inventory: nextInventory,
        selectedTiles: [],
        pendingDiscards: [],
        lastResult: null,
        round: state.round + 1,
      };
    }

    case "RESTART_RUN":
      if (state.phase !== "gameOver") return state;
      if (state.mode === "puzzle" && !action.table) return state;
      return freshRunState(state.mode, action.equation, action.inventory, action.table);

    case "CLEAR_SELECTION": {
      if (state.phase !== "answering") return state;
      if (state.selectedTiles.length === 0) return state;
      return {
        ...state,
        inventory: sortTiles([...state.inventory, ...state.selectedTiles]),
        selectedTiles: [],
      };
    }

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}
