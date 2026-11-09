export interface LocalDate {
  year: number;
  month: number; // 1–12
  day: number;
}

/** Table #1's date. Ori sets it once at release (M16); changing it after launch renumbers every table. */
export const DAILY_LAUNCH_DATE: LocalDate = { year: 2026, month: 11, day: 9 };

/** Only the generator's freeze reads this (nothing freezes while false); previews number from the placeholder date. M16 sets the real DAILY_LAUNCH_DATE and flips this. */
export const DAILY_LAUNCHED = false;

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
