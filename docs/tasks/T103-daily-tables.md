---
reads:
  - src/game/dailyPicker.ts
  - src/game/daily.ts
  - scripts/daily/generate.ts
  - tsconfig.app.json
---

# T103 — Generate and ship 365 tables

```yaml
task_id: T103
title: Generate and ship 365 tables
milestone: M13 — Daily Tables
priority: P0
estimate: M
wave: W2
depends_on: [T102]
parallel_safe: false
paths:
  - src/game/dailyTables.json
  - src/game/dailyTables.ts
  - src/game/dailyTables.test.ts
  - tsconfig.app.json
```

## Why

The design calls for a year of numbered tables, shipping with the game.
Launch doesn't wait for Ori to review all 365.

## Interfaces

**Produces:**

```ts
// src/game/dailyTables.json — compact; table #n is index n − 1; product = left × right
// [{ "hand": [1,4,5,7,9], "rows": [{ "left": 3, "right": 5, "pay": [9,5,5] }, …], "par": 7 }, …]

// src/game/dailyTables.ts
export const DAILY_TABLES: readonly PuzzleTable[];
export function dailyTable(number: number): PuzzleTable | undefined;        // 1-based
export function todaysDaily(now: Date, tables?: readonly PuzzleTable[]): // default DAILY_TABLES
  { number: number; table: PuzzleTable } | null;                       // null before launch or past the list
```

## Steps

- [ ] **Time it first.** Run a scratch script outside the repo through
      `scripts/run.mjs` that plants 1,000 tables with `Math.random` and
      counts the candidates. Record the milliseconds per plant and the
      candidate rate in the commit body.
      - If the projected full run (365 ÷ rate × ms per plant) is over 60
        minutes, stop and report it before going on.
- [ ] **Generate:** run
      `node scripts/run.mjs scripts/daily/generate.ts --count 365` in the
      background. Record the CLI's summary line.
- [ ] **Tests** in `dailyTables.test.ts`:
  - `it("ships 365 tables")`.
  - `it("every table is a daily candidate at its stored par")`. For each
    table:
    - five distinct digits and 8 rows;
    - each pay's length is `getRewardCount(getAnswerLength(equation))`;
    - `solvePuzzle(table).par === table.par`;
    - `isDailyCandidate(table)` is not `null`.
  - `it("has no repeated table")`.
  - `it("looks tables up by number")`:
    - `dailyTable(0)` and `dailyTable(366)` are `undefined`;
    - `dailyTable(1)` is `DAILY_TABLES[0]`.
  - `it("gives today's table by local date")`:
    - `todaysDaily` at noon on `DAILY_LAUNCH_DATE` returns number 1;
    - the day before gives `null`;
    - launch plus 365 days gives `null`.

  Record how long `npx vitest run src/game/dailyTables.test.ts` takes. If it
  is over 10 s, report that in the PR rather than weakening the test.
- [ ] **Implement** `dailyTables.ts`, and add `"resolveJsonModule": true` to
      `tsconfig.app.json` if `tsc` needs it.
- [ ] **Bundle check:** `npm run build`, then confirm that `dist/` contains the
      table data and none of `dailyPicker` or `generate`:
      `grep -l "describeDaily\|fillDailySlots" dist/assets/*.js` prints
      nothing.
- [ ] **Gates.**
- [ ] **Commit:** `feat(daily): ship a year of daily tables`, with
      `Task: T103` and the timing lines.
- [ ] **Open the PR** `[M13] Ship a year of daily tables`, with a `Closes #`
      line for each of T101–T103. Tell Ori that the review file is at
      `scripts/daily/out/review.md` locally.

## Acceptance gate

- `dailyTables.test.ts` is green.
- The bundle grep is empty.
