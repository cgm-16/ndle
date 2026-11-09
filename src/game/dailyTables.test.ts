import { describe, expect, it } from "vitest";
import { DAILY_LAUNCH_DATE, dateOfDaily } from "./daily";
import { isDailyCandidate } from "./dailyPicker";
import { DAILY_TABLES, dailyTable, todaysDaily } from "./dailyTables";
import { solvePuzzle } from "./puzzle";
import { getAnswerLength, getRewardCount } from "./selectors";

const noonOn = ({ year, month, day }: { year: number; month: number; day: number }) =>
  new Date(year, month - 1, day, 12);

describe("dailyTables", () => {
  it("ships 365 tables", () => {
    expect(DAILY_TABLES).toHaveLength(365);
  });

  it("every table is a daily candidate at its stored par", () => {
    for (const table of DAILY_TABLES) {
      expect(new Set(table.hand).size).toBe(5);
      expect(table.rows).toHaveLength(8);
      for (const { equation, pay } of table.rows) {
        expect(pay).toHaveLength(getRewardCount(getAnswerLength(equation)));
      }
      expect(solvePuzzle(table).par).toBe(table.par);
      expect(isDailyCandidate(table)).not.toBeNull();
    }
  });

  it("has no repeated table", () => {
    const keys = DAILY_TABLES.map(({ hand, rows }) => JSON.stringify([hand, rows]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("looks tables up by number", () => {
    expect(dailyTable(0)).toBeUndefined();
    expect(dailyTable(366)).toBeUndefined();
    expect(dailyTable(1)).toBe(DAILY_TABLES[0]);
  });

  it("gives today's table by local date", () => {
    expect(todaysDaily(noonOn(DAILY_LAUNCH_DATE))?.number).toBe(1);
    expect(todaysDaily(noonOn(dateOfDaily(0)))).toBeNull();
    expect(todaysDaily(noonOn(dateOfDaily(366)))).toBeNull();
    expect(todaysDaily(noonOn(dateOfDaily(365)))?.number).toBe(365);
  });
});
