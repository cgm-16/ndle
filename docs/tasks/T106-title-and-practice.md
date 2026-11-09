---
reads:
  - src/app/App.tsx
  - src/main.tsx
  - src/components/TitleScreen/TitleScreen.tsx
  - src/game/dailyTables.ts  # todaysDaily
  - src/services/dailyStorage.ts
  - src/i18n/messages.ts
---

# T106 — Title with Daily and Practice

```yaml
task_id: T106
title: Title with Daily and Practice
milestone: M15 — Daily and Practice
priority: P0
estimate: M
wave: W4
depends_on: [T105]
parallel_safe: false
paths:
  - src/app/App.tsx
  - src/app/App.test.tsx
  - src/main.tsx
  - src/components/TitleScreen/
  - src/components/GameScreen/
  - src/components/GameOverScreen/
  - src/game/types.ts
  - src/game/gameReducer.ts
  - src/game/gameReducer.test.ts
  - src/i18n/messages.ts
```

## Why

The title offers the choice between Daily and Practice. Practice is M8's
live deal, with Play Again. The Daily entry shows today's state before it is
opened. T107 wires the Daily itself.

A Back button at the top of the game and game-over screens returns to the
title (Ori, 2026-11-09). Without it, Practice has no way back to the Daily
short of a reload.

## Interfaces

**Produces:**

```ts
// src/app/App.tsx
export interface AppDependencies {
  nextTileId: TileIdFactory;
  gameUrl: string;
  dealPuzzle(): PuzzleTable;   // Practice only
  now(): Date;                 // read in event handlers and on title render, never in the reducer
  dailyStore: DailyStore;
  dailyTables: readonly PuzzleTable[];   // DAILY_TABLES in main.tsx; tests inject their own
}
type Play = { kind: "daily"; number: number } | { kind: "practice" };   // App state, beside useReducer

// src/components/TitleScreen/TitleScreen.tsx
export type DailyEntry = { status: "open"; number: number } | { status: "played"; number: number } | { status: "none" };
// props: daily: DailyEntry; onDaily(): void; onPractice(): void   (onStart is gone)

// src/game/types.ts — GameAction gains
| { type: "RETURN_TO_TITLE" }   // any phase but title → createTitleState(); refused in title
```

**Back:**
- It is a `Back` / `뒤로` button (key `action.back`) with an `aria-hidden`
  inline-SVG arrow. It is the first focusable element of `GameScreen` and
  of `GameOverScreen`, in both modes, and at least 44 px tall.
- Pressing it dispatches `RETURN_TO_TITLE`. There is no confirmation, and
  no key: Escape already clears the selection.
- It is not a move. A Daily keeps its record and resumes from the title
  (T107). A Practice run is dropped, and Practice deals a new table.

In `main.tsx`:
- `now` is `() => new Date()`;
- `dailyStore` is `createDailyStore(storageOrNull())`, where `storageOrNull`
  returns `window.localStorage`, or `null` if accessing it throws.

`DailyEntry` comes from `todaysDaily(now(), dailyTables)` and
`dailyStore.load()`:
- **`none`:** `todaysDaily` gives `null`.
- **`played`:** the record's number is today's and its `outcome` isn't
  `null`.
- **`open`:** anything else.

**Copy** (new keys, en / ko):

| Key | en | ko |
|---|---|---|
| `title.daily` | `Daily #{number}` | `오늘의 판 #{number}` |
| `title.dailyPlayed` | `Today's result #{number}` | `오늘의 결과 #{number}` |
| `title.dailyNone` | `No table today` | `오늘은 판이 없습니다` |
| `title.practice` | `Practice` | `연습` |
| `action.back` | `Back` | `뒤로` |

`title.dailyNone` renders as a disabled button that still has its text.

The key `action.start` is deleted, because its button is gone.

## Steps

- [ ] **Tests** in `gameReducer.test.ts`:
  - `RETURN_TO_TITLE` from `answering`, `feedback`, `overflow` and
    `gameOver` equals `createTitleState()`;
  - in `title` it returns the same state object.
- [ ] **Tests** in `TitleScreen.test.tsx`:
  - each `DailyEntry` renders its label in en and ko;
  - `none` is disabled and Practice stays enabled.
- [ ] **Tests** in `App.test.tsx`, injecting `now` and a store over an
      in-memory `Storage`, rendered under `<StrictMode>`:
  - `it("shows today's number on the title")`.
  - `it("offers no Daily before launch, and Practice still plays")`: `now` is
    the day before `DAILY_LAUNCH_DATE`.
  - `it("deals Practice once per start, even under StrictMode")`:
    `dealPuzzle` is a spy, and is called once.
  - `it("deals a new table on Play Again and on R in Practice")`.
  - `it("never writes the daily record in Practice")`. After a full Practice
    run, the store's `getItem("ndle.daily")` is `null`.
  - `it("goes Back from Practice to the title, then deals a new table")`.
    Back from mid-run and from game over each show the title; pressing
    Practice again calls `dealPuzzle` again.

  Record the failures.
- [ ] **Implement:** `onPractice` keeps M8's start and restart, with
      `play = { kind: "practice" }`. `onDaily` is a stub that T107 fills.
- [ ] **Gates,** including `npm run test:e2e`: the title's buttons changed,
      so update the specs that press Start Run to press Practice.
- [ ] **Commit:** `feat(title): choose Daily or Practice`, with `Task: T106`.

## Acceptance gate

- The six App tests and the reducer's `RETURN_TO_TITLE` tests are green
  under StrictMode.
- The e2e suite is green.
