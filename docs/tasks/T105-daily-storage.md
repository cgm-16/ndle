---
reads:
  - src/i18n/storage.ts  # the existing storage pattern
  - docs/spec/ui-i18n.md  # §1.16
---

# T105 — Today's daily in storage

```yaml
task_id: T105
title: Today's daily in storage
milestone: M14 — Daily Resume
priority: P0
estimate: S
wave: W3
depends_on: [T104]
parallel_safe: false
paths:
  - src/services/dailyStorage.ts
  - src/services/dailyStorage.test.ts
```

## Why

The device holds today's daily: its table number, the moves made so far and
the outcome once it ends (design §2.5). Nothing else is stored. Storage can
be missing, full, blocked or edited by hand, and none of those may crash the
game.

## Interfaces

**Produces:**

```ts
// src/services/dailyStorage.ts
export const DAILY_STORAGE_KEY = "ndle.daily";
export interface DailyOutcome { score: number; par: number; longestStreak: number }
export interface DailyRecord { version: 1; number: number; moves: PuzzleMove[]; outcome: DailyOutcome | null }
export interface DailyStore { load(): DailyRecord | null; save(record: DailyRecord): void }
export function createDailyStore(storage: Pick<Storage, "getItem" | "setItem"> | null): DailyStore;
```

- **`load`** returns `null` when:
  - storage is `null`, or `getItem` throws;
  - the JSON is invalid;
  - `version !== 1`, or `number` is not a positive integer;
  - a move's `spend` is not one or two digits from 0 to 9, or its `discard`
    is not a digit;
  - `outcome` is neither `null` nor three non-negative integers.
- **`save`** writes the record as JSON and swallows `setItem` errors (quota,
  private mode). There is a single record, which each save overwrites.

## Steps

- [ ] **Tests** in `dailyStorage.test.ts`, with an in-memory `Storage` stub:
  - `it("round-trips a record")`.
  - `it("writes only version, number, moves and outcome under ndle.daily")`.
  - `it.each` over `"{"`, `'{"version":2}'`,
    `'{"version":1,"number":0,"moves":[],"outcome":null}'`, a move with digit
    `12`, a `spend` of three digits, and `outcome: {"score":-1}`: each one
    gives `null` from `load`.
  - `it("works without storage")`: `createDailyStore(null)`; `load()` is
    `null` and `save()` doesn't throw.
  - `it("survives a throwing storage")`: `getItem` and `setItem` both throw;
    `load()` is `null` and `save()` doesn't throw.

  Run them. Expected: FAIL, the module is missing.
- [ ] **Implement** `dailyStorage.ts`.
- [ ] **Gates.**
- [ ] **Commit:** `feat(daily): store today's daily on the device`, with
      `Task: T105`.
- [ ] **Open the PR** `[M14] Resume a Daily from its moves`, with a
      `Closes #` line for each of T104–T105.

## Acceptance gate

- Every malformed record loads as `null` without an exception.
