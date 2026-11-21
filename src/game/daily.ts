export interface LocalDate {
  year: number;
  month: number; // 1–12
  day: number;
}

/** Table #1's date. Set once; changing it renumbers every table and breaks saved and shared numbers. */
export const DAILY_LAUNCH_DATE: LocalDate = { year: 2026, month: 11, day: 23 };

/** The generator freezes slots through today + 2. */
export const DAILY_LAUNCHED = true;

const MS_PER_DAY = 86_400_000;

const utcMs = ({ year, month, day }: LocalDate) =>
  Date.UTC(year, month - 1, day);

export function localDateOf(now: Date): LocalDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

// Date.UTC has no DST, so every day is exactly 86,400,000 ms here.
export function daysFrom(from: LocalDate, to: LocalDate): number {
  return Math.round((utcMs(to) - utcMs(from)) / MS_PER_DAY);
}

export function dailyNumberOn(
  date: LocalDate,
  launch: LocalDate = DAILY_LAUNCH_DATE,
): number {
  return daysFrom(launch, date) + 1;
}

export function dateOfDaily(
  number: number,
  launch: LocalDate = DAILY_LAUNCH_DATE,
): LocalDate {
  const d = new Date(utcMs(launch) + (number - 1) * MS_PER_DAY);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}
