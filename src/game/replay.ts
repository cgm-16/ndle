import { createPuzzleStart, createTiles, createTitleState } from "./factories";
import { gameReducer } from "./gameReducer";
import { answerMatches } from "./selectors";
import type {
  Digit,
  GameAction,
  GameState,
  PuzzleMove,
  PuzzleTable,
  TileIdFactory,
} from "./types";

export interface Replay {
  state: GameState;
  actions: GameAction[];
}

// The reducer returns the same object for an action it refuses, so a refusal
// shows as an unchanged state. A refusal in a saved record means a bad record.
function dispatch(replay: Replay, action: GameAction): boolean {
  const next = gameReducer(replay.state, action);
  if (next === replay.state) return false;
  replay.state = next;
  replay.actions.push(action);
  return true;
}

// Acts on the first tile in the hand with this digit.
function dispatchOnDigit(
  replay: Replay,
  type: "SELECT_TILE" | "TOGGLE_DISCARD",
  digit: Digit,
): boolean {
  const tile = replay.state.inventory.find((item) => item.digit === digit);
  return tile !== undefined && dispatch(replay, { type, tileId: tile.id });
}

// The submit for the current selection, which App and the replay both play: a
// correct answer is paid the tiles printed on its row. Null with no current row.
export function createSubmit(state: GameState, nextTileId: TileIdFactory): GameAction | null {
  const row = state.table?.rows[state.round - 1];
  if (row === undefined) return null;
  return answerMatches(state.selectedTiles, row.equation.product)
    ? { type: "SUBMIT_CORRECT", rewardTiles: createTiles(row.pay, nextTileId) }
    : { type: "SUBMIT_INCORRECT" };
}

// One move as App plays it: select, submit with the current row's pay, then
// discard when asked. It stops before the advance. False means the hand or the
// reducer refused a step.
export function applyMove(replay: Replay, move: PuzzleMove, nextTileId: TileIdFactory): boolean {
  if (!move.spend.every((digit) => dispatchOnDigit(replay, "SELECT_TILE", digit))) return false;
  const submit = createSubmit(replay.state, nextTileId);
  // A discard outside overflow is refused by the reducer.
  return (
    submit !== null &&
    dispatch(replay, submit) &&
    (move.discard === undefined || dispatchOnDigit(replay, "TOGGLE_DISCARD", move.discard))
  );
}

export function replayMoves(
  table: PuzzleTable,
  moves: readonly PuzzleMove[],
  nextTileId: TileIdFactory,
): Replay | null {
  const replay: Replay = { state: createTitleState(), actions: [] };
  dispatch(replay, createPuzzleStart(table, nextTileId));
  for (const [index, move] of moves.entries()) {
    if (!applyMove(replay, move, nextTileId)) return null;
    if (replay.state.phase === "overflow") {
      // A record may end mid-discard, and only there.
      return index === moves.length - 1 ? replay : null;
    }
    if (!dispatch(replay, { type: "NEXT_ROUND" })) return null;
  }
  return replay;
}
