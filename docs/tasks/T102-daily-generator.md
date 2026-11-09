---
reads:
  - docs/spec/product.md  # §1.2b
  - src/game/puzzle.ts  # createSearch, solvePuzzle, dealPuzzle
  - src/game/puzzle.test.ts
  - src/game/daily.ts
  - src/test/fixtures.ts  # seededRandom, PUZZLE_SAMPLE, play
  - docs/research/game-modes/_runner/run.mjs
  - tsconfig.node.json
---

# T102 — Daily table picker and generator

```yaml
task_id: T102
title: Daily table picker and generator
milestone: M13 — Daily Tables
priority: P0
estimate: M
wave: W2
depends_on: [T101]
parallel_safe: false
paths:
  - src/game/types.ts
  - src/game/puzzle.ts
  - src/game/puzzle.test.ts
  - src/game/dailyPicker.ts
  - src/game/dailyPicker.test.ts
  - src/test/fixtures.ts
  - scripts/run.mjs
  - scripts/daily/generate.ts
  - scripts/daily/vetoes.json
  - scripts/daily/review.md
  - tsconfig.node.json
```

## Why

Each daily table is in M8's band and needs a sacrifice. Only about 1 accepted
table in 140 does, so the tables are found offline.

The picker's logic lives in `src/game/`, where Vitest and `tsc` check it, and
takes an injected `RandomSource`. Only the CLI lives in `scripts/`. Nothing
that `main.tsx` reaches imports either of them.

## Interfaces

**Produces:**

```ts
// src/game/types.ts (moved from src/test/fixtures.ts, which re-exports it)
export interface PuzzleMove { spend: Digit[]; discard?: Digit }

// src/game/puzzle.ts
export interface PuzzleSolution { par: number; onlyMoves: number; sacrificeRequired: boolean;
  /** The canonical par line: the first optimal option at every decision. */
  parLine: PuzzleMove[] }
export function isInBand(deal: PuzzleDeal, solution: PuzzleSolution): boolean; // dealPuzzle now calls it

// src/game/dailyPicker.ts — offline only
export function isDailyCandidate(deal: PuzzleDeal): PuzzleTable | null; // in band and sacrificeRequired, priced
export function plantDailyTable(random: RandomSource, attempts: number): PuzzleTable | null;
export interface FillOptions { count: number; frozenThrough: number; vetoed: ReadonlySet<number>;
  random: RandomSource; attemptsPerSlot: number }
export function fillDailySlots(existing: readonly PuzzleTable[], options: FillOptions): PuzzleTable[];
export function frozenThroughOn(today: LocalDate, existingLength: number, launched: boolean): number;
// launched ? min(existingLength, max(0, dailyNumberOn(today) + 2)) : 0
export function describeDaily(number: number, date: LocalDate, table: PuzzleTable): string; // one review-file block
```

`fillDailySlots` (table #n is index n − 1):
- keeps every slot up to `frozenThrough` untouched;
- replaces each vetoed slot above it;
- keeps every other existing slot;
- appends slots until `count`;
- never adds a table equal to one already in the list.

It throws a `RangeError` in three cases: a vetoed number at or below
`frozenThrough`; `existing.length < frozenThrough`; or a slot with no
candidate after `attemptsPerSlot` plants.

**The CLI,** `scripts/daily/generate.ts`, is run with
`node scripts/run.mjs scripts/daily/generate.ts [--count 365] [--attempts 20000]`.
- **It reads:**
  - `src/game/dailyTables.json`, where a missing file means `[]`;
  - `scripts/daily/vetoes.json`, shaped
    `{ "pending": [{ "number": 12, "reason": "…" }], "done": [] }`.
- **It sets** `frozenThrough` to
  `frozenThroughOn(localDateOf(new Date()), existing.length, DAILY_LAUNCHED)`.
- **It uses `Math.random`.** No seeded PRNG is needed, because the list
  itself is committed.
- **It writes:**
  - `dailyTables.json` in the T103 format;
  - `scripts/daily/review.md`, one `describeDaily` block per table. It is
    committed, so it is public: a known limit (`docs/spec/product.md`
    §1.2b; Ori, 2026-11-09);
  - `vetoes.json`, moving the pending vetoes it handled into `done`, each with
    the run's date.
- **It prints** the slots kept, replaced and added, the plants tried and the
  elapsed time.

`scripts/run.mjs` is a copy of `docs/research/game-modes/_runner/run.mjs`,
with `root` set to the repo root.

## Steps

- [ ] **Tests** in `puzzle.test.ts`:
  - `it("returns a par line that replays to par")`. For `PUZZLE_SAMPLE` and
    for the plants `seededRandom(1..20)`,
    `play(puzzleStart(table, ids), solvePuzzle(table).parLine, ids).score`
    equals `par`, with `ids = sequentialIds()`.
  - The existing `dealPuzzle` tests stay green unchanged.
- [ ] **Tests** in `dailyPicker.test.ts`:
  - `it("accepts the sample as a daily candidate")`:
    `isDailyCandidate(PUZZLE_SAMPLE)` has `par` 7.
  - `it("returns null when no plant qualifies within the bound")`:
    - inside the test, find the first seed `s` in 1–50 whose first
      `plantTable` is not a candidate;
    - `plantDailyTable(seededRandom(s), 1)` is `null`.
  - `it("keeps frozen slots and replaces a vetoed future slot")`:
    - `existing` is `[PUZZLE_SAMPLE, B]`, where `B` is the result of
      `plantDailyTable(seededRandom(7), 5000)`;
    - with `frozenThrough: 1`, `vetoed: {2}` and `count: 2`, slot 1 is
      `PUZZLE_SAMPLE` and slot 2 is a candidate not equal to `B`.
  - `it("refuses to veto a frozen slot")`: `vetoed: {1}` with
    `frozenThrough: 1` throws `RangeError`.
  - `it("appends candidates up to count and never repeats a table")`.
  - `it("freezes nothing before launch")`: `launched: false` gives 0 for any
    date.
  - `it("freezes through two days past today after launch")`: with
    `launched: true` and 365 slots, on the launch date (#1) it gives 3, two
    days before the launch date it gives 1, and three days before it gives 0.
    With only 2 slots, on the launch date it gives 2.
  - `it("marks the sacrifice rows in the review block")`. The rows marked
    sacrifice are exactly the par-line misses whose product the hand could
    spell, recomputed in the test.

  Keep `count` at 3 or below, so the file runs in under 10 s. Record the time.
- [ ] **Implement:**
  - `parLine` inside the existing par-line walk in `solvePuzzle`;
  - `isInBand`;
  - `dailyPicker.ts`;
  - the CLI and `scripts/run.mjs`.

  Add `"scripts"` to `tsconfig.node.json`'s `include`.
- [ ] **Smoke:** run `node scripts/run.mjs scripts/daily/generate.ts --count 2`
      and check that the json and review file appear. Delete both
      afterwards, because T103 makes the real ones.
- [ ] **Gates.** `npm run typecheck` now covers `scripts/`.
- [ ] **Commit:** `feat(daily): offline picker and generator for daily tables`,
      with `Task: T102`.

## Acceptance gate

- The picker tests are green.
- `tsc -b` type-checks `scripts/daily/generate.ts`.
- After the smoke run, `git status` shows neither `src/game/dailyTables.json`
  nor `scripts/daily/review.md`.
