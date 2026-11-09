---
reads:
  - docs/spec/product.md  # §1.2b the daily list
  - docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md  # §2.2, §2.3
---

# T101 — Today's table number

```yaml
task_id: T101
title: Today's table number
milestone: M13 — Daily Tables
priority: P0
estimate: S
wave: W2
depends_on: [T100]
parallel_safe: false
paths:
  - src/game/daily.ts
  - src/game/daily.test.ts
```

## Why

"Today" is the player's local date, and tables are numbered from launch day,
which is #1. Two browsers on the same local date must get the same number,
whatever time of day it is and across DST. The generator needs the reverse
mapping, number to date, for the freeze rule. `DAILY_LAUNCHED` affects only the generator (T102); previews
still show Daily #N counting from the placeholder date.

## Interfaces

**Produces**, in `src/game/daily.ts`, which is pure and never calls
`new Date()` itself:

```ts
export interface LocalDate { year: number; month: number; day: number } // month 1–12
/** Table #1's date. Ori sets it once at release (M16); changing it after launch renumbers every table. */
export const DAILY_LAUNCH_DATE: LocalDate; // placeholder { year: 2026, month: 11, day: 9 } until M16
export const DAILY_LAUNCHED = false; // M16 sets the real DAILY_LAUNCH_DATE and flips this
export function localDateOf(now: Date): LocalDate;                 // getFullYear, getMonth() + 1, getDate()
export function daysFrom(from: LocalDate, to: LocalDate): number;  // via Date.UTC, so no DST hour leaks in
export function dailyNumberOn(date: LocalDate, launch?: LocalDate): number; // daysFrom(launch, date) + 1; ≤ 0 before launch
export function dateOfDaily(number: number, launch?: LocalDate): LocalDate;
```

Never divide local milliseconds by 86,400,000. A DST day is 23 or 25 hours
long.

## Steps

- [ ] **Tests** in `src/game/daily.test.ts`:
  - `it("numbers launch day 1, the next day 2 and the day before 0")`.
  - `it("gives one number to the whole local day")`:
    `new Date(2027, 2, 14, 0, 0, 1)` and `new Date(2027, 2, 14, 23, 59, 59)`
    give equal numbers.
  - `it("steps by one across a DST change")`:
    - set `process.env.TZ = "America/New_York"` for this test and restore it
      after;
    - `new Date(2027, 2, 14, 12)` and `new Date(2027, 2, 15, 12)` give numbers
      that differ by exactly 1;
    - do the same around `Europe/London`'s change on 2027-10-31.
  - `it("counts across year ends and leap days")`:
    - `daysFrom({2026,12,31}, {2027,1,1})` is 1;
    - `daysFrom({2028,2,28}, {2028,3,1})` is 2.
  - `it("maps numbers back to dates")`: for numbers 1–400,
    `dailyNumberOn(dateOfDaily(n))` is `n`.

  Run `npx vitest run src/game/daily.test.ts`. Expected: FAIL, the module is
  missing.
- [ ] **Implement** `src/game/daily.ts` to the signatures.
- [ ] **Run** the tests. Expected: PASS. If the DST test passes without
      setting `TZ`, check that it fails with `daysFrom` written as a
      millisecond division before you trust it.
- [ ] **Gates.**
- [ ] **Commit:** `feat(daily): number tables by local date`, with `Task: T101`.

## Acceptance gate

- The DST and whole-day tests are green.
- The DST test fails against a millisecond-division `daysFrom` (checked once,
  then reverted).
