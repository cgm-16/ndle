import { describe, expect, it } from "vitest";
import type { Digit, GameAction, GameState, PuzzleTable, Tile, TileIdFactory } from "./types";
import { gameReducer } from "./gameReducer";
import { createInitialInventory, createTiles, createTitleState, sortTiles } from "./factories";
import {
  answerMatches,
  getAnswerLength,
  getCapacity,
  getOverflowCount,
  isParMade,
} from "./selectors";
import {
  PUZZLE_SAMPLE,
  PUZZLE_SAMPLE_PAR_LINE,
  type PuzzleMove,
  makeAnsweringState,
  makeEquation,
  makeFeedbackState,
  makeOverflowState,
  makeTile,
  sequentialIds,
} from "../test/fixtures";

describe("START_RUN", () => {
  it("starts a new run in the answering phase at round 1 with the provided inventory and reset statistics", () => {
    const priorState: GameState = {
      ...createTitleState(),
      phase: "gameOver",
      score: 5,
      round: 6,
      totalRounds: 5,
      currentStreak: 2,
      longestStreak: 4,
      lastResult: {
        kind: "incorrect",
        submittedValue: 12,
        correctValue: 15,
        submittedTiles: [],
        rewardTileIds: [],
      },
    };
    const equation = makeEquation(3, 4);
    const inventory = createInitialInventory(sequentialIds());

    const next = gameReducer(priorState, { type: "START_RUN", mode: "endless", equation, inventory });

    expect(next).toEqual({
      phase: "answering",
      mode: "endless",
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
    });
  });
});

describe("SELECT_TILE", () => {
  it("moves an exact tile into the next ordered answer slot", () => {
    const state = makeAnsweringState(makeEquation(7, 8));
    const tile = state.inventory.find((item) => item.digit === 5)!;
    const next = gameReducer(state, { type: "SELECT_TILE", tileId: tile.id });
    expect(next.selectedTiles).toEqual([tile]);
    expect(next.inventory).not.toContainEqual(tile);
  });

  it("treats duplicate-digit tiles as distinct entities addressed by exact ID", () => {
    const tileA = makeTile(5, "tile-a");
    const tileB = makeTile(5, "tile-b");
    const state = makeAnsweringState(makeEquation(9, 9), { inventory: [tileA, tileB] });

    const afterFirst = gameReducer(state, { type: "SELECT_TILE", tileId: tileA.id });
    const afterSecond = gameReducer(afterFirst, { type: "SELECT_TILE", tileId: tileB.id });

    expect(afterSecond.selectedTiles[0]).toBe(tileA);
    expect(afterSecond.selectedTiles[1]).toBe(tileB);
    expect(afterSecond.inventory).toEqual([]);
    // the original inventory array passed via overrides must be untouched
    expect(state.inventory).toHaveLength(2);
  });

  it("is a no-op when the answer slots are already full", () => {
    const selected = [makeTile(9, "tile-selected")];
    const extra = makeTile(2, "tile-extra");
    const state = makeAnsweringState(makeEquation(3, 3), {
      inventory: [extra],
      selectedTiles: selected,
    });

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: extra.id });

    expect(next).toBe(state);
  });

  it("is a no-op when the tile ID is not present in inventory", () => {
    const state = makeAnsweringState(makeEquation(3, 3));

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the answering phase", () => {
    const state = makeFeedbackState(makeEquation(3, 3));
    const tile = state.inventory[0]!;

    const next = gameReducer(state, { type: "SELECT_TILE", tileId: tile.id });

    expect(next).toBe(state);
  });
});

describe("RETURN_TILE", () => {
  it("removes the exact selected tile and re-sorts it into inventory", () => {
    const selectedTile = makeTile(4, "tile-selected");
    const inventory = [makeTile(1, "tile-a"), makeTile(6, "tile-b")];
    const state = makeAnsweringState(makeEquation(3, 3), {
      inventory,
      selectedTiles: [selectedTile],
    });

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: selectedTile.id });

    expect(next.selectedTiles).toEqual([]);
    expect(next.inventory).toEqual(sortTiles([...inventory, selectedTile]));
    // the canonical tile object moves as-is; no clone or added flags
    expect(next.inventory).toContain(selectedTile);
    // the original arrays passed via overrides must be untouched
    expect(inventory).toHaveLength(2);
    expect(state.selectedTiles).toEqual([selectedTile]);
  });

  it("is a no-op when the tile ID is not present in selectedTiles", () => {
    const state = makeAnsweringState(makeEquation(3, 3), {
      selectedTiles: [makeTile(4, "tile-selected")],
    });

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the answering phase", () => {
    const selectedTile = makeTile(4, "tile-selected");
    const state = makeFeedbackState(makeEquation(3, 3), { selectedTiles: [selectedTile] });

    const next = gameReducer(state, { type: "RETURN_TILE", tileId: selectedTile.id });

    expect(next).toBe(state);
  });
});

describe("SUBMIT_CORRECT", () => {
  it("sorts only the tiles that fit and leaves the newest arrival past capacity, in arrival order", () => {
    // Ten seated tiles, one spent on 3 x 3 = 9: nine stay, two come back.
    const seated = Array.from({ length: 10 }, (_, index) => makeTile(index as Digit, `seat-${index}`));
    const nine = seated[9]!;
    const state = makeAnsweringState(makeEquation(3, 3), {
      inventory: seated.slice(0, 9),
      selectedTiles: [nine],
    });
    const early = makeTile(9, "reward-early");
    const late = makeTile(0, "reward-late");

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: [early, late] });

    expect(next.phase).toBe("overflow");
    expect(next.inventory.slice(0, 10)).toEqual(sortTiles(next.inventory.slice(0, 10)));
    // The 0 would sort first; it perches because it arrived last, not by digit.
    expect(next.inventory[10]).toEqual({ ...late, isNew: true });
  });

  it("consumes tiles in append order, updates score/streak/totalRounds exactly once, inserts N+1 sorted new reward tiles, and enters feedback within capacity", () => {
    const equation = makeEquation(7, 8); // product 56
    const tileFive = makeTile(5, "tile-five");
    const tileSix = makeTile(6, "tile-six");
    const other = makeTile(3, "tile-other");
    const state = makeAnsweringState(equation, {
      inventory: [other],
      selectedTiles: [tileFive, tileSix], // selecting 5 then 6 constructs 56
      score: 5,
      currentStreak: 1,
      longestStreak: 3,
      totalRounds: 6,
      round: 7,
    });
    // reward0 arrives from the caller with isNew: false — per product.md
    // §1.5 step 8, the reducer must mark every inserted reward as new
    // regardless of what the action payload says.
    const reward0 = makeTile(1, "reward-0", false);
    const reward1 = makeTile(4, "reward-1", true);
    const reward2 = makeTile(7, "reward-2", true);

    const next = gameReducer(state, {
      type: "SUBMIT_CORRECT",
      rewardTiles: [reward0, reward1, reward2],
    });

    expect(next.selectedTiles).toEqual([]);
    expect(next.score).toBe(6);
    expect(next.currentStreak).toBe(2);
    expect(next.longestStreak).toBe(3);
    expect(next.totalRounds).toBe(7);
    expect(next.round).toBe(next.totalRounds);
    expect(next.phase).toBe("feedback");
    expect(next.inventory).toEqual(
      sortTiles([other, { ...reward0, isNew: true }, reward1, reward2]),
    );
    expect(next.inventory.find((tile) => tile.id === reward0.id)?.isNew).toBe(true);
    expect(next.lastResult).toEqual({
      kind: "correct",
      submittedValue: 56,
      correctValue: 56,
      submittedTiles: [tileFive, tileSix],
      rewardTileIds: [reward0.id, reward1.id, reward2.id],
    });
    // the original arrays passed via overrides must be untouched
    expect(state.selectedTiles).toEqual([tileFive, tileSix]);
    expect(state.inventory).toEqual([other]);
    // the reducer must not mutate the action's reward tile objects in place
    expect(reward0.isNew).toBe(false);
  });

  it("raises longest streak when current streak exceeds the previous longest streak", () => {
    const equation = makeEquation(3, 3); // product 9
    const selected = makeTile(9, "tile-selected");
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [selected],
      score: 4,
      currentStreak: 4,
      longestStreak: 4,
      totalRounds: 5,
      round: 6,
    });
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next.currentStreak).toBe(5);
    expect(next.longestStreak).toBe(5);
    expect(next.round).toBe(next.totalRounds);
  });

  it("enters overflow when the post-reward inventory exceeds capacity", () => {
    const equation = makeEquation(3, 3); // product 9
    const selected = makeTile(9, "tile-selected");
    const inventory = Array.from({ length: 9 }, (_, index) =>
      makeTile((index % 9) as Digit, `tile-${index}`),
    );
    const state = makeAnsweringState(equation, { inventory, selectedTiles: [selected] });
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next.phase).toBe("overflow");
    expect(next.inventory).toHaveLength(11);
    expect(next.round).toBe(next.totalRounds);
  });

  it("is a no-op on a repeat dispatch once the round has left the answering phase", () => {
    const equation = makeEquation(3, 3); // product 9
    const selected = makeTile(9, "tile-selected");
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles: [selected] });
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const first = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });
    const second = gameReducer(first, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(second).toBe(first);
  });

  it("is a no-op outside the answering phase", () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation);
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the answer slots are not fully filled", () => {
    const equation = makeEquation(2, 5); // product 10, two slots
    const state = makeAnsweringState(equation, { selectedTiles: [makeTile(1, "tile-one")] });
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the constructed answer does not actually match the product, regardless of the declared action", () => {
    const equation = makeEquation(3, 3); // product 9
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(5, "tile-five")],
    });
    const rewardTiles = [makeTile(1, "reward-0", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when the reward tile count does not equal selectedTiles.length + 1", () => {
    const equation = makeEquation(3, 3); // product 9
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(9, "tile-selected")],
    });
    const rewardTiles = [makeTile(1, "reward-0", true)]; // should be 2

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });

  it("is a no-op when a reward tile ID collides with a live inventory tile ID", () => {
    const equation = makeEquation(3, 3); // product 9
    const other = makeTile(3, "tile-other");
    const state = makeAnsweringState(equation, {
      inventory: [other],
      selectedTiles: [makeTile(9, "tile-selected")],
    });
    const rewardTiles = [makeTile(1, "tile-other", true), makeTile(2, "reward-1", true)];

    const next = gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles });

    expect(next).toBe(state);
  });
});

describe("SUBMIT_INCORRECT", () => {
  it("consumes tiles, resets current streak while preserving longest streak, increments totalRounds, generates no rewards, and captures the incorrect result", () => {
    const equation = makeEquation(7, 8); // product 56
    const selected = [makeTile(7, "tile-a"), makeTile(8, "tile-b")]; // constructs 78
    const other = makeTile(3, "tile-other");
    const state = makeAnsweringState(equation, {
      inventory: [other],
      selectedTiles: selected,
      score: 6,
      currentStreak: 3,
      longestStreak: 5,
      totalRounds: 8,
      round: 9,
    });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.selectedTiles).toEqual([]);
    expect(next.inventory).toEqual([other]);
    expect(next.score).toBe(6);
    expect(next.currentStreak).toBe(0);
    expect(next.longestStreak).toBe(5);
    expect(next.totalRounds).toBe(9);
    expect(next.round).toBe(next.totalRounds);
    expect(next.phase).toBe("feedback");
    expect(next.lastResult).toMatchObject({
      kind: "incorrect",
      submittedValue: 78,
      correctValue: 56,
      submittedTiles: selected,
      rewardTileIds: [],
    });
    expect(next.inventory).toHaveLength(state.inventory.length);
    // the original arrays passed via overrides must be untouched
    expect(state.selectedTiles).toEqual(selected);
    expect(state.inventory).toEqual([other]);
  });

  it("preserves append order (not sorted order) through the submission path", () => {
    const equation = makeEquation(5, 6); // product 30
    const tileSix = makeTile(6, "tile-six");
    const tileFive = makeTile(5, "tile-five");
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [tileSix, tileFive], // selecting 6 then 5 constructs 65
    });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.lastResult).toMatchObject({ submittedValue: 65, correctValue: 30 });
  });

  it("collapses a leading zero in the constructed value, so it never accidentally matches a two-digit product", () => {
    const equation = makeEquation(2, 9); // product 18
    const tileZero = makeTile(0, "tile-zero");
    const tileNine = makeTile(9, "tile-nine");
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [tileZero, tileNine], // constructs 9, not "09"
    });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.lastResult).toMatchObject({ submittedValue: 9, correctValue: 18 });
  });

  it("is accepted even when inventory lacks the tiles needed to construct the correct answer", () => {
    const equation = makeEquation(7, 8); // product 56
    const state = makeAnsweringState(equation, {
      inventory: [], // no tiles left at all, including no 5 or 6 for the correct answer
      selectedTiles: [makeTile(7, "tile-a"), makeTile(8, "tile-b")],
    });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next.phase).toBe("feedback");
  });

  it("is a no-op outside the answering phase", () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation);

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });

  it("is a no-op when the answer slots are not fully filled", () => {
    const equation = makeEquation(2, 5); // product 10, two slots
    const state = makeAnsweringState(equation, { selectedTiles: [makeTile(1, "tile-one")] });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });

  it("is a no-op when the constructed answer actually matches the product, regardless of the declared action", () => {
    const equation = makeEquation(3, 3); // product 9
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(9, "tile-selected")],
    });

    const next = gameReducer(state, { type: "SUBMIT_INCORRECT" });

    expect(next).toBe(state);
  });
});

describe("TOGGLE_DISCARD", () => {
  // 12 tiles against 10 sockets: excess 2, so a first mark is only a mark.
  const excessTwo = () => {
    const tileA = makeTile(5, "tile-a");
    const tileB = makeTile(5, "tile-b");
    const rest = Array.from({ length: 10 }, (_, index) => makeTile((index % 9) as Digit, `tile-rest-${index}`));
    return { tileA, tileB, rest, state: makeOverflowState(makeEquation(3, 3), { inventory: [tileA, tileB, ...rest] }) };
  };

  it("marks an exact inventory tile ID on first toggle and clears it on second toggle, below the required count", () => {
    const { state, tileA } = excessTwo();

    const marked = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tileA.id });
    expect(marked.pendingDiscards).toEqual([tileA.id]);
    expect(marked.phase).toBe("overflow");
    expect(marked.inventory).toBe(state.inventory);

    const unmarked = gameReducer(marked, { type: "TOGGLE_DISCARD", tileId: tileA.id });
    expect(unmarked.pendingDiscards).toEqual([]);
  });

  it("completes the discard on the mark that reaches the required count of one", () => {
    const state = makeOverflowState(makeEquation(3, 3)); // excess 1
    const target = state.inventory[3]!;

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: target.id });

    expect(next.phase).toBe("feedback");
    expect(next.pendingDiscards).toEqual([]);
    expect(next.inventory).toHaveLength(10);
    expect(next.inventory.map((tile) => tile.id)).not.toContain(target.id);
    expect(next.lastResult?.discarded).toBe(true);
  });

  it("completes the discard on the second of two marks, removing both duplicate-digit tiles by exact ID", () => {
    const { state, tileA, tileB } = excessTwo();

    const afterA = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tileA.id });
    const afterBoth = gameReducer(afterA, { type: "TOGGLE_DISCARD", tileId: tileB.id });

    expect(afterBoth.phase).toBe("feedback");
    expect(afterBoth.inventory.map((tile) => tile.id)).not.toContain(tileA.id);
    expect(afterBoth.inventory.map((tile) => tile.id)).not.toContain(tileB.id);
    expect(afterBoth.inventory).toHaveLength(10);
  });

  it("seats a surviving rail tile in the socket the discard freed, and moves no other tile", () => {
    const seated = Array.from({ length: 10 }, (_, index) => makeTile((index % 9) as Digit, `seat-${index}`));
    const rail = makeTile(7, "rail", true);
    const state = makeOverflowState(makeEquation(3, 3), { inventory: [...seated, rail] });

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: seated[4]!.id });

    const expected = [...seated];
    expected[4] = rail;
    expect(next.inventory).toEqual(expected);
  });

  it("discarding the rail tile itself leaves the seated tiles untouched", () => {
    const seated = Array.from({ length: 10 }, (_, index) => makeTile((index % 9) as Digit, `seat-${index}`));
    const rail = makeTile(7, "rail", true);
    const state = makeOverflowState(makeEquation(3, 3), { inventory: [...seated, rail] });

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: rail.id });

    expect(next.inventory).toEqual(seated);
  });

  it("is a no-op for a tile ID not present in inventory", () => {
    const state = makeOverflowState(makeEquation(3, 3));

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: "missing-tile" });

    expect(next).toBe(state);
  });

  it("is a no-op outside the overflow phase", () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation);
    const tile = state.inventory[0]!;

    const next = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tile.id });

    expect(next).toBe(state);
  });
});

describe("NEXT_ROUND", () => {
  it("clears new markers, prior result, selection, and pending discards; increments round while totalRounds is unchanged; enters answering when enough tiles remain", () => {
    const priorEquation = makeEquation(3, 3);
    const oldTile = makeTile(1, "tile-old", false);
    const newTile = makeTile(4, "tile-new", true);
    const state = makeFeedbackState(priorEquation, {
      inventory: [oldTile, newTile],
      round: 4,
      totalRounds: 4,
    });
    const nextEquation = makeEquation(2, 3); // product 6, one slot

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: nextEquation });

    expect(next.phase).toBe("answering");
    expect(next.equation).toBe(nextEquation);
    expect(next.inventory).toEqual([oldTile, { ...newTile, isNew: false }]);
    expect(next.inventory[0]).toBe(oldTile); // tiles that were never new keep object identity
    expect(next.lastResult).toBeNull();
    expect(next.selectedTiles).toEqual([]);
    expect(next.pendingDiscards).toEqual([]);
    expect(next.round).toBe(5);
    expect(next.totalRounds).toBe(4);
    // the original inventory array passed via overrides must be untouched
    expect(state.inventory[1]!.isNew).toBe(true);
  });

  it("enters answering when exactly one tile remains and the next product is one digit", () => {
    const state = makeFeedbackState(makeEquation(3, 3), {
      inventory: [makeTile(5, "only-tile")],
    });

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: makeEquation(3, 3) }); // product 9, one slot

    expect(next.phase).toBe("answering");
  });

  it("enters game over when exactly one tile remains and the next product is two digits, retaining the terminal equation", () => {
    const state = makeFeedbackState(makeEquation(3, 3), {
      inventory: [makeTile(5, "only-tile")],
    });
    const terminalEquation = makeEquation(7, 8); // product 56, two slots

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: terminalEquation });

    expect(next.phase).toBe("gameOver");
    expect(next.equation).toBe(terminalEquation);
    expect(next.round).toBe(next.totalRounds + 1);
  });

  it("enters answering even when the surviving tiles cannot actually construct the next answer", () => {
    // exact-answer constructibility is never checked, only tile count
    const inventory = [makeTile(5, "tile-a"), makeTile(5, "tile-b")];
    const state = makeFeedbackState(makeEquation(3, 3), { inventory });

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: makeEquation(3, 3) }); // product 9; no '9' tile exists

    expect(next.phase).toBe("answering");
  });

  it("re-sorts the whole rack once, and clears the discarded marker with the result", () => {
    const state = makeFeedbackState(makeEquation(3, 3), {
      inventory: [makeTile(7, "a"), makeTile(2, "b"), makeTile(5, "c")],
    });
    const withMarker: GameState = {
      ...state,
      lastResult: { ...state.lastResult!, discarded: true },
    };

    const next = gameReducer(withMarker, { type: "NEXT_ROUND", equation: makeEquation(2, 3) });

    expect(next.inventory.map((tile) => tile.digit)).toEqual([2, 5, 7]);
    expect(next.lastResult).toBeNull();
  });

  it("is a no-op outside the feedback phase (overflow)", () => {
    const state = makeOverflowState(makeEquation(3, 3));

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: makeEquation(2, 4) });

    expect(next).toBe(state);
  });

  it("is a no-op outside the feedback phase (answering)", () => {
    const state = makeAnsweringState(makeEquation(3, 3));

    const next = gameReducer(state, { type: "NEXT_ROUND", equation: makeEquation(2, 4) });

    expect(next).toBe(state);
  });
});

describe("RESTART_RUN", () => {
  it("starts a fresh run at round 1 with reset statistics and the action-provided inventory", () => {
    const priorState: GameState = {
      ...makeFeedbackState(makeEquation(7, 8)),
      phase: "gameOver",
      score: 9,
      round: 12,
      totalRounds: 11,
      currentStreak: 0,
      longestStreak: 6,
    };
    const equation = makeEquation(4, 4);
    const inventory = createInitialInventory(sequentialIds("restart"));

    const next = gameReducer(priorState, { type: "RESTART_RUN", equation, inventory });

    expect(next).toEqual({
      phase: "answering",
      mode: "endless",
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
    });
  });

  it("is a no-op outside the game over phase", () => {
    const state = makeFeedbackState(makeEquation(3, 3));
    const equation = makeEquation(2, 2);
    const inventory = createInitialInventory(sequentialIds("restart"));

    const next = gameReducer(state, { type: "RESTART_RUN", equation, inventory });

    expect(next).toBe(state);
  });
});

// Test-only helper validating every §2.5 reducer invariant against a state.
// Not exported: it exists only to drive the lifecycle walk below.
function assertInvariants(state: GameState): void {
  const {
    phase,
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

  // equation === null only in title.
  if (phase === "title") {
    expect(equation).toBeNull();
  } else {
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

  // inventory.length <= getCapacity(state) when phase is
  // answering, feedback, or gameOver.
  const capacity = getCapacity(state);
  if (phase === "answering" || phase === "feedback" || phase === "gameOver") {
    expect(inventory.length).toBeLessThanOrEqual(capacity);
  }

  // inventory.length > getCapacity(state) when phase is overflow.
  if (phase === "overflow") {
    expect(inventory.length).toBeGreaterThan(capacity);
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
    const state = makeAnsweringState(makeEquation(4, 5), {
      inventory: [makeTile(1, "a")],
      selectedTiles: [makeTile(3, "b"), makeTile(0, "c")],
    });

    const next = gameReducer(state, { type: "CLEAR_SELECTION" });

    expect(next.selectedTiles).toEqual([]);
    expect(next.inventory.map((tile) => tile.digit)).toEqual([0, 1, 3]);
  });

  it("is a no-op when nothing is selected", () => {
    const state = makeAnsweringState(makeEquation(4, 5));
    expect(gameReducer(state, { type: "CLEAR_SELECTION" })).toBe(state);
  });

  it("is a no-op outside answering", () => {
    // A selection, so the empty-selection guard cannot be what rejects it.
    const state = makeFeedbackState(makeEquation(4, 5), { selectedTiles: [makeTile(4, "tile-selected")] });
    expect(gameReducer(state, { type: "CLEAR_SELECTION" })).toBe(state);
  });
});

describe("reducer lifecycle invariants (§2.5)", () => {
  it("walks a full legal lifecycle path, asserting every §2.5 invariant after each transition", () => {
    interface Step {
      label: string;
      getAction: (state: GameState) => GameAction;
      expectedPhase: GameState["phase"];
    }

    const steps: Step[] = [
      {
        label: "start the run",
        getAction: () => ({
          type: "START_RUN",
          mode: "endless",
          equation: makeEquation(3, 3), // product 9, one slot
          inventory: createInitialInventory(sequentialIds()),
        }),
        expectedPhase: "answering",
      },
      {
        label: "select the tile that constructs the correct answer",
        getAction: (s) => ({
          type: "SELECT_TILE",
          tileId: s.inventory.find((tile) => tile.digit === 9)!.id,
        }),
        expectedPhase: "answering",
      },
      {
        label: "submit correct, overflowing capacity by one",
        getAction: () => ({
          type: "SUBMIT_CORRECT",
          rewardTiles: [makeTile(0, "reward-0"), makeTile(1, "reward-1")],
        }),
        expectedPhase: "overflow",
      },
      {
        label: "mark a newly rewarded tile, completing the discard and returning to feedback at capacity",
        getAction: () => ({ type: "TOGGLE_DISCARD", tileId: "reward-0" }),
        expectedPhase: "feedback",
      },
      {
        label: "advance to the next round",
        getAction: () => ({ type: "NEXT_ROUND", equation: makeEquation(3, 3) }), // product 9, one slot
        expectedPhase: "answering",
      },
    ];

    // No tile carries digit 9 after the first round consumed it, so any
    // single-tile submission against product 9 is deterministically
    // incorrect — shrinking the inventory by exactly one tile per cycle
    // without needing to reason about which tile is "safe" to pick.
    const shrinkEquation = makeEquation(3, 3);
    for (let cycle = 1; cycle <= 8; cycle += 1) {
      steps.push(
        {
          label: `shrink cycle ${cycle}: select a tile`,
          getAction: (s) => ({ type: "SELECT_TILE", tileId: s.inventory[0]!.id }),
          expectedPhase: "answering",
        },
        {
          label: `shrink cycle ${cycle}: submit incorrect`,
          getAction: () => ({ type: "SUBMIT_INCORRECT" }),
          expectedPhase: "feedback",
        },
        {
          label: `shrink cycle ${cycle}: advance to the next round`,
          getAction: () => ({ type: "NEXT_ROUND", equation: shrinkEquation }),
          expectedPhase: "answering",
        },
      );
    }

    steps.push(
      {
        label: "select one of the final two tiles",
        getAction: (s) => ({ type: "SELECT_TILE", tileId: s.inventory[0]!.id }),
        expectedPhase: "answering",
      },
      {
        label: "submit incorrect, leaving exactly one tile",
        getAction: () => ({ type: "SUBMIT_INCORRECT" }),
        expectedPhase: "feedback",
      },
      {
        label: "advance with a two-digit equation: one tile cannot fill two slots",
        getAction: () => ({ type: "NEXT_ROUND", equation: makeEquation(7, 8) }), // product 56, two slots
        expectedPhase: "gameOver",
      },
      {
        label: "restart the run",
        getAction: () => ({
          type: "RESTART_RUN",
          equation: makeEquation(2, 3),
          inventory: createInitialInventory(sequentialIds("restart")),
        }),
        expectedPhase: "answering",
      },
    );

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

const puzzleStart = (table = PUZZLE_SAMPLE, ids = sequentialIds()): GameState =>
  gameReducer(createTitleState(), {
    type: "START_RUN",
    mode: "puzzle",
    equation: table.rows[0]!.equation,
    inventory: sortTiles(createTiles(table.hand, ids)),
    table,
  });

const tileWith = (state: GameState, digit: Digit): Tile =>
  state.inventory.find((tile) => tile.digit === digit)!;

// Plays rows through the reducer exactly as App does: select, submit with the
// row's pay, discard if asked, advance to the next row's equation.
function play(state: GameState, line: PuzzleMove[], ids: TileIdFactory): GameState {
  const table = state.table!;
  for (const [index, move] of line.entries()) {
    for (const digit of move.spend) {
      state = gameReducer(state, { type: "SELECT_TILE", tileId: tileWith(state, digit).id });
    }
    const row = table.rows[index]!;
    state = answerMatches(state.selectedTiles, row.equation.product)
      ? gameReducer(state, { type: "SUBMIT_CORRECT", rewardTiles: createTiles(row.pay, ids) })
      : gameReducer(state, { type: "SUBMIT_INCORRECT" });
    if (move.discard !== undefined) {
      state = gameReducer(state, { type: "TOGGLE_DISCARD", tileId: tileWith(state, move.discard).id });
    }
    const next = table.rows[index + 1]?.equation ?? row.equation;
    state = gameReducer(state, { type: "NEXT_ROUND", equation: next });
  }
  return state;
}

const digitsOf = (tiles: readonly Tile[]) => tiles.map((tile) => tile.digit);

describe("Puzzle", () => {
  it("starts with the table, its hand and row 1", () => {
    const state = puzzleStart();
    expect(state.phase).toBe("answering");
    expect(state.mode).toBe("puzzle");
    expect(state.table).toBe(PUZZLE_SAMPLE);
    expect(digitsOf(state.inventory)).toEqual([1, 4, 5, 7, 9]);
    expect(state.rowResults).toEqual([]);
  });

  it("records each row's result in order, and only in Puzzle", () => {
    const ids = sequentialIds();
    const state = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), ids);
    expect(state.rowResults).toEqual(["incorrect", "correct", "correct"]);
    const endless = gameReducer(createTitleState(), {
      type: "START_RUN",
      mode: "endless",
      equation: makeEquation(2, 3),
      inventory: createInitialInventory(sequentialIds()),
    });
    expect(endless).not.toHaveProperty("rowResults");
    expect(endless).not.toHaveProperty("table");
  });

  it("refuses a Puzzle start without a table", () => {
    const title = createTitleState();
    const next = gameReducer(title, {
      type: "START_RUN",
      mode: "puzzle",
      equation: PUZZLE_SAMPLE.rows[0]!.equation,
      inventory: createTiles(PUZZLE_SAMPLE.hand, sequentialIds()),
    });
    expect(next).toBe(title);
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

  it("restarts with the new table, refusing a restart without one", () => {
    const ids = sequentialIds();
    const end = play(puzzleStart(PUZZLE_SAMPLE, ids), PUZZLE_SAMPLE_PAR_LINE, ids);
    const other: PuzzleTable = { ...PUZZLE_SAMPLE, hand: [0, 2, 3, 6, 8], par: 5 };
    const restart = { type: "RESTART_RUN", equation: other.rows[0]!.equation, inventory: createTiles(other.hand, ids) } as const;
    expect(gameReducer(end, restart)).toBe(end);
    const next = gameReducer(end, { ...restart, table: other });
    expect(next.table).toBe(other);
    expect(next.mode).toBe("puzzle");
    expect(next.score).toBe(0);
  });
});
