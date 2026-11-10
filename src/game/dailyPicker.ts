// Offline only: picks the daily tables. Nothing that main.tsx reaches may
// import this file; scripts/daily/generate.ts runs it and the list is committed.
import { dailyNumberOn, type LocalDate } from "./daily";
import { isInBand, plantTable, solvePuzzle } from "./puzzle";
import type { Digit, PuzzleDeal, PuzzleMove, PuzzleTable, RandomSource } from "./types";

/** A table in the band whose par needs a sacrifice, priced; otherwise null. */
export function isDailyCandidate(deal: PuzzleDeal): PuzzleTable | null {
  const solution = solvePuzzle(deal);
  if (!solution.sacrificeRequired || !isInBand(deal, solution)) return null;
  return { hand: deal.hand, rows: deal.rows, par: solution.par };
}

// Plants until one passes `accept`, for at most `attempts` plants.
function plantWhere(
  random: RandomSource,
  attempts: number,
  accept: (table: PuzzleTable) => boolean,
  onPlant?: () => void,
): PuzzleTable | null {
  for (let attempt = 0; attempt < attempts; attempt++) {
    onPlant?.();
    const table = isDailyCandidate(plantTable(random));
    if (table && accept(table)) return table;
  }
  return null;
}

export function plantDailyTable(random: RandomSource, attempts: number): PuzzleTable | null {
  return plantWhere(random, attempts, () => true);
}

export interface FillOptions {
  count: number;
  frozenThrough: number;
  vetoed: ReadonlySet<number>;
  random: RandomSource;
  attemptsPerSlot: number;
  /** Called once per plant tried. */
  onPlant?: () => void;
}

const tableKey = ({ hand, rows }: PuzzleTable): string => JSON.stringify([hand, rows]);

/** Table #n is index n - 1. Slots up to `frozenThrough` never change. */
export function fillDailySlots(existing: readonly PuzzleTable[], options: FillOptions): PuzzleTable[] {
  const { count, frozenThrough, vetoed, random, attemptsPerSlot, onPlant } = options;
  if (existing.length < frozenThrough) {
    throw new RangeError(`Only ${existing.length} slots exist, fewer than the ${frozenThrough} frozen`);
  }
  for (const number of vetoed) {
    if (number <= frozenThrough) throw new RangeError(`Table #${number} is frozen and cannot be vetoed`);
  }

  const slots: (PuzzleTable | null)[] = existing.map((table, i) => (vetoed.has(i + 1) ? null : table));
  while (slots.length < count) slots.push(null);
  // Vetoed tables stay seen, so a veto is never undone by redrawing the table.
  const seen = new Set(existing.map(tableKey));

  return slots.map((slot, i) => {
    if (slot) return slot;
    const table = plantWhere(random, attemptsPerSlot, (t) => !seen.has(tableKey(t)), onPlant);
    if (!table) throw new RangeError(`No candidate for table #${i + 1} in ${attemptsPerSlot} plants`);
    seen.add(tableKey(table));
    return table;
  });
}

export function frozenThroughOn(today: LocalDate, existingLength: number, launched: boolean): number {
  return launched ? Math.min(existingLength, Math.max(0, dailyNumberOn(today) + 2)) : 0;
}

// The par-line rows that miss although the hand held every digit of the
// product. The hand is replayed as digit counts, as the solver searches it.
function sacrificeRows(table: PuzzleTable, parLine: readonly PuzzleMove[]): Set<number> {
  const held = Array<number>(10).fill(0);
  for (const digit of table.hand) held[digit]++;
  const sacrifices = new Set<number>();
  parLine.forEach((move, i) => {
    const { pay, equation } = table.rows[i];
    const product = [...String(equation.product)].map(Number) as Digit[];
    const correct = move.spend.join() === product.join();
    const need = Array<number>(10).fill(0);
    for (const digit of product) need[digit]++;
    if (!correct && need.every((n, digit) => held[digit] >= n)) sacrifices.add(i);
    for (const digit of move.spend) held[digit]--;
    if (correct) for (const digit of pay) held[digit]++;
    if (move.discard !== undefined) held[move.discard]--;
  });
  return sacrifices;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** One review-file block: the table, its par line, and the sacrifice rows. */
export function describeDaily(number: number, date: LocalDate, table: PuzzleTable): string {
  const { parLine } = solvePuzzle(table);
  const sacrifices = sacrificeRows(table, parLine);
  const lines = table.rows.map(({ equation, pay }, i) => {
    const { left, right, product } = equation;
    const move = parLine[i];
    const played = move ? ` plays ${move.spend.join(" ")}` : " (run over)";
    return `${i + 1}. ${left} × ${right} = ${product}  pays ${pay.join(" ")}${played}${sacrifices.has(i) ? "  SACRIFICE" : ""}`;
  });
  return [
    `### #${number} ${date.year}-${pad(date.month)}-${pad(date.day)} par ${table.par}`,
    `Hand ${table.hand.join(" ")}`,
    ...lines,
    "",
  ].join("\n");
}
