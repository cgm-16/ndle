import { afterEach, describe, expect, it } from "vitest";
import {
  DAILY_LAUNCH_DATE,
  dailyNumberOn,
  dateOfDaily,
  daysFrom,
  localDateOf,
} from "./daily";

const originalTz = process.env.TZ;

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const numberOn = (now: Date) => dailyNumberOn(localDateOf(now));

describe("daily table number", () => {
  it("numbers launch day 1, the next day 2 and the day before 0", () => {
    const { year, month, day } = DAILY_LAUNCH_DATE;
    expect(dailyNumberOn(DAILY_LAUNCH_DATE)).toBe(1);
    expect(dailyNumberOn({ year, month, day: day + 1 })).toBe(2);
    expect(dailyNumberOn({ year, month, day: day - 1 })).toBe(0);
  });

  it("gives one number to the whole local day", () => {
    expect(numberOn(new Date(2027, 2, 14, 0, 0, 1))).toBe(
      numberOn(new Date(2027, 2, 14, 23, 59, 59)),
    );
  });

  it("steps by one across a DST change", () => {
    process.env.TZ = "America/New_York";
    expect(numberOn(new Date(2027, 2, 15, 12))).toBe(
      numberOn(new Date(2027, 2, 14, 12)) + 1,
    );
    process.env.TZ = "Europe/London";
    expect(numberOn(new Date(2027, 9, 31, 12))).toBe(
      numberOn(new Date(2027, 9, 30, 12)) + 1,
    );
    expect(numberOn(new Date(2027, 10, 1, 12))).toBe(
      numberOn(new Date(2027, 9, 31, 12)) + 1,
    );
  });

  it("counts across year ends and leap days", () => {
    expect(
      daysFrom({ year: 2026, month: 12, day: 31 }, { year: 2027, month: 1, day: 1 }),
    ).toBe(1);
    expect(
      daysFrom({ year: 2028, month: 2, day: 28 }, { year: 2028, month: 3, day: 1 }),
    ).toBe(2);
  });

  it("maps numbers back to dates", () => {
    for (let n = 1; n <= 400; n++) {
      expect(dailyNumberOn(dateOfDaily(n))).toBe(n);
    }
  });
});
