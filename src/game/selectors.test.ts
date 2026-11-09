import { describe, expect, it } from "vitest";
import {
  answerMatches,
  canAttemptEquation,
  canConstruct,
  constructAnswer,
  getAnswerLength,
  getCapacity,
  getOverflowCount,
  getRewardCount,
  isClassicWin,
  isParMade,
  isRunComplete,
  isSubmissionReady,
} from "./selectors";
import {
  CLASSIC_FLOOR,
  CLASSIC_SEAL_EVERY,
  CLASSIC_START_CAPACITY,
  INVENTORY_CAPACITY,
  PUZZLE_CAPACITY,
  REWARD_BONUS,
} from "./balance";
import { createTitleState } from "./factories";
import {
  PUZZLE_SAMPLE,
  makeAnsweringState,
  makeEquation,
  makeFeedbackState,
  makeTile,
} from "../test/fixtures";

describe("getRewardCount", () => {
  it("returns one more tile than was spent", () => {
    expect(getRewardCount(1)).toBe(2);
    expect(getRewardCount(2)).toBe(3);
  });

  it("tracks REWARD_BONUS rather than a hardcoded increment", () => {
    expect(getRewardCount(2)).toBe(2 + REWARD_BONUS);
  });
});

describe("getAnswerLength", () => {
  it("returns 1 for a one-digit product", () => {
    expect(getAnswerLength(makeEquation(3, 3))).toBe(1);
  });

  it("returns 2 for a two-digit product of 10", () => {
    expect(getAnswerLength(makeEquation(2, 5))).toBe(2);
  });

  it("returns 2 for a two-digit product of 81", () => {
    expect(getAnswerLength(makeEquation(9, 9))).toBe(2);
  });
});

describe("constructAnswer", () => {
  it("returns null when no tiles are selected", () => {
    expect(constructAnswer([])).toBeNull();
  });

  it("constructs 56 from tiles selected in order [5, 6]", () => {
    expect(constructAnswer([makeTile(5), makeTile(6)])).toBe(56);
  });

  it("constructs 65 from tiles selected in order [6, 5]", () => {
    expect(constructAnswer([makeTile(6), makeTile(5)])).toBe(65);
  });

  it("constructs a single-digit answer from one selected tile", () => {
    expect(constructAnswer([makeTile(7)])).toBe(7);
  });

  it("collapses a leading zero: [0, 9] constructs 9, not 09", () => {
    // Documented for T05: this can never falsely match a two-digit product,
    // since every two-slot equation's correct product is >= 10 and 9 < 10.
    expect(constructAnswer([makeTile(0), makeTile(9)])).toBe(9);
  });
});

describe("canAttemptEquation", () => {
  it("allows a one-digit equation when inventory has exactly 1 tile", () => {
    const inventory = [makeTile(3)];
    expect(canAttemptEquation(inventory, makeEquation(3, 3))).toBe(true);
  });

  it("disallows a two-digit equation when inventory has only 1 tile", () => {
    const inventory = [makeTile(3)];
    expect(canAttemptEquation(inventory, makeEquation(2, 5))).toBe(false);
  });

  it("allows a two-digit equation when inventory has exactly 2 tiles", () => {
    const inventory = [makeTile(1), makeTile(0)];
    expect(canAttemptEquation(inventory, makeEquation(2, 5))).toBe(true);
  });

  it("disallows any equation when inventory is empty", () => {
    expect(canAttemptEquation([], makeEquation(3, 3))).toBe(false);
  });
});

describe("canConstruct", () => {
  const hand = [makeTile(1, "a"), makeTile(2, "b"), makeTile(4, "c")];

  it("accepts a one-digit product whose digit is held", () => {
    expect(canConstruct(hand, 4)).toBe(true);
  });

  it("accepts a two-digit product whose digits are both held", () => {
    expect(canConstruct(hand, 42)).toBe(true);
  });

  it("rejects a product missing one digit", () => {
    expect(canConstruct(hand, 45)).toBe(false);
  });

  it("requires two tiles for a repeated digit", () => {
    expect(canConstruct([makeTile(1, "a")], 11)).toBe(false);
    expect(canConstruct([makeTile(1, "a"), makeTile(1, "b")], 11)).toBe(true);
  });

  it("rejects everything from an empty hand", () => {
    expect(canConstruct([], 4)).toBe(false);
  });
});

describe("answerMatches", () => {
  it("reads slots in order", () => {
    expect(answerMatches([makeTile(5), makeTile(6)], 56)).toBe(true);
    expect(answerMatches([makeTile(6), makeTile(5)], 56)).toBe(false);
  });

  it("rejects a selection that does not fill the product's slots", () => {
    expect(answerMatches([makeTile(0), makeTile(9)], 9)).toBe(false);
    expect(answerMatches([makeTile(5)], 56)).toBe(false);
  });
});

describe("getCapacity", () => {
  it("holds Endless at its fixed capacity however many submissions pass", () => {
    expect(getCapacity("endless", 0)).toBe(INVENTORY_CAPACITY);
    expect(getCapacity("endless", 99)).toBe(INVENTORY_CAPACITY);
  });

  it("starts Classic at its start capacity and seals one socket every step", () => {
    expect(getCapacity("classic", 0)).toBe(CLASSIC_START_CAPACITY);
    expect(getCapacity("classic", CLASSIC_SEAL_EVERY - 1)).toBe(CLASSIC_START_CAPACITY);
    expect(getCapacity("classic", CLASSIC_SEAL_EVERY)).toBe(CLASSIC_START_CAPACITY - 1);
    expect(getCapacity("classic", 2 * CLASSIC_SEAL_EVERY)).toBe(CLASSIC_START_CAPACITY - 2);
  });

  it("stops Classic at the floor", () => {
    const toFloor = (CLASSIC_START_CAPACITY - CLASSIC_FLOOR) * CLASSIC_SEAL_EVERY;
    expect(getCapacity("classic", toFloor)).toBe(CLASSIC_FLOOR);
    expect(getCapacity("classic", toFloor + 99)).toBe(CLASSIC_FLOOR);
  });
});

describe("getOverflowCount", () => {
  it("measures Classic's excess against the live capacity, not ten", () => {
    const inventory = Array.from({ length: 20 }, (_, index) => makeTile(0, `tile-${index}`));
    const base = { ...createTitleState(), mode: "classic" as const, inventory };
    expect(getOverflowCount({ ...base, totalRounds: 0 })).toBe(0);
    expect(getOverflowCount({ ...base, totalRounds: CLASSIC_SEAL_EVERY })).toBe(1);
  });

  it("returns 0 when inventory is under capacity", () => {
    const inventory = Array.from({ length: 8 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(0);
  });

  it("returns 0 when inventory is exactly at capacity", () => {
    const inventory = Array.from({ length: 10 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(0);
  });

  it("returns 1 when inventory has one tile over capacity", () => {
    const inventory = Array.from({ length: 11 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(1);
  });

  it("returns 3 when inventory has three tiles over capacity", () => {
    const inventory = Array.from({ length: 13 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(3);
  });
});

describe("isSubmissionReady", () => {
  it("is true in answering phase when selected tiles fill a one-digit answer", () => {
    const state = makeAnsweringState(makeEquation(3, 3), {
      selectedTiles: [makeTile(9)],
    });
    expect(isSubmissionReady(state)).toBe(true);
  });

  it("is true in answering phase when selected tiles fill a two-digit answer", () => {
    const state = makeAnsweringState(makeEquation(2, 5), {
      selectedTiles: [makeTile(1), makeTile(0)],
    });
    expect(isSubmissionReady(state)).toBe(true);
  });

  it("is false in answering phase when fewer tiles are selected than required", () => {
    const state = makeAnsweringState(makeEquation(2, 5), {
      selectedTiles: [makeTile(1)],
    });
    expect(isSubmissionReady(state)).toBe(false);
  });

  it("is false when no tiles are selected", () => {
    const state = makeAnsweringState(makeEquation(3, 3), { selectedTiles: [] });
    expect(isSubmissionReady(state)).toBe(false);
  });

  it("is false outside the answering phase even with a full selection", () => {
    const state = makeFeedbackState(makeEquation(3, 3), { selectedTiles: [makeTile(9)] });
    expect(isSubmissionReady(state)).toBe(false);
  });
});

describe("isClassicWin", () => {
  const atFloor = (CLASSIC_START_CAPACITY - CLASSIC_FLOOR) * CLASSIC_SEAL_EVERY;
  const gameOver = { ...createTitleState(), phase: "gameOver" as const, inventory: [makeTile(4)] };

  it("is true for a Classic game over at the floor with tiles in hand", () => {
    expect(isClassicWin({ ...gameOver, mode: "classic", totalRounds: atFloor })).toBe(true);
  });

  // A miss that spends the last tile on the final submission is a failure,
  // floor or not (§1.8 step 0).
  it("is false for a Classic game over at the floor with an empty hand", () => {
    expect(isClassicWin({ ...gameOver, mode: "classic", totalRounds: atFloor, inventory: [] })).toBe(false);
  });

  it("is false for a Classic game over above the floor, which is a loss", () => {
    expect(isClassicWin({ ...gameOver, mode: "classic", totalRounds: atFloor - 1 })).toBe(false);
  });

  it("is false for an Endless game over and for a Classic run still in play", () => {
    expect(isClassicWin({ ...gameOver, mode: "endless", totalRounds: atFloor })).toBe(false);
    expect(
      isClassicWin({ ...gameOver, phase: "feedback", mode: "classic", totalRounds: atFloor }),
    ).toBe(false);
  });
});

describe("Puzzle selectors", () => {
  it("holds five sockets at every submission", () => {
    for (const totalRounds of [0, 1, 7, 8]) expect(getCapacity("puzzle", totalRounds)).toBe(PUZZLE_CAPACITY);
  });

  it("completes a Puzzle run once every row is submitted, and Classic at its floor", () => {
    const table = PUZZLE_SAMPLE;
    expect(isRunComplete({ mode: "puzzle", totalRounds: 7, table })).toBe(false);
    expect(isRunComplete({ mode: "puzzle", totalRounds: 8, table })).toBe(true);
    const floor = (CLASSIC_START_CAPACITY - CLASSIC_FLOOR) * CLASSIC_SEAL_EVERY;
    expect(isRunComplete({ mode: "classic", totalRounds: floor })).toBe(true);
    expect(isRunComplete({ mode: "endless", totalRounds: 999 })).toBe(false);
  });

  it("makes par only at game over with score equal to par", () => {
    const table = PUZZLE_SAMPLE;
    expect(isParMade({ phase: "gameOver", mode: "puzzle", score: 7, table })).toBe(true);
    expect(isParMade({ phase: "gameOver", mode: "puzzle", score: 6, table })).toBe(false);
    expect(isParMade({ phase: "feedback", mode: "puzzle", score: 7, table })).toBe(false);
    expect(isParMade({ phase: "gameOver", mode: "classic", score: 7 })).toBe(false);
  });
});
