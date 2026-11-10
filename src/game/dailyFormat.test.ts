import { describe, expect, it } from "vitest";
import { packTables, unpackTables } from "./dailyFormat";
import { PUZZLE_SAMPLE } from "../test/fixtures";

describe("dailyFormat", () => {
  it("round-trips a table through the compact format", () => {
    const table = PUZZLE_SAMPLE;
    const packed = packTables([table]);
    expect(packed[0].rows[0]).toEqual({ left: 3, right: 5, pay: [9, 5, 5] });
    expect(unpackTables(packed)).toEqual([table]);
  });
});
