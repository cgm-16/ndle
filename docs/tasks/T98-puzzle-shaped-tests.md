---
reads:
  - src/test/fixtures.ts  # makeAnsweringState, makeFeedbackState, makeOverflowState, makeGameOverState
  - src/game/factories.ts  # createTitleState
  - src/app/App.test.tsx
  - src/gallery/states.tsx
  - e2e/accessibility.spec.ts
  - e2e/viewport.spec.ts
  - e2e/puzzle-fit.spec.ts
---

# T98 — The suite plays Puzzle

```yaml
task_id: T98
title: The suite plays Puzzle
milestone: M12 — Puzzle Only
priority: P0
estimate: L
wave: W1
depends_on: [T97]
parallel_safe: false
paths:
  - src/test/fixtures.ts
  - src/game/factories.ts
  - src/components/TitleScreen/TitleScreen.tsx
  - src/**/*.test.ts
  - src/**/*.test.tsx
  - src/gallery/
  - e2e/
```

## Why

Every test or gallery state that names no mode is an Endless test.
`createTitleState` sets `mode: "endless"`, and the fixtures deal ten tiles at
capacity 10. Deleting Endless first would delete most of the suite's
coverage of selection, submission, feedback, overflow and game over.

So this task moves that coverage onto Puzzle while Endless still exists, and
T99 then deletes Endless against a suite that no longer leans on it.

## Interfaces

**Produces**, in `src/test/fixtures.ts`:
- `makeAnsweringState(overrides?)` returns `PUZZLE_SAMPLE` at row 1:
  - `mode: "puzzle"`, with `table: PUZZLE_SAMPLE` and `rowResults: []`;
  - the hand `1 4 5 7 9` from `createTiles(PUZZLE_SAMPLE.hand, sequentialIds())`;
  - row 1's equation.
- `makeFeedbackState(overrides?)` is that state after row 1's par-line move,
  5 and 7 for 3 × 5: an incorrect answer, leaving the hand `1 4 9`.
- `makeOverflowState(overrides?)` is the par line through row 3, then row
  4's correct `7`:
  - six tiles, with `4` on the rail;
  - `phase: "overflow"`.
- `makeGameOverState(overrides?)` is the full par line: `phase: "gameOver"`,
  score 7, longest streak 7.
- `makeOverflowInventory` is deleted. The overflow state above replaces it.

These states are built by playing the reducer, through the test helper
`play()` that `gameReducer.test.ts` already has, moved into `fixtures.ts`.
They are never hand-assembled.

`createTitleState()` sets `mode: "puzzle"`, so Start Run deals Puzzle by
default.

## Steps

- [ ] **Fixtures first:** move `play`, `puzzleStart` and `tileWith` from
      `gameReducer.test.ts` into `fixtures.ts` and export them. Then rebuild
      the four state factories as above. Run
      `npx vitest run`, and record the tests that now fail because they
      assumed ten tiles.
- [ ] **Rebase or delete each failing test.**
  - A test of behaviour Puzzle shares is rebased onto the Puzzle fixtures.
    That covers selection, return, clear, submitting correct and incorrect,
    the one-tile discard, feedback, the keyboard, the HUD, game over, share
    and copy, and language.
  - A test of Endless-only behaviour is deleted. That covers capacity 10,
    random rewards, `KIND_EQUATION_RATE` and the 5 × 2 rack.
  - Keep one Endless smoke test, "starts an Endless run", until T99.
- [ ] **Gallery:** rebase these states onto the Puzzle fixtures:
  - `answering-empty`, `-partial`, `-full` and `-depleted`;
  - the `feedback-*` states;
  - `overflow-required-1`;
  - the `game-over-*` states.
- [ ] **e2e:**
  - `accessibility.spec.ts` and `viewport.spec.ts` press Start Run and get
    Puzzle. Tune their counts to five tiles (the `> 10` checks become
    `>= 5`).
  - The overflow test reads the gallery state `overflow-required-1`, not a
    live deal.
  - `puzzle-fit.spec.ts` no longer clicks a mode button.
- [ ] **Gates:** all five green. Read the Vitest output in full: no warning,
      and no `act()` notice.
- [ ] **Commit:** `test(puzzle): the suite plays Puzzle's sample table`,
      with `Task: T98`.

## Acceptance gate

- `grep -rn "INVENTORY_CAPACITY\|createInitialInventory" src --include='*.test.ts' --include='*.test.tsx'`
  shows only the Endless smoke test.
- The gallery has no Endless state.
- `npm run test:e2e` is green.
