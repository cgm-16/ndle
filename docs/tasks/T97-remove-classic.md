---
reads:
  - src/game/selectors.ts  # getCapacity, isAtClassicFloor, isClassicWin, getOverflowCount
  - src/game/balance.ts
  - src/components/TileInventory/TileInventory.tsx
  - src/components/GameOverScreen/GameOverScreen.tsx
  - src/components/TitleScreen/TitleScreen.tsx
  - src/styles/tokens/keyframes.css
  - e2e/viewport.spec.ts
---

# T97 — Remove Classic

```yaml
task_id: T97
title: Remove Classic
milestone: M12 — Puzzle Only
priority: P0
estimate: M
wave: W1
depends_on: [T96]
parallel_safe: false
paths:
  - src/game/
  - src/components/TileInventory/
  - src/components/GameOverScreen/
  - src/components/GameScreen/
  - src/components/TitleScreen/
  - src/services/sharing.ts
  - src/i18n/messages.ts
  - src/styles/tokens/keyframes.css
  - src/styles/tokens/motion.css
  - src/gallery/
  - e2e/viewport.spec.ts
```

## Why

Classic's descending capacity, stepped rack, seals and win exist only for
Classic. Removing them leaves Endless and Puzzle, which share capacity rules
except for the size.

## Interfaces

**Produces:**
- `GameMode = "endless" | "puzzle"`;
- `getCapacity(state)` returns `INVENTORY_CAPACITY` for Endless and
  `PUZZLE_CAPACITY` for Puzzle;
- `isRunComplete(state)` is `state.mode === "puzzle" && state.totalRounds >= state.table!.rows.length`.

Deleted:
- `isAtClassicFloor`, `isClassicWin`;
- `CLASSIC_START_CAPACITY`, `CLASSIC_FLOOR`, `CLASSIC_SEAL_EVERY`;
- `rackTier.ts`;
- the `stepped` and `drawnCapacity` props of `TileInventory`, its re-seat
  effect and its seals;
- the final hand and Run Complete in `GameOverScreen`;
- the `"classic"` title topic and its mode option;
- the keyframes `oz-seal`, `oz-seal-rim` and `oz-reseat`, and the tokens
  `--dur-seal` and `--dur-reseat`;
- the message keys for Classic: `mode.classic`, `mode.classicHint`,
  `howToPlay.classic`, `gameOver.winTitle`, `gameOver.winReason` and
  `gameOver.finalHand`.

**Keep:** the rail and the one-tile discard in `TileInventory` (Puzzle's
overflow), and `GameScreen`'s auto-advance after a discard.

## Steps

- [ ] **Tests first.** In `selectors.test.ts`, `getCapacity` asserts
      `INVENTORY_CAPACITY` for Endless and `5` for Puzzle. Delete the Classic
      describe blocks in:
  - `selectors.test.ts`, `gameReducer.test.ts` and `sharing.test.ts`;
  - `TileInventory.test.tsx`, `GameOverScreen.test.tsx`,
    `GameScreen.test.tsx` and `TitleScreen.test.tsx`;
  - `keyframes.test.ts`'s Classic names;
  - `gallery/states.test.tsx`.

  Run them, and expect the `getCapacity` test to fail while the Classic
  branch exists.
- [ ] **Code:** as in Interfaces.
  - `OverflowControls` keeps the singular message only, because Puzzle's
    excess is always 1 (`createSearch` throws otherwise).
  - `getOverflowCount` stays generic until T99.
- [ ] **Gallery:** delete:
  - `answering-classic`, `-15` and `-10`;
  - `overflow-required-2` and `overflow-marked` (only reachable at an
    excess of 2);
  - `game-over-classic-win`.

  Update `STATE_COUNT`, and delete `viewport.spec.ts`'s Classic-rack test.
- [ ] **Check:** `grep -rniE "classic" src e2e` prints nothing.
- [ ] **Gates:** all five green.
- [ ] **Commit:** `refactor(modes): remove Classic`, with `Task: T97`.

## Acceptance gate

- `TitleScreen` offers two modes.
- `keyframes.test.ts` passes without the three Classic names.
- `npm run test:e2e` is green.
