---
reads:
  - src/app/App.tsx
  - src/game/replay.ts
  - src/services/dailyStorage.ts
  - src/game/dailyTables.ts
  - docs/superpowers/plans/2026-11-09-ndle-core.md  # Review Focus 1, 4, 5
---

# T107 — The Daily: one attempt, saved and resumed

```yaml
task_id: T107
title: "The Daily: one attempt, saved and resumed"
milestone: M15 — Daily and Practice
priority: P0
estimate: M
wave: W4
depends_on: [T106]
parallel_safe: false
paths:
  - src/app/App.tsx
  - src/app/App.test.tsx
```

## Why

- A Daily is the same table for everyone and gets one attempt.
- A reload resumes it, and there is no way to start the day over.
- Once finished, it shows its result until the next table.

## Decisions

- **Opening Daily** (`onDaily`):
  - Look up `today = todaysDaily(now(), dailyTables)` and
    `record = dailyStore.load()`.
  - If `record?.number === today.number` and
    `replayMoves(today.table, record.moves, nextTileId)` succeeds, dispatch
    the replay's `actions` in order.
  - Otherwise, dispatch `createPuzzleStart(today.table, nextTileId)` and save
    `{ version: 1, number, moves: [], outcome: null }`. A failed replay of
    today's record is a corrupt record: it starts fresh and overwrites.
  - Set `play = { kind: "daily", number }`.
- **Recording** happens only in event context, never in effects or the
  reducer:
  - `onSubmit`, which both the button and the keyboard call, appends
    `{ spend: selectedTiles.map((t) => t.digit) }` and saves.
  - A discard is recorded in a wrapper around `dispatch` that App passes to
    `GameScreen`. When the action is `TOGGLE_DISCARD` in `overflow`, it sets
    the last move's `discard` to that tile's digit, saves, and then
    dispatches. `TileInventory` clicks and `useGameKeyboard`'s digit keys
    both dispatch that action directly, so both are covered.
- **Outcome:**
  - An effect on `phase === "gameOver"` while `play.kind === "daily"` saves
    `outcome = { score, par, longestStreak }`.
  - The write is idempotent, so the effect running twice under StrictMode is
    harmless.
- **The run keeps its number** if the clock passes midnight mid-run. The next
  opening after midnight gets the new table.
- **No restart path:** in Daily, the game-over `R` listener is off and
  `RESTART_RUN` is never dispatched. Play Again's absence from the screen is
  T108's.

## Steps

- [ ] **Tests** in `App.test.tsx`, under `<StrictMode>`, with injected `now`,
      an in-memory store and `dailyTables: [PUZZLE_SAMPLE]` (T106's
      dependency, with no module mock):
  - `it("starts today's table from the title and saves an empty record")`.
  - `it("saves each move once under StrictMode")`. Play the par line's first
    three moves; the stored `moves` equal `PUZZLE_SAMPLE_PAR_LINE.slice(0, 3)`.
  - `it("resumes mid-table after a remount")`:
    - unmount, then render a new App over the same store;
    - press Daily: row 4 is current and the hand is `1 2 6 7 8`;
    - answering row 4 correctly scores, which pins Review Focus 1.
  - `it("records a Daily played by keyboard alone")`. Play the par line's
    first four moves using only keys, including row 4's discard by digit; the
    stored `moves` equal `PUZZLE_SAMPLE_PAR_LINE.slice(0, 4)`.
  - `it("resumes into the discard after a reload between submit and discard")`.
  - `it("shows the result after a finished Daily, and the next table the next day")`:
    - finish the par line, remount, and press `Today's result #1`: the game
      over shows;
    - move `now` a day on: the title shows `No table today`, because the
      stub holds one table.
  - `it("cannot restart a Daily")`. At the Daily game over:
    - pressing `R` changes nothing;
    - `dealPuzzle` was never called;
    - there is no button named Play Again.
  - `it("ignores a corrupt record and starts fresh")`.
  - `it("keeps the run's number when the clock passes midnight")`.
  - `it("stores only the language and today's daily")`. After a full Daily
    with the real jsdom `localStorage`, `Object.keys(localStorage)` is a
    subset of `["ndle.language", "ndle.daily"]`.

  Record the failures.
- [ ] **Implement** per Decisions.
- [ ] **Gates.**
- [ ] **Commit:** `feat(daily): one attempt per day, resumed on reload`, with
      `Task: T107`.

## Acceptance gate

- All ten tests are green under StrictMode.
- The Vitest output shows no `act()` warning.
