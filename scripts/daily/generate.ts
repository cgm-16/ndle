// Fills src/game/dailyTables.json with daily tables and writes the review file.
// Usage, from the repo root:
//   node scripts/run.mjs scripts/daily/generate.ts [--count 365] [--attempts 20000]
// The review file is committed, so it is public (docs/spec/product.md §1.2b).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { DAILY_LAUNCHED, dateOfDaily, localDateOf } from "../../src/game/daily";
import { describeDaily, fillDailySlots, frozenThroughOn } from "../../src/game/dailyPicker";
import type { PuzzleTable } from "../../src/game/types";

const TABLES = "src/game/dailyTables.json";
const VETOES = "scripts/daily/vetoes.json";
const REVIEW = "scripts/daily/review.md";

interface Veto { number: number; reason: string }
interface DoneVeto extends Veto { date: string }
interface Vetoes { pending: Veto[]; done: DoneVeto[] }

const args = process.argv.slice(3);
const flag = (name: string, fallback: number): number => {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(args[at + 1]);
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`--${name} needs a positive integer`);
  return value;
};

const existing: PuzzleTable[] = existsSync(TABLES) ? JSON.parse(readFileSync(TABLES, "utf8")) : [];
const vetoes: Vetoes = JSON.parse(readFileSync(VETOES, "utf8"));
const today = localDateOf(new Date());
const frozenThrough = frozenThroughOn(today, existing.length, DAILY_LAUNCHED);
const vetoed = new Set(vetoes.pending.map((veto) => veto.number));
for (const number of vetoed) {
  if (number > existing.length) throw new RangeError(`Veto #${number} is past the ${existing.length} existing tables`);
}

let plants = 0;
const started = Date.now();
const tables = fillDailySlots(existing, {
  count: flag("count", 365),
  frozenThrough,
  vetoed,
  random: Math.random,
  attemptsPerSlot: flag("attempts", 20000),
  onPlant: () => plants++,
});

writeFileSync(TABLES, `${JSON.stringify(tables)}\n`);
writeFileSync(
  REVIEW,
  tables.map((table, i) => describeDaily(i + 1, dateOfDaily(i + 1), table)).join("\n"),
);
const stamp = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
writeFileSync(
  VETOES,
  `${JSON.stringify({ pending: [], done: [...vetoes.done, ...vetoes.pending.map((veto) => ({ ...veto, date: stamp }))] }, null, 2)}\n`,
);

const replaced = vetoed.size;
console.log(
  `kept ${existing.length - replaced}, replaced ${replaced}, added ${tables.length - existing.length}; ` +
    `${plants} plants tried in ${((Date.now() - started) / 1000).toFixed(1)} s`,
);
