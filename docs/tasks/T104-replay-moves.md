---
reads:
  - src/game/gameReducer.ts
  - src/game/factories.ts  # createPuzzleStart
  - src/test/fixtures.ts  # play, PUZZLE_SAMPLE_PAR_LINE
  - docs/superpowers/plans/2026-11-09-ndle-core.md  # Review Focus 1–3
---

# T104 — Replay moves through the reducer

```yaml
task_id: T104
title: Replay moves through the reducer
milestone: M14 — Daily Resume
priority: P0
estimate: M
wave: W3
depends_on: [T103]
parallel_safe: false
paths:
  - src/game/replay.ts
  - src/game/replay.test.ts
  - src/test/fixtures.ts
```

## Why

A Daily resumes by replaying its saved moves through the real reducer. Given
its table the game is deterministic, so the replay rebuilds the exact state.
Two things depend on it. App dispatches the replay's own actions, so the
live state equals the replay. And tile IDs keep coming from the same factory.

## Interfaces

**Produces:**

```ts
// src/game/replay.ts
export interface Replay { state: GameState; actions: GameAction[] }
export function replayMoves(table: PuzzleTable, moves: readonly PuzzleMove[],
  nextTileId: TileIdFactory): Replay | null;
```

The rules:
1. It starts from `createPuzzleStart(table, nextTileId)`.
2. For each move:
   - Each `spend` digit selects the first tile in the hand with that digit.
   - Then `SUBMIT_CORRECT`, with `createTiles(row.pay, nextTileId)`, when
     `answerMatches`; otherwise `SUBMIT_INCORRECT`.
   - If the phase is now `overflow`:
     - with `discard` set, it toggles the first tile in the hand with that
       digit;
     - with no `discard`, this must be the last move, and the replay stops
       there.
   - A `discard` when the phase isn't `overflow` is a bad record.
   - After a complete move, `NEXT_ROUND`.
3. It returns `null` in three cases:
   - any dispatch returns the same object, because the reducer refused it;
   - the run is already over and moves remain;
   - a `discard` appears with no overflow.

`fixtures.ts`'s `play(state, line, ids)` becomes a call to `replayMoves`
wherever a full move list is played, so there's one implementation.

## Steps

- [ ] **Tests** in `replay.test.ts`, using `ids = sequentialIds()`:
  - `it("replays the sample's par line to Made par 7 / 8")`: the phase is
    `gameOver`, the score is 7, and `isParMade` holds.
  - `it("stops at the next row after a complete move")`: three moves give
    `answering`, round 4 and the hand `1 2 6 7 8`.
  - `it("stops in overflow when the last move has no discard")`. This is the
    par line with row 8's `discard` removed:
    - the phase is `overflow`;
    - the round is 8;
    - the hand holds six tiles;
    - the score is 7.
  - `it("rejects a move that spends a digit the hand lacks")`:
    `[{ spend: [3, 3] }]` gives `null`.
  - `it("rejects a discard with no overflow")`:
    `[{ spend: [5, 7], discard: 1 }]` gives `null`.
  - `it("rejects moves past the end of the run")`: the par line plus one
    more move gives `null`.
  - `it("lets live play continue after a replay")`:
    - replay three moves;
    - then, with the same `ids`, reduce row 4 live: select the 7, then
      `SUBMIT_CORRECT` with `createTiles([4, 4], ids)`;
    - the result is a new object with score 3.
  - `it("leaves the reducer at the replay's state when its actions are dispatched")`:
    reducing `actions` from `createTitleState()` deep-equals `state`.

  Run them. Expected: FAIL, the module is missing.
- [ ] **Implement** `replay.ts`, and point the fixtures' `play` at it.
- [ ] **Gates.**
- [ ] **Commit:** `feat(daily): replay saved moves through the reducer`, with
      `Task: T104`.

## Acceptance gate

- All eight tests are green.
- `play` has one implementation.
