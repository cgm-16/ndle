import { describe, expect, it } from "vitest";
import {
  answerMatches,
  canAttemptEquation,
  constructAnswer,
  getAnswerLength,
  getOverflowCount,
  getRewardCount,
  isParMade,
  isRunComplete,
  isSubmissionReady,
} from "./selectors";
import { REWARD_BONUS } from "./balance";
import { createTitleState } from "./factories";
import {
  PUZZLE_SAMPLE,
  makeAnsweringState,
  makeEquation,
  makeFeedbackState,
  makeTile,
  parLineAt,
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

describe("getOverflowCount", () => {
  it("returns 0 when inventory is under capacity", () => {
    const inventory = Array.from({ length: 4 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(0);
  });

  it("returns 0 when inventory is exactly at capacity", () => {
    const inventory = Array.from({ length: 5 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(0);
  });

  it("returns 1 when inventory has one tile over capacity", () => {
    const inventory = Array.from({ length: 6 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(1);
  });

  it("returns 3 when inventory has three tiles over capacity", () => {
    const inventory = Array.from({ length: 8 }, (_, index) => makeTile(0, `tile-${index}`));
    expect(getOverflowCount({ ...createTitleState(), inventory })).toBe(3);
  });
});

describe("isSubmissionReady", () => {
  it("is true in answering phase when selected tiles fill a one-digit answer", () => {
    const state = { ...parLineAt(3), selectedTiles: [makeTile(9)] }; // row 3, 9
    expect(isSubmissionReady(state)).toBe(true);
  });

  it("is true in answering phase when selected tiles fill a two-digit answer", () => {
    const state = makeAnsweringState({ selectedTiles: [makeTile(1), makeTile(5)] }); // row 1, 15
    expect(isSubmissionReady(state)).toBe(true);
  });

  it("is false in answering phase when fewer tiles are selected than required", () => {
    const state = makeAnsweringState({ selectedTiles: [makeTile(1)] });
    expect(isSubmissionReady(state)).toBe(false);
  });

  it("is false when no tiles are selected", () => {
    const state = makeAnsweringState();
    expect(isSubmissionReady(state)).toBe(false);
  });

  it("is false outside the answering phase even with a full selection", () => {
    const state = makeFeedbackState({ selectedTiles: [makeTile(1), makeTile(5)] });
    expect(isSubmissionReady(state)).toBe(false);
  });
});

describe("Puzzle selectors", () => {
  it("completes a Puzzle run once every row is submitted", () => {
    const table = PUZZLE_SAMPLE;
    expect(isRunComplete({ totalRounds: 7, table })).toBe(false);
    expect(isRunComplete({ totalRounds: 8, table })).toBe(true);
    expect(isRunComplete({ totalRounds: 8, table: null })).toBe(false);
  });

  it("makes par only at game over with score equal to par", () => {
    const table = PUZZLE_SAMPLE;
    expect(isParMade({ phase: "gameOver", score: 7, table })).toBe(true);
    expect(isParMade({ phase: "gameOver", score: 6, table })).toBe(false);
    expect(isParMade({ phase: "feedback", score: 7, table })).toBe(false);
    expect(isParMade({ phase: "gameOver", score: 7, table: null })).toBe(false);
  });
});
