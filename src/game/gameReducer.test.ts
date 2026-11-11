import { describe, expect, it } from "vitest";
import type { GameAction, GameState, PuzzleTable, Tile } from "./types";
import { gameReducer } from "./gameReducer";
import { PUZZLE_CAPACITY } from "./balance";
import { createPuzzleStart, createTiles, createTitleState, sortTiles } from "./factories";
import {
  answerMatches,
  getAnswerLength,
  getOverflowCount,
  isParMade,
} from "./selectors";
import {
  PUZZLE_SAMPLE,
  PUZZLE_SAMPLE_PAR_LINE,
  makeAnsweringState,
  makeFeedbackState,
  makeGameOverState,
  makeOverflowState,
  makePuzzleRow,
  makeTile,
  parLineAt,
  play,
  playRow,
  puzzleStart,
  selectDigits,
  sequentialIds,
  tileWith,
} from "../test/fixtures";

const digitsOf = (tiles: readonly Tile[]) => tiles.map((tile) => tile.digit);

describe("START_RUN", () => {
  it("starts a fresh run on row 1 of the action's table, whatever state it replaces", () => {
    const priorState = makeGameOverState();
    const action = createPuzzleStart(PUZZLE_SAMPLE, sequentialIds("start"));

    const next = gameReducer(priorState, action);

    expect(next).toEqual({
      phase: "answering",
      table: PUZZLE_SAMPLE,
      equation: PUZZLE_SAMPLE.rows[0]!.equation,
      inventory: action.inventory,
      selectedTiles: [],
      pendingDiscards: [],
      score: 0,
      round: 1,
      totalRounds: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastResult: null,
      rowResults: [],
    });
  });
});

describe("SELECT_TILE", () => {
  it("moves an exact tile into the next ordered answer slot", () => {
    const state = makeAnsweringState();
    const tile = tileWith(state, 5);
    const next = gameReducer(state, { type: "SELECT_TILE", tileId: tile.id });
    expect(next.selectedTiles).toEqual([tile]);
    expect(next.inventory).not.toContainEqual(tile);
  });

  it("treats duplicate-digit tiles as distinct entities addressed by exact ID", () => {
    // Row 8 opens on 1 2 7 8 8 and asks for 12, two slots.
    const state = parLineAt(8);
    const [tileA, tileB] = state.inventory.filter((tile) => tile.digit === 8);

    const afterFirst = gameReducer(state, { type: "SELECT_TILE", tileId: tileA!.id });
    const afterSecond = gameReducer(afterFirst, { type: "SELECT_TILE", tileId: tileB!.id });

    expect(afterSecond.selectedTiles[0]).toBe(tileA);
    expect(afterSecond.selectedTiles[1]).toBe(tileB);
    expect(digitsOf(afterSecond.inventory)).toEqual([1, 2, 7]);
    // the original inventory array must be untouched
    expect(state.inventory).toHaveLength(5);
  });

  it("is a no-op when the answer slots are already full", () => {
    const state = selectDigits(makeAnsweringState(), 1, 5); // 15 fills both slots

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: tileWith(state, 4).id });

    expect(next).toBe(state);
  });

  it("is a no-op when the tile ID is not present in inventory", () => {
    const state = makeAnsweringState();

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the answering phase", () => {
    const state = makeFeedbackState();
    const tile = state.inventory[0]!;

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: tile.id });

    expect(next).toBe(state);
  });
});

describe("RETURN_TILE", () => {
  it("removes the exact selected tile and re-sorts it into inventory", () => {
    const answering = makeAnsweringState();
    const five = tileWith(answering, 5);
    const state = gameReducer(answering, { type: "SELECT_TILE", tileId: five.id });

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: five.id });

    expect(next.selectedTiles).toEqual([]);
    // 5 sorts back between 4 and 7, not onto the end.
    expect(digitsOf(next.inventory)).toEqual([1, 4, 5, 7, 9]);
    // the canonical tile object moves as-is; no clone or added flags
    expect(next.inventory).toContain(five);
    // the state it came from must be untouched
    expect(state.inventory).toHaveLength(4);
    expect(state.selectedTiles).toEqual([five]);
  });

  it("is a no-op when the tile ID is not present in selectedTiles", () => {
    const state = selectDigits(makeAnsweringState(), 4);

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the answering phase", () => {
    // Feedback holds no selection, so one is set: the phase guard has to be
    // what rejects the return.
    const selectedTile = makeTile(4, "tile-selected");
    const state = makeFeedbackState({ selectedTiles: [selectedTile] });

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: selectedTile.id });

    expect(next).toBe(state);
  });
});

describe("SUBMIT_CORRECT", () => {
  it("sorts only the tiles that fit and leaves the newest arrival past capacity, in arrival order", () => {
    // Row 4, 1 x 7: the 7 is spent from 1 2 6 7 8 and the row pays 4 4.
    const ids = sequentialIds();
    const state = selectDigits(parLineAt(4, ids), 7);
    const [early, late] = createTiles([4, 4], ids);

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: [early!, late!] });

    expect(next.phase).toBe("overflow");
    expect(next.inventory.slice(0, 5)).toEqual(sortTiles(next.inventory.slice(0, 5)));
    // Sorted whole, the 8 would perch; the second 4 perches because it arrived last.
    expect(next.inventory[5]).toEqual({ ...late, isNew: true });
  });

  it("consumes tiles in append order, updates score/streak/totalRounds exactly once, inserts N+1 sorted new reward tiles, and enters feedback within capacity", () => {
    // Row 2, 7 x 2 = 14, from 1 4 9 after the sacrifice. The par line never
    // holds a longer streak behind a shorter one, so one is set, to show a
    // correct answer keeps it.
    const ids = sequentialIds();
    const rowTwo = parLineAt(2, ids);
    const one = tileWith(rowTwo, 1);
    const four = tileWith(rowTwo, 4);
    const nine = tileWith(rowTwo, 9);
    const state = selectDigits({ ...rowTwo, currentStreak: 1, longestStreak: 3 }, 1, 4);
    // Every pay tile arrives from the caller with isNew: false — per
    // product.md §1.5 step 8, the reducer must mark every inserted reward as
    // new regardless of what the action payload says.
    const rewardTiles = createTiles([8, 1, 6], ids);

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next.selectedTiles).toEqual([]);
    expect(next.score).toBe(1);
    expect(next.currentStreak).toBe(2);
    expect(next.longestStreak).toBe(3);
    expect(next.totalRounds).toBe(2);
    expect(next.round).toBe(next.totalRounds);
    expect(next.phase).toBe("feedback");
    expect(next.inventory).toEqual(
      sortTiles([nine, ...rewardTiles.map((tile) => ({ ...tile, isNew: true }))]),
    );
    expect(next.lastResult).toEqual({
      kind: "correct",
      submittedValue: 14,
      correctValue: 14,
      submittedTiles: [one, four],
      rewardTileIds: rewardTiles.map((tile) => tile.id),
    });
    // the state it came from must be untouched
    expect(state.selectedTiles).toEqual([one, four]);
    expect(state.inventory).toEqual([nine]);
    // the reducer must not mutate the action's reward tile objects in place
    expect(rewardTiles.every((tile) => tile.isNew === false)).toBe(true);
  });

  it("raises longest streak when current streak exceeds the previous longest streak", () => {
    // Row 3, 3 x 3 = 9, one answer since the sacrifice.
    const ids = sequentialIds();
    const state = selectDigits(parLineAt(3, ids), 9);
    expect(state.longestStreak).toBe(1);

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: createTiles([2, 7], ids) });

    expect(next.currentStreak).toBe(2);
    expect(next.longestStreak).toBe(2);
    expect(next.round).toBe(next.totalRounds);
  });

  it("enters overflow when the post-reward inventory exceeds capacity", () => {
    const ids = sequentialIds();
    const state = selectDigits(parLineAt(4, ids), 7);

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: createTiles([4, 4], ids) });

    expect(next.phase).toBe("overflow");
    expect(next.inventory).toHaveLength(6);
    expect(next.round).toBe(next.totalRounds);
  });

  it("is a no-op on a repeat dispatch once the round has left the answering phase", () => {
    const ids = sequentialIds();
    const state = selectDigits(parLineAt(3, ids), 9);
    const rewardTiles = createTiles([2, 7], ids);

    const first = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });
    const second = gameReducer(first, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(second).toBe(first);
  });

  it("is a no-op outside the answering phase", () => {
    const state = makeFeedbackState();
    const rewardTiles = [makeTile(9, "reward-0", true), makeTile(5, "reward-1", true), makeTile(5, "reward-2", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the answer slots are not fully filled", () => {
    const state = selectDigits(makeAnsweringState(), 1); // 15 needs two slots
    const rewardTiles = [makeTile(9, "reward-0", true), makeTile(5, "reward-1", true), makeTile(5, "reward-2", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the constructed answer does not actually match the product, regardless of the declared action", () => {
    const state = selectDigits(makeAnsweringState(), 5, 7); // 57, not 15
    const rewardTiles = [makeTile(9, "reward-0", true), makeTile(5, "reward-1", true), makeTile(5, "reward-2", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the reward tile count does not equal selectedTiles.length + 1", () => {
    const state = selectDigits(parLineAt(3), 9);
    const rewardTiles = [makeTile(2, "reward-0", true)]; // row 3 pays two

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when a reward tile ID collides with a live inventory tile ID", () => {
    const state = selectDigits(parLineAt(3), 9);
    const rewardTiles = [makeTile(2, state.inventory[0]!.id, true), makeTile(7, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });
});

describe("SUBMIT_INCORRECT", () => {
  it("consumes tiles, resets current streak while preserving longest streak, increments totalRounds, generates no rewards, and captures the incorrect result", () => {
    // Row 3, 3 x 3 = 9, answered 1 on a streak of one.
    const rowThree = parLineAt(3);
    const one = tileWith(rowThree, 1);
    const state = selectDigits(rowThree, 1);

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.selectedTiles).toEqual([]);
    expect(next.inventory).toBe(state.inventory);
    expect(digitsOf(next.inventory)).toEqual([6, 8, 9]);
    expect(next.score).toBe(1);
    expect(next.currentStreak).toBe(0);
    expect(next.longestStreak).toBe(1);
    expect(next.totalRounds).toBe(3);
    expect(next.round).toBe(next.totalRounds);
    expect(next.phase).toBe("feedback");
    expect(next.lastResult).toMatchObject({
      kind: "incorrect",
      submittedValue: 1,
      correctValue: 9,
      submittedTiles: [one],
      rewardTileIds: [],
    });
    expect(next.rowResults).toEqual(["incorrect", "correct", "incorrect"]);
    // the state it came from must be untouched
    expect(state.selectedTiles).toEqual([one]);
  });

  it("preserves append order (not sorted order) through the submission path", () => {
    const state = selectDigits(makeAnsweringState(), 5, 1); // 51; sorted, it would be 15 and correct

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.lastResult).toMatchObject({ submittedValue: 51, correctValue: 15 });
  });

  it("collapses a leading zero in the constructed value, so it never accidentally matches a two-digit product", () => {
    // The par line discards both of its zeros. Keeping row 6's instead, and
    // row 7's 7, reaches row 8, 3 x 4 = 12, holding 0 1 2 8 8.
    const ids = sequentialIds();
    const rowEight = play(
      parLineAt(6, ids),
      [{ spend: [2, 4], discard: 7 }, { spend: [6], discard: 7 }],
      ids,
    );
    expect(digitsOf(rowEight.inventory)).toEqual([0, 1, 2, 8, 8]);
    const state = selectDigits(rowEight, 0, 2); // constructs 2, not "02"

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.lastResult).toMatchObject({ submittedValue: 2, correctValue: 12 });
  });

  it("is accepted even when inventory lacks the tiles needed to construct the correct answer", () => {
    // The sacrifice: 5 and 7 spent on 15 leave 1 4 9, with no 5 for the answer.
    const state = selectDigits(makeAnsweringState(), 5, 7);

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.phase).toBe("feedback");
    expect(digitsOf(next.inventory)).toEqual([1, 4, 9]);
  });

  it("is a no-op outside the answering phase", () => {
    const state = makeFeedbackState();

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });

  it("is a no-op when the answer slots are not fully filled", () => {
    const state = selectDigits(makeAnsweringState(), 1); // 15 needs two slots

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });

  it("is a no-op when the constructed answer actually matches the product, regardless of the declared action", () => {
    const state = selectDigits(makeAnsweringState(), 1, 5);

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });
});

describe("TOGGLE_DISCARD", () => {
  // No deal reaches an excess of two: a hand of five spends at least one tile
  // and is paid one more. The reducer takes any excess, so a seventh tile is
  // added to row 4's overflow to show a first mark that is only a mark.
  const excessTwo = () => {
    const state = makeOverflowState();
    return { ...state, inventory: [...state.inventory, makeTile(9, "extra", true)] };
  };

  it("marks an exact inventory tile ID on first toggle and clears it on second toggle, below the required count", () => {
    const state = excessTwo();
    const tile = tileWith(state, 1);

    const marked = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tile.id });
    expect(marked.pendingDiscards).toEqual([tile.id]);
    expect(marked.phase).toBe("overflow");
    expect(marked.inventory).toBe(state.inventory);

    const unmarked = gameReducer(marked, { type: "TOGGLE_DISCARD", tileId: tile.id });
    expect(unmarked.pendingDiscards).toEqual([]);
  });

  it("completes the discard on the mark that reaches the required count of one", () => {
    const state = makeOverflowState(); // excess 1
    const target = state.inventory[3]!;

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: target.id });

    expect(next.phase).toBe("feedback");
    expect(next.pendingDiscards).toEqual([]);
    expect(next.inventory).toHaveLength(5);
    expect(next.inventory.map((tile) => tile.id)).not.toContain(target.id);
    expect(next.lastResult?.discarded).toBe(true);
  });

  it("completes the discard on the second of two marks, removing both duplicate-digit tiles by exact ID", () => {
    const state = excessTwo();
    // Row 4's pay is 4 4: one seated, one on the rail.
    const [tileA, tileB] = state.inventory.filter((tile) => tile.digit === 4);

    const afterA = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tileA!.id });
    const afterBoth = gameReducer(afterA, { type: "TOGGLE_DISCARD", tileId: tileB!.id });

    expect(afterBoth.phase).toBe("feedback");
    expect(afterBoth.inventory.map((tile) => tile.id)).not.toContain(tileA!.id);
    expect(afterBoth.inventory.map((tile) => tile.id)).not.toContain(tileB!.id);
    expect(afterBoth.inventory).toHaveLength(5);
  });

  it("seats a surviving rail tile in the socket the discard freed, and moves no other tile", () => {
    const state = makeOverflowState();
    const seated = state.inventory.slice(0, 5);
    const rail = state.inventory[5]!;

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tileWith(state, 6).id });

    const expected = [...seated];
    expected[3] = rail;
    expect(next.inventory).toEqual(expected);
  });

  it("discarding the rail tile itself leaves the seated tiles untouched", () => {
    const state = makeOverflowState();
    const seated = state.inventory.slice(0, 5);

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: state.inventory[5]!.id });

    expect(next.inventory).toEqual(seated);
  });

  it("is a no-op for a tile ID not present in inventory", () => {
    const state = makeOverflowState();

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the overflow phase", () => {
    const state = makeFeedbackState();
    const tile = state.inventory[0]!;

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tile.id });

    expect(next).toBe(state);
  });
});

describe("NEXT_ROUND", () => {
  it("clears new markers, prior result, selection, and pending discards; increments round while totalRounds is unchanged; enters answering when enough tiles remain", () => {
    // Row 2 answered: 9 held from the deal, 8 1 6 new from the pay.
    const ids = sequentialIds();
    const state = playRow(parLineAt(2, ids), PUZZLE_SAMPLE_PAR_LINE[1]!, ids);
    const oldTile = tileWith(state, 9);
    const nextEquation = PUZZLE_SAMPLE.rows[2]!.equation; // 3 x 3 = 9, one slot

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next.phase).toBe("answering");
    expect(next.equation).toBe(nextEquation);
    expect(digitsOf(next.inventory)).toEqual([1, 6, 8, 9]);
    expect(next.inventory.every((tile) => tile.isNew === false)).toBe(true);
    expect(next.inventory[3]).toBe(oldTile); // tiles that were never new keep object identity
    expect(next.lastResult).toBeNull();
    expect(next.selectedTiles).toEqual([]);
    expect(next.pendingDiscards).toEqual([]);
    expect(next.round).toBe(3);
    expect(next.totalRounds).toBe(2);
    // the state it came from must be untouched
    expect(tileWith(state, 8).isNew).toBe(true);
  });

  it("enters answering when exactly one tile remains and the next product is one digit", () => {
    // 41 for 14 spends two of 1 4 9, and row 3 is 3 x 3 = 9.
    const ids = sequentialIds();
    const state = playRow(parLineAt(2, ids), { spend: [4, 1] }, ids);
    expect(state.inventory).toHaveLength(1);

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next.phase).toBe("answering");
  });

  it("enters game over when exactly one tile remains and the next product is two digits, retaining the terminal equation", () => {
    // The sample never leaves one tile before a two-digit row, so a two-row
    // table does: 1 for 9 leaves the 5, and row 2 is 7 x 8 = 56.
    const table: PuzzleTable = {
      hand: [1, 5],
      rows: [makePuzzleRow(3, 3, [2, 7]), makePuzzleRow(7, 8, [5, 6, 1])],
      par: 1,
    };
    const ids = sequentialIds();
    const state = playRow(puzzleStart(table, ids), { spend: [1] }, ids);
    expect(state.inventory).toHaveLength(1);
    const terminalEquation = table.rows[1]!.equation;

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next.phase).toBe("gameOver");
    expect(next.equation).toBe(terminalEquation);
    expect(next.round).toBe(next.totalRounds + 1);
  });

  it("enters answering even when the surviving tiles cannot actually construct the next answer", () => {
    // exact-answer constructibility is never checked, only tile count: 91 for
    // 14 leaves the 4, and row 3 asks for 9.
    const ids = sequentialIds();
    const state = playRow(parLineAt(2, ids), { spend: [9, 1] }, ids);
    expect(digitsOf(state.inventory)).toEqual([4]);

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next.phase).toBe("answering");
  });

  it("re-sorts the whole rack once, and clears the discarded marker with the result", () => {
    // Row 5's discard of 8 seats the rail's 2 at the end of the rack.
    const ids = sequentialIds();
    const state = playRow(parLineAt(5, ids), PUZZLE_SAMPLE_PAR_LINE[4]!, ids);
    expect(state.lastResult?.discarded).toBe(true);
    expect(digitsOf(state.inventory)).toEqual([1, 2, 4, 6, 2]);

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(digitsOf(next.inventory)).toEqual([1, 2, 2, 4, 6]);
    expect(next.lastResult).toBeNull();
  });

  it("is a no-op outside the feedback phase (overflow)", () => {
    const state = makeOverflowState();

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the feedback phase (answering)", () => {
    const state = makeAnsweringState();

    const next = gameReducer(state, { type: "NEXT_ROUND" });

    expect(next).toBe(state);
  });

  it("takes the next row's equation from the table on NEXT_ROUND", () => {
    // Row 1's sacrifice judged; row 2 is 7 x 2 = 14.
    const next = gameReducer(makeFeedbackState(), { type: "NEXT_ROUND" });

    expect(next.phase).toBe("answering");
    expect(next.equation).toBe(PUZZLE_SAMPLE.rows[1]!.equation);
    expect(next.round).toBe(2);
  });

  it("refuses NEXT_ROUND when no table is loaded", () => {
    const state = makeFeedbackState({ table: null });

    expect(gameReducer(state, { type: "NEXT_ROUND" })).toBe(state);
  });

  it("ends after the last row without reading past the table", () => {
    // Reading any row past the last throws, so the advance off row 8 has to
    // end the run on the table's length: the hand of five could answer a
    // ninth row, and a read would find none.
    const rows = new Proxy(PUZZLE_SAMPLE.rows, {
      get(target, key, receiver) {
        if (typeof key === "string" && Number(key) >= target.length) {
          throw new RangeError(`row ${key} read past the table`);
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const table: PuzzleTable = { ...PUZZLE_SAMPLE, rows };
    const ids = sequentialIds();
    const rowSeven = play(puzzleStart(table, ids), PUZZLE_SAMPLE_PAR_LINE.slice(0, 7), ids);
    const lastRow = playRow(rowSeven, PUZZLE_SAMPLE_PAR_LINE[7]!, ids);

    const end = gameReducer(lastRow, { type: "NEXT_ROUND" });

    expect(end.phase).toBe("gameOver");
    expect(end.equation).toBe(PUZZLE_SAMPLE.rows[7]!.equation);
    expect(end.inventory).toHaveLength(PUZZLE_CAPACITY);
    expect(end.round).toBe(9);
    expect(end.totalRounds).toBe(8);
  });
});

describe("RESTART_RUN", () => {
  it("starts a fresh run at round 1 with reset statistics and the action-provided inventory", () => {
    const priorState = makeGameOverState();
    const equation = PUZZLE_SAMPLE.rows[0]!.equation;
    const inventory = sortTiles(createTiles(PUZZLE_SAMPLE.hand, sequentialIds("restart")));

    const next = gameReducer(priorState, { type: "RESTART_RUN", table: PUZZLE_SAMPLE, inventory });

    expect(next).toEqual({
      phase: "answering",
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
      table: PUZZLE_SAMPLE,
      rowResults: [],
    });
  });

  it("is a no-op outside the game over phase", () => {
    const state = makeFeedbackState();
    const inventory = sortTiles(createTiles(PUZZLE_SAMPLE.hand, sequentialIds("restart")));

    const next = gameReducer(state, { type: "RESTART_RUN", table: PUZZLE_SAMPLE, inventory });

    expect(next).toBe(state);
  });
});

// Test-only helper validating every §2.5 reducer invariant against a state.
// Not exported: it exists only to drive the lifecycle walk below.
function assertInvariants(state: GameState): void {
  const {
    phase,
    table,
    equation,
    inventory,
    selectedTiles,
    pendingDiscards,
    score,
    round,
    totalRounds,
    currentStreak,
    longestStreak,
    lastResult,
  } = state;

  // table === null and equation === null only in title.
  if (phase === "title") {
    expect(table).toBeNull();
    expect(equation).toBeNull();
  } else {
    expect(table).not.toBeNull();
    expect(equation).not.toBeNull();
  }

  // Live tile IDs are unique across inventory and selectedTiles, and no
  // live ID is shared between the two collections.
  const liveIds = [...inventory.map((tile) => tile.id), ...selectedTiles.map((tile) => tile.id)];
  expect(new Set(liveIds).size).toBe(liveIds.length);

  // lastResult.submittedTiles is a historical snapshot of consumed tiles: its
  // IDs must never still be live. (lastResult.rewardTileIds intentionally
  // references live reward tiles and is deliberately not asserted against
  // liveIds here — neither collection represents additional ownership.)
  if (lastResult !== null) {
    const liveIdSet = new Set(liveIds);
    for (const tile of lastResult.submittedTiles) {
      expect(liveIdSet.has(tile.id)).toBe(false);
    }
  }

  // selectedTiles.length <= getAnswerLength(equation).
  if (equation !== null) {
    expect(selectedTiles.length).toBeLessThanOrEqual(getAnswerLength(equation));
  }

  // pendingDiscards contains unique IDs that exist in inventory.
  expect(new Set(pendingDiscards).size).toBe(pendingDiscards.length);
  const inventoryIds = new Set(inventory.map((tile) => tile.id));
  for (const id of pendingDiscards) {
    expect(inventoryIds.has(id)).toBe(true);
  }

  // pendingDiscards is non-empty only in overflow.
  if (phase !== "overflow") {
    expect(pendingDiscards).toEqual([]);
  }

  // inventory.length <= PUZZLE_CAPACITY when phase is answering, feedback,
  // or gameOver.
  if (phase === "answering" || phase === "feedback" || phase === "gameOver") {
    expect(inventory.length).toBeLessThanOrEqual(PUZZLE_CAPACITY);
  }

  // inventory.length > PUZZLE_CAPACITY when phase is overflow.
  if (phase === "overflow") {
    expect(inventory.length).toBeGreaterThan(PUZZLE_CAPACITY);
  }

  // lastResult === null in title and answering.
  if (phase === "title" || phase === "answering") {
    expect(lastResult).toBeNull();
  }

  // lastResult !== null in feedback and overflow.
  if (phase === "feedback" || phase === "overflow") {
    expect(lastResult).not.toBeNull();
  }

  // score <= totalRounds.
  expect(score).toBeLessThanOrEqual(totalRounds);

  // currentStreak <= longestStreak <= score.
  expect(currentStreak).toBeLessThanOrEqual(longestStreak);
  expect(longestStreak).toBeLessThanOrEqual(score);

  // In answering and gameOver, round === totalRounds + 1.
  if (phase === "answering" || phase === "gameOver") {
    expect(round).toBe(totalRounds + 1);
  }

  // In feedback and overflow, round === totalRounds.
  if (phase === "feedback" || phase === "overflow") {
    expect(round).toBe(totalRounds);
  }
}

describe("CLEAR_SELECTION", () => {
  it("returns every selected tile to a sorted inventory", () => {
    const state = selectDigits(makeAnsweringState(), 5, 1);

    const next = gameReducer(state, { type: "CLEAR_SELECTION" });

    expect(next.selectedTiles).toEqual([]);
    expect(digitsOf(next.inventory)).toEqual([1, 4, 5, 7, 9]);
  });

  it("is a no-op when nothing is selected", () => {
    const state = makeAnsweringState();
    expect(gameReducer(state, { type: "CLEAR_SELECTION" })).toBe(state);
  });

  it("is a no-op outside answering", () => {
    // A selection, so the empty-selection guard cannot be what rejects it.
    const state = makeFeedbackState({ selectedTiles: [makeTile(4, "tile-selected")] });
    expect(gameReducer(state, { type: "CLEAR_SELECTION" })).toBe(state);
  });
});

describe("reducer lifecycle invariants (§2.5)", () => {
  it("walks the sample's par line and a restart, asserting every §2.5 invariant after each transition", () => {
    interface Step {
      label: string;
      getAction: (state: GameState) => GameAction;
      expectedPhase: GameState["phase"];
    }

    const table = PUZZLE_SAMPLE;
    const ids = sequentialIds();
    const steps: Step[] = [
      {
        label: "start the run",
        getAction: () => createPuzzleStart(table, ids),
        expectedPhase: "answering",
      },
    ];

    // Every action App dispatches on the par line, in order: the sacrifice,
    // seven answers, five discards, and the advance off the last row.
    for (const [index, move] of PUZZLE_SAMPLE_PAR_LINE.entries()) {
      const row = table.rows[index]!;
      const label = `row ${index + 1}`;
      for (const digit of move.spend) {
        steps.push({
          label: `${label}: select ${digit}`,
          getAction: (s) => ({ type: "SELECT_TILE", tileId: tileWith(s, digit).id }),
          expectedPhase: "answering",
        });
      }
      steps.push({
        label: `${label}: submit`,
        getAction: (s) =>
          answerMatches(s.selectedTiles, row.equation.product)
            ? { type: "SUBMIT_CORRECT", rewardTiles: createTiles(row.pay, ids) }
            : { type: "SUBMIT_INCORRECT" },
        expectedPhase: move.discard === undefined ? "feedback" : "overflow",
      });
      const { discard } = move;
      if (discard !== undefined) {
        steps.push({
          label: `${label}: discard ${discard}, returning to feedback at capacity`,
          getAction: (s) => ({ type: "TOGGLE_DISCARD", tileId: tileWith(s, discard).id }),
          expectedPhase: "feedback",
        });
      }
      steps.push({
        label: `${label}: advance`,
        getAction: () => ({ type: "NEXT_ROUND" }),
        expectedPhase: index === table.rows.length - 1 ? "gameOver" : "answering",
      });
    }

    steps.push({
      label: "restart the run",
      getAction: () => ({ ...createPuzzleStart(table, sequentialIds("restart")), type: "RESTART_RUN" }),
      expectedPhase: "answering",
    });

    let state: GameState = createTitleState();
    assertInvariants(state);

    for (const step of steps) {
      const next = gameReducer(state, step.getAction(state));
      expect(next.phase, step.label).toBe(step.expectedPhase);
      assertInvariants(next);
      state = next;
    }

    expect(state.round).toBe(1);
    expect(state.totalRounds).toBe(0);
  });
});

describe("Puzzle", () => {
  it("starts with the table, its hand and row 1", () => {
    const state = puzzleStart();
    expect(state.phase).toBe("answering");
    expect(state.table).toBe(PUZZLE_SAMPLE);
    expect(digitsOf(state.inventory)).toEqual([1, 4, 5, 7, 9]);
    expect(state.rowResults).toEqual([]);
  });

  it("records each row's result in order", () => {
    const ids = sequentialIds();
    const state = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), ids);
    expect(state.rowResults).toEqual(["incorrect", "correct", "correct"]);
  });

  it("accepts the row's pay and refuses other digits, or another order", () => {
    const ids = sequentialIds();
    let state = puzzleStart(PUZZLE_SAMPLE, ids);
    // Row 1 is 3 × 5: answer 15 and offer row 1's pay, 9 5 5.
    state = gameReducer(state, { type: "SELECT_TILE", tileId: tileWith(state, 1).id });
    state = gameReducer(state, { type: "SELECT_TILE", tileId: tileWith(state, 5).id });
    for (const wrong of [
      createTiles([9, 5, 6], ids),
      createTiles([5, 9, 5], ids),
    ]) {
      expect(gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: wrong })).toBe(state);
    }
    const paid = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: createTiles([9, 5, 5], ids) });
    expect(paid.score).toBe(1);
  });

  it("overflows at five tiles", () => {
    const ids = sequentialIds();
    const state = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), ids);
    // Hand 1 2 6 7 8; row 4 (1 × 7) spends 7 and pays 4 4: six tiles in five sockets.
    let next = gameReducer(state, { type: "SELECT_TILE", tileId: tileWith(state, 7).id });
    next = gameReducer(next, { type: "SUBMIT_CORRECT", rewardTiles: createTiles([4, 4], ids) });
    expect(next.phase).toBe("overflow");
    expect(getOverflowCount(next)).toBe(1);
  });

  it("replays the sample's par line to 7 and ends after row 8", () => {
    const ids = sequentialIds();
    const end = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE, ids);
    expect(end.phase).toBe("gameOver");
    expect(end.score).toBe(7);
    expect(end.totalRounds).toBe(8);
    expect(digitsOf(end.inventory)).toEqual([2, 2, 7, 8, 8]);
    expect(isParMade(end)).toBe(true);
  });

  // The suite's shared states (src/test/fixtures.ts) are the par line played
  // through this reducer; this pins where each one stands.
  it("stands each par-line fixture where its name says", () => {
    const answering = makeAnsweringState();
    expect(answering.phase).toBe("answering");
    expect(answering.equation).toBe(PUZZLE_SAMPLE.rows[0]!.equation);
    expect(digitsOf(answering.inventory)).toEqual([1, 4, 5, 7, 9]);

    const feedback = makeFeedbackState();
    expect(feedback.phase).toBe("feedback");
    expect(feedback.lastResult).toMatchObject({ kind: "incorrect", submittedValue: 57, correctValue: 15 });
    expect(digitsOf(feedback.inventory)).toEqual([1, 4, 9]);

    const overflow = makeOverflowState();
    expect(overflow.phase).toBe("overflow");
    expect(digitsOf(overflow.inventory)).toEqual([1, 2, 4, 6, 8, 4]);
    expect(overflow.inventory[5]!.isNew).toBe(true);

    const gameOver = makeGameOverState();
    expect(gameOver.phase).toBe("gameOver");
    expect(gameOver.score).toBe(7);
    expect(gameOver.longestStreak).toBe(7);
  });

  it("restarts with the new table", () => {
    const ids = sequentialIds();
    const end = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE, ids);
    const other: PuzzleTable = { ...PUZZLE_SAMPLE, hand: [0, 2, 3, 6, 8], par: 5 };
    const next = gameReducer(end, { type: "RESTART_RUN", table: other, inventory: createTiles(other.hand, ids) });
    expect(next.table).toBe(other);
    expect(next.score).toBe(0);
  });
});

describe("RETURN_TO_TITLE", () => {
  it.each([
    ["answering", makeAnsweringState()],
    ["feedback", makeFeedbackState()],
    ["overflow", makeOverflowState()],
    ["gameOver", makeGameOverState()],
  ])("returns to the title from %s", (_phase, state) => {
    expect(gameReducer(state, { type: "RETURN_TO_TITLE" })).toEqual(createTitleState());
  });

  it("is refused in the title", () => {
    const title = createTitleState();
    expect(gameReducer(title, { type: "RETURN_TO_TITLE" })).toBe(title);
  });
});
