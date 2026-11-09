---
reads:
  - src/main.tsx
  - src/game/playtestTables.ts
  - src/app/App.tsx  # AppDependencies
---

# T95 — Remove the playtest set

```yaml
task_id: T95
title: Remove the playtest set
milestone: M12 — Puzzle Only
priority: P0
estimate: XS
wave: W1
depends_on: [T94]
parallel_safe: false
paths:
  - src/game/playtestTables.ts
  - src/game/playtestTables.test.ts
  - src/main.tsx
```

## Why

The fixed set is M8's preview-only exception (journal 2026-10-19): a
replayable run on a public URL. 9dle has a real daily list instead.

## Steps

- [ ] **Branch:** cut `feat/M12-puzzle-only` from `main` after M11 merges.
- [ ] **Delete** `src/game/playtestTables.ts` and its test.
- [ ] **`src/main.tsx`:** drop the `playtestTables` import and the wrapper.
      `dealPuzzle` becomes `() => dealPuzzle(Math.random)`.
- [ ] **Check:** `grep -rn "playtest" src e2e` prints nothing.
- [ ] **Gates:** lint, typecheck, `npx vitest run --reporter=default`,
      `npm run test:e2e` and build, all green. Nothing tested the set except
      its own test, so a green suite shows that nothing else depended on it.
- [ ] **Commit:** `chore(puzzle): drop the preview's fixed playtest set`,
      with `Task: T95`.

## Acceptance gate

- `npm test` and `npm run test:e2e` are green with the set gone.
