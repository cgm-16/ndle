import { describe, expect, it } from "vitest";
import {
  PUZZLE_CAPACITY,
  PUZZLE_MIN_ONLY_MOVES,
  PUZZLE_MIN_PAR,
  PUZZLE_ROWS,
} from "./balance";
import { getAnswerLength, getRewardCount } from "./selectors";
import { dealPuzzle, playMyopic, plantTable, solvePuzzle } from "./puzzle";
import type { PuzzleDeal } from "./types";
import {
  makePuzzleRow,
  play,
  PUZZLE_SAMPLE,
  PUZZLE_SAMPLE_PAR_LINE,
  puzzleStart,
  seededRandom,
  sequentialIds,
} from "../test/fixtures";

const deal = ({ hand, rows }: PuzzleDeal): PuzzleDeal => ({ hand, rows });

describe("solvePuzzle", () => {
  it("prices the draft's sample: par 7, four only-moves, and par needs a sacrifice", () => {
    expect(solvePuzzle(deal(PUZZLE_SAMPLE))).toEqual({
      par: 7,
      onlyMoves: 4,
      sacrificeRequired: true,
      parLine: PUZZLE_SAMPLE_PAR_LINE,
    });
  });

  it("returns a par line that replays to par", () => {
    const tables = [
      PUZZLE_SAMPLE,
      ...Array.from({ length: 20 }, (_, i) => {
        const planted = plantTable(seededRandom(i + 1));
        return { ...planted, par: solvePuzzle(planted).par };
      }),
    ];
    for (const table of tables) {
      const ids = sequentialIds();
      const { parLine, par } = solvePuzzle(table);
      expect(play(puzzleStart(table, ids), parLine, ids).score).toBe(par);
    }
  });

  it("scores 0 when the hand can spell no row", () => {
    const fiveOnes: PuzzleDeal = {
      hand: [1, 1, 1, 1, 1],
      rows: Array.from({ length: 6 }, () => makePuzzleRow(7, 8, [1, 1, 1])),
    };
    expect(solvePuzzle(fiveOnes).par).toBe(0);
    expect(playMyopic(fiveOnes)).toBe(0);
  });

  it("caps the no-0 control at 3 of 4, since row 1 needs a 0 nothing supplies", () => {
    const noZero: PuzzleDeal = {
      hand: [1, 2, 4, 6, 8],
      rows: [
        makePuzzleRow(5, 8, [1, 2, 3]),
        makePuzzleRow(2, 3, [1, 2]),
        makePuzzleRow(3, 4, [6, 8, 9]),
        makePuzzleRow(2, 4, [1, 3]),
      ],
    };
    expect(solvePuzzle(noZero).par).toBe(3);
  });

  it("refuses an opening hand over capacity", () => {
    const over: PuzzleDeal = { hand: [1, 2, 3, 4, 5, 6], rows: [makePuzzleRow(2, 3, [1, 2])] };
    expect(() => solvePuzzle(over)).toThrow(RangeError);
  });
});

describe("playMyopic", () => {
  it("scores the sample 2, as the research bot does", () => {
    expect(playMyopic(deal(PUZZLE_SAMPLE))).toBe(2);
  });
});

describe("plantTable", () => {
  it("replays the research deal exactly under the same seed", () => {
    expect(plantTable(seededRandom(16641))).toEqual(deal(PUZZLE_SAMPLE));
  });

  it("deals five distinct digits and eight rows, each paying its reward count", () => {
    const { hand, rows } = plantTable(seededRandom(2));
    expect(hand).toHaveLength(PUZZLE_CAPACITY);
    expect(new Set(hand).size).toBe(PUZZLE_CAPACITY);
    expect(rows).toHaveLength(PUZZLE_ROWS);
    for (const { equation, pay } of rows) {
      expect(pay).toHaveLength(getRewardCount(getAnswerLength(equation)));
    }
  });

  it("rejects a source outside [0, 1)", () => {
    expect(() => plantTable(() => 1)).toThrow(RangeError);
  });
});

describe("dealPuzzle", () => {
  it("deals a table inside the band, with its par", () => {
    const table = dealPuzzle(seededRandom(1));
    const { par, onlyMoves } = solvePuzzle(deal(table));
    expect(table.par).toBe(par);
    expect(par).toBeGreaterThanOrEqual(PUZZLE_MIN_PAR);
    expect(playMyopic(deal(table))).toBeLessThan(par);
    expect(onlyMoves).toBeGreaterThanOrEqual(PUZZLE_MIN_ONLY_MOVES);
  });

  it("stops at the attempt bound and returns that deal, priced", () => {
    const planted = plantTable(seededRandom(3));
    expect(dealPuzzle(seededRandom(3), 1)).toEqual({
      ...planted,
      par: solvePuzzle(planted).par,
    });
  });
});
