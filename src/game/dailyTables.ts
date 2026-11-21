import { dailyNumberOn, localDateOf } from "./daily";
import { unpackTables, type CompactTable } from "./dailyFormat";
import compact from "./dailyTables.json";
import type { PuzzleTable } from "./types";

export const DAILY_TABLES: readonly PuzzleTable[] = unpackTables(compact as CompactTable[]);

/** Table #n is index n - 1. */
export function dailyTable(number: number): PuzzleTable | undefined {
  return DAILY_TABLES[number - 1];
}

/** null before launch or past the end of the list. */
export function todaysDaily(
  now: Date,
  tables: readonly PuzzleTable[] = DAILY_TABLES,
): { number: number; table: PuzzleTable } | null {
  const number = dailyNumberOn(localDateOf(now));
  const table = tables[number - 1];
  return table ? { number, table } : null;
}
