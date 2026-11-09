import { describe, expect, it } from "vitest";
import { dailyNumberOn, DAILY_LAUNCH_DATE, dateOfDaily } from "./daily";
import {
  describeDaily,
  fillDailySlots,
  frozenThroughOn,
  isDailyCandidate,
  plantDailyTable,
} from "./dailyPicker";
import { plantTable, solvePuzzle } from "./puzzle";
import {
  PUZZLE_SAMPLE,
  play,
  puzzleStart,
  seededRandom,
  sequentialIds,
} from "../test/fixtures";

// plantDailyTable(seededRandom(7), 5000) finds a table.
const B = plantDailyTable(seededRandom(7), 5000)!;

const fill = (existing: Parameters<typeof fillDailySlots>[0], overrides = {}) =>
  fillDailySlots(existing, {
    count: 2,
    frozenThrough: 0,
    vetoed: new Set<number>(),
    random: seededRandom(11),
    attemptsPerSlot: 5000,
    ...overrides,
  });

describe("daily picker", () => {
  it("finds the B table within 5000 plants of seed 7", () => {
    expect(B).not.toBeNull();
    expect(isDailyCandidate(B)).not.toBeNull();
  });

  it("accepts the sample as a daily candidate", () => {
    expect(isDailyCandidate(PUZZLE_SAMPLE)?.par).toBe(7);
  });

  it("returns null when no plant qualifies within the bound", () => {
    const seed = Array.from({ length: 50 }, (_, i) => i + 1).find(
      (s) => isDailyCandidate(plantTable(seededRandom(s))) === null,
    )!;
    expect(plantDailyTable(seededRandom(seed), 1)).toBeNull();
  });

  it("keeps frozen slots and replaces a vetoed future slot", () => {
    const filled = fill([PUZZLE_SAMPLE, B], { frozenThrough: 1, vetoed: new Set([2]) });
    expect(filled[0]).toBe(PUZZLE_SAMPLE);
    expect(filled[1]).not.toEqual(B);
    expect(isDailyCandidate(filled[1])).not.toBeNull();
  });

  it("never refills a vetoed slot with the table that was vetoed", () => {
    // The same source plants the vetoed table first, so the veto must skip it.
    const vetoedTable = plantDailyTable(seededRandom(11), 5000)!;
    const filled = fill([PUZZLE_SAMPLE, vetoedTable], {
      frozenThrough: 1,
      vetoed: new Set([2]),
      random: seededRandom(11),
    });
    expect(filled[1]).not.toEqual(vetoedTable);
    expect(isDailyCandidate(filled[1])).not.toBeNull();
  });

  it("refuses to veto a frozen slot", () => {
    expect(() => fill([PUZZLE_SAMPLE, B], { frozenThrough: 1, vetoed: new Set([1]) })).toThrow(RangeError);
  });

  it("refuses fewer slots than are frozen", () => {
    expect(() => fill([PUZZLE_SAMPLE], { frozenThrough: 2 })).toThrow(RangeError);
  });

  it("throws when a slot has no candidate within the attempts", () => {
    expect(() => fill([], { attemptsPerSlot: 1, random: seededRandom(1) })).toThrow(RangeError);
  });

  it("appends candidates up to count and never repeats a table", () => {
    const filled = fill([PUZZLE_SAMPLE], { count: 3 });
    expect(filled).toHaveLength(3);
    expect(filled[0]).toBe(PUZZLE_SAMPLE);
    filled.forEach((table) => expect(isDailyCandidate(table)).not.toBeNull());
    expect(new Set(filled.map((t) => JSON.stringify(t))).size).toBe(3);
  });

  it("freezes nothing before launch", () => {
    expect(frozenThroughOn(DAILY_LAUNCH_DATE, 365, false)).toBe(0);
    expect(frozenThroughOn(dateOfDaily(200), 365, false)).toBe(0);
  });

  it("freezes through two days past today after launch", () => {
    expect(frozenThroughOn(DAILY_LAUNCH_DATE, 365, true)).toBe(3);
    expect(frozenThroughOn(dateOfDaily(-1), 365, true)).toBe(1);
    expect(frozenThroughOn(dateOfDaily(-2), 365, true)).toBe(0);
    expect(frozenThroughOn(DAILY_LAUNCH_DATE, 2, true)).toBe(2);
    expect(dailyNumberOn(dateOfDaily(-1))).toBe(-1);
  });

  it("marks the sacrifice rows in the review block", () => {
    for (const table of [PUZZLE_SAMPLE, B]) {
      // Recomputed through the reducer: a par-line row that scores nothing
      // while the hand held every digit of the product.
      const ids = sequentialIds();
      let state = puzzleStart(table, ids);
      const expected: number[] = [];
      solvePuzzle(table).parLine.forEach((move, i) => {
        const product = String(table.rows[i].equation.product);
        const held = state.inventory.map((tile) => String(tile.digit));
        const spellable = [...product].every((d) => {
          const at = held.indexOf(d);
          return at >= 0 && held.splice(at, 1).length === 1;
        });
        const next = play(state, [move], ids);
        if (next.score === state.score && spellable) expected.push(i + 1);
        state = next;
      });
      const block = describeDaily(5, dateOfDaily(5), table);
      const marked = block
        .split("\n")
        .filter((line) => line.endsWith("SACRIFICE"))
        .map((line) => Number.parseInt(line, 10));
      expect(marked).toEqual(expected);
      expect(block).toContain(`par ${table.par}`);
    }
  });
});
