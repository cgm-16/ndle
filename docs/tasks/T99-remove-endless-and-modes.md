---
reads:
  - src/game/types.ts  # GameMode, GameState, GameAction
  - src/game/gameReducer.ts  # freshRunState
  - src/game/selectors.ts
  - src/game/generators.ts
  - src/game/balance.ts
  - src/app/App.tsx  # AppDependencies, startState
  - src/services/sharing.ts  # ShareStats
---

# T99 — Remove Endless and the mode axis

```yaml
task_id: T99
title: Remove Endless and the mode axis
milestone: M12 — Puzzle Only
priority: P0
estimate: L
wave: W1
depends_on: [T98]
parallel_safe: false
paths:
  - src/game/
  - src/app/
  - src/main.tsx
  - src/components/
  - src/services/sharing.ts
  - src/i18n/messages.ts
  - src/gallery/
  - src/test/
  - src/styles/tokens/spacing.css
```

## Why

With Endless gone, the mode is a single value, so every `mode` branch is
dead and the table is never optional. Removing the axis makes the table
required in the types, so the compiler checks what `table!` assertions only
assumed.

## Interfaces

**Produces:**

```ts
// src/game/types.ts
export type GamePhase = "title" | "answering" | "feedback" | "overflow" | "gameOver";
export interface GameState {
  phase: GamePhase;
  table: PuzzleTable | null;          // null only in "title"
  equation: Equation | null;
  inventory: Tile[];
  selectedTiles: Tile[];
  pendingDiscards: string[];
  score: number; round: number; totalRounds: number;
  currentStreak: number; longestStreak: number;
  lastResult: RoundResult | null;
  rowResults: RoundResult["kind"][];
}
export type GameAction =
  | { type: "START_RUN"; table: PuzzleTable; inventory: Tile[] }   // equation = table.rows[0].equation
  | { type: "RESTART_RUN"; table: PuzzleTable; inventory: Tile[] }
  | { type: "SELECT_TILE"; tileId: string } | { type: "RETURN_TILE"; tileId: string }
  | { type: "SUBMIT_CORRECT"; rewardTiles: Tile[] } | { type: "SUBMIT_INCORRECT" }
  | { type: "TOGGLE_DISCARD"; tileId: string }
  | { type: "NEXT_ROUND" }              // the reducer reads table.rows[round]
  | { type: "CLEAR_SELECTION" };

// src/game/factories.ts
export function createPuzzleStart(table: PuzzleTable, nextTileId: TileIdFactory):
  { type: "START_RUN"; table: PuzzleTable; inventory: Tile[] };   // inventory = sortTiles(createTiles(table.hand, nextTileId))

// src/app/App.tsx
export interface AppDependencies {
  nextTileId: TileIdFactory;
  gameUrl: string;
  /** Deals a Practice table. Called only from event handlers, once per run. */
  dealPuzzle(): PuzzleTable;
}

// src/services/sharing.ts — until T108
export type ShareStats = { score: number; longestStreak: number; par: number; rows: number; won: boolean };
```

`NEXT_ROUND` and `START_RUN` stop carrying an equation, because the table
supplies every row. That removes App's duplicate row lookup.

Deleted:
- `GameMode`;
- `INVENTORY_CAPACITY` and `KIND_EQUATION_RATE`;
- `generateEquation`, `generateKindEquation` and `generateRewardTiles`;
- `canConstruct`;
- `createInitialInventory` and `ALL_DIGITS`;
- `getCapacity`. Callers use `PUZZLE_CAPACITY`, and `getOverflowCount(state)`
  is `state.inventory.length - PUZZLE_CAPACITY`;
- `CapacityMeter` and its `.design-sync` preview;
- `GameHud`'s `capacity` prop;
- `balance.test.ts` and `src/test/economy.ts`;
- the `random` dependency and `sequenceRandom`;
- the title's mode picker, so `onStart()` takes no mode;
- the message keys `mode.endless`, `mode.endlessHint`, `title.mode`,
  `hud.capacity`, `hud.capacityStatus`, `overflow.instruction`,
  `gameOver.title` and `gameOver.rounds`.

`REWARD_BONUS` stays. Its comment is rewritten for Puzzle's pay, and its
value is unchanged.

## Steps

- [ ] **Tests first.**
  - Rewrite the reducer tests' actions to the new shapes. Add these tests:
    - `it("takes the next row's equation from the table on NEXT_ROUND")`;
    - `it("refuses NEXT_ROUND when no table is loaded")`;
    - `it("ends after the last row without reading past the table")`.
  - In `sharing.test.ts`, update the M8 Puzzle text, still branded until
    T100.
  - Delete the Endless smoke test.
  - Run the suite, and record that `tsc` fails on the action shapes.
- [ ] **Code:** as in Interfaces. `createPuzzleStart` replaces App's
      `startState` and the fixtures' Puzzle start.
- [ ] **Check:** `grep -rnE "endless|GameMode|INVENTORY_CAPACITY|generateEquation" src e2e`
      prints nothing.
- [ ] **Gates:** all five green.
- [ ] **Commit:** `refactor(game): Puzzle is the only run`, with `Task: T99`.

## Acceptance gate

- `GameState.table` is required outside the title.
- The sample's par line still replays to 7 on `gameReducer`.
- `npm run test:e2e` is green.
