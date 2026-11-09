# 9dle Technical Contract

File map, domain types, pure and browser-bound interfaces, the tuning surface,
reducer invariants, and test fixture conventions (§2). A module tagged with a
task is built by that task.

### 2.1 Canonical file map

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── implementation-task.yml
│   ├── workflows/
│   │   └── ci.yml
│   └── pull_request_template.md
├── docs/                     # planning and spec documents — see AGENTS.md routing map
├── e2e/                      # geometry specs only
│   ├── accessibility.spec.ts
│   ├── labels.ts
│   ├── puzzle-fit.spec.ts
│   └── viewport.spec.ts
├── public/
│   ├── OFL.txt
│   └── favicon.svg
├── scripts/                  # offline tools; nothing here ships
│   ├── daily/                # (T102)
│   │   ├── generate.ts
│   │   ├── review.md         # committed generator output
│   │   └── vetoes.json
│   └── run.mjs               # (T102) runs a TypeScript script under Node
├── src/
│   ├── app/
│   │   ├── App.module.css
│   │   ├── App.test.tsx
│   │   └── App.tsx
│   ├── components/
│   │   ├── ActionButton/
│   │   ├── AnswerSlots/
│   │   ├── EquationBoard/
│   │   ├── FeedbackPanel/
│   │   ├── GameHud/
│   │   ├── GameOverScreen/
│   │   ├── GameScreen/
│   │   ├── LanguageToggle/
│   │   ├── OverflowControls/
│   │   ├── PuzzleLedger/
│   │   ├── Tile/
│   │   ├── TileInventory/
│   │   └── TitleScreen/      # each folder: Name.tsx, Name.module.css, Name.test.tsx
│   ├── gallery/
│   │   ├── Gallery.module.css
│   │   ├── Gallery.test.tsx
│   │   ├── Gallery.tsx
│   │   ├── harness.tsx
│   │   ├── main.tsx
│   │   ├── states.test.tsx
│   │   └── states.tsx
│   ├── game/
│   │   ├── balance.ts
│   │   ├── constants.ts
│   │   ├── daily.ts          # (T101) calendar arithmetic, pure
│   │   ├── dailyPicker.ts    # (T102) offline selection of daily tables
│   │   ├── dailyTables.json  # (T103) the shipped list, generated
│   │   ├── dailyTables.ts    # (T103) typed access and today's lookup
│   │   ├── factories.ts
│   │   ├── gameReducer.ts
│   │   ├── generators.ts
│   │   ├── puzzle.ts
│   │   ├── replay.ts         # (T104) a move list replayed through the reducer
│   │   ├── selectors.ts
│   │   ├── types.ts
│   │   └── *.test.ts         # one beside each module
│   ├── hooks/
│   │   └── useGameKeyboard.ts
│   ├── i18n/
│   │   ├── I18nContext.tsx
│   │   ├── koreanFont.ts
│   │   ├── messages.ts
│   │   ├── storage.ts
│   │   ├── types.ts
│   │   └── *.test.ts(x)
│   ├── services/
│   │   ├── dailyStorage.ts   # (T105) the saved daily
│   │   ├── dailyStorage.test.ts
│   │   ├── sharing.test.ts
│   │   └── sharing.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens/           # colors, elevation, fonts, keyframes, motion, radius, spacing, typography
│   ├── test/
│   │   ├── fixtures.ts
│   │   └── setup.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── AGENTS.md
├── eslint.config.js
├── gallery.html
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── stylelint.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

### 2.2 Domain types

```ts
export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Language = "en" | "ko";
export type GamePhase =
  | "title"
  | "answering"
  | "feedback"
  | "overflow"
  | "gameOver";

export type Tile = { id: string; digit: Digit; isNew: boolean };

export interface Equation {
  left: number;
  right: number;
  product: number;
}

export interface RoundResult {
  kind: "correct" | "incorrect";
  /** The product on a correct answer; the spelled number on an incorrect answer. */
  submittedValue: number;
  correctValue: number;
  submittedTiles: Tile[];
  rewardTileIds: string[];
  /** Set when this round's overflow discard completed; the round then advances on its own. */
  discarded?: boolean;
}

export interface PuzzleRow {
  equation: Equation;
  /** The digits a correct answer takes, in arrival order. */
  pay: Digit[];
}

export interface PuzzleTable {
  hand: Digit[];
  rows: PuzzleRow[];
  par: number;
}

/** A table before the solver has priced it. */
export type PuzzleDeal = Omit<PuzzleTable, "par">;

/** One row's play: the tiles spent, in slot order, and the overflow discard. (T102) */
export interface PuzzleMove {
  spend: Digit[];
  discard?: Digit;
}

export interface GameState {
  phase: GamePhase;
  table: PuzzleTable | null; // null only in "title"
  equation: Equation | null;
  inventory: Tile[];
  selectedTiles: Tile[];
  pendingDiscards: string[];
  score: number;
  round: number;
  totalRounds: number;
  currentStreak: number;
  longestStreak: number;
  lastResult: RoundResult | null;
  /** One entry per submitted row, in order, for the ledger's marks. */
  rowResults: RoundResult["kind"][];
}

export type GameAction =
  | { type: "START_RUN"; table: PuzzleTable; inventory: Tile[] } // equation = table.rows[0].equation
  | { type: "RESTART_RUN"; table: PuzzleTable; inventory: Tile[] }
  | { type: "SELECT_TILE"; tileId: string }
  | { type: "RETURN_TILE"; tileId: string }
  | { type: "SUBMIT_CORRECT"; rewardTiles: Tile[] }
  | { type: "SUBMIT_INCORRECT" }
  | { type: "TOGGLE_DISCARD"; tileId: string }
  | { type: "NEXT_ROUND" } // the reducer reads table.rows[round]
  | { type: "CLEAR_SELECTION" }
  | { type: "RETURN_TO_TITLE" }; // any phase but title → createTitleState(); refused in title

export type RandomSource = () => number; // Contract: 0 <= value < 1
export type TileIdFactory = () => string;
```

There is no run mode: every run is a Puzzle table. Whether it is the Daily or a
Practice run is App state (`Play`, §2.4), and the reducer never sees it.

### 2.3 Pure interfaces

```ts
// game/balance.ts — hand-tuned dials (see § Tuning surface)
export const REWARD_BONUS = 1;
export const PUZZLE_CAPACITY = 5;
export const PUZZLE_ROWS = 8;
export const PUZZLE_PLANT_RATE = 0.6;
export const PUZZLE_MIN_PAR = 7;
export const PUZZLE_MIN_ONLY_MOVES = 2;

// game/constants.ts — domain definitions
export const OPERAND_MIN = 1;
export const OPERAND_MAX = 9;
export const REWARD_DIGIT_COUNT = 10; // the digits 0–9; puzzle.ts draws its digits from it

// game/generators.ts — the exports that survive T99; puzzle.ts uses them
export const EQUATION_PAIRS: ReadonlyArray<readonly [number, number]>; // the 45 unordered pairs
export function readRandomSample(random: RandomSource): number;
export function sampleBinIndex(value: number, binCount: number): number;
export function orientPair(pair: readonly [number, number], orderSample: number): Equation;

// services/sharing.ts
export function getShareStats(state: GameState): ShareStats; // the figures a finished run shows and shares

// game/factories.ts
export function createTitleState(): GameState;
export function createTiles(digits: readonly Digit[], idFactory: TileIdFactory): Tile[]; // unsorted: a pay arrives in printed order
export function sortTiles(tiles: readonly Tile[]): Tile[]; // digits ascending, then by id
export function createPuzzleStart(table: PuzzleTable, nextTileId: TileIdFactory):
  { type: "START_RUN"; table: PuzzleTable; inventory: Tile[] }; // inventory = sortTiles(createTiles(table.hand, nextTileId))

// game/selectors.ts
export function getAnswerLength(equation: Equation): 1 | 2;
export function getRewardCount(spentCount: number): number; // spentCount + REWARD_BONUS
export function constructAnswer(selectedTiles: readonly Tile[]): number | null; // null if unfilled
export function answerMatches(selectedTiles: readonly Tile[], product: number): boolean; // every slot's tile holds its digit
export function canAttemptEquation(inventory: readonly Tile[], equation: Equation): boolean; // enough tiles for the answer's slots
export function getOverflowCount(state: GameState): number; // inventory.length - PUZZLE_CAPACITY
export function isRunComplete(state: GameState): boolean; // totalRounds >= table.rows.length
export function isParMade(state: GameState): boolean; // gameOver with score === table.par
export function isSubmissionReady(state: GameState): boolean;

export function gameReducer(state: GameState, action: GameAction): GameState;

// game/puzzle.ts
export interface PuzzleSolution {
  par: number;
  /** Decisions on the canonical par line that offer two or more options, exactly one of which keeps par. */
  onlyMoves: number;
  /** True when every line that scores par misses a row it could have answered. */
  sacrificeRequired: boolean;
  /** The canonical par line: the first optimal option at every decision. (T102) */
  parLine: PuzzleMove[];
}
export const PUZZLE_DEAL_ATTEMPTS = 200;
export function solvePuzzle(deal: PuzzleDeal): PuzzleSolution;
export function isInBand(deal: PuzzleDeal, solution: PuzzleSolution): boolean; // (T102) dealPuzzle calls it
export function playMyopic(deal: PuzzleDeal): number;
export function plantTable(random: RandomSource): PuzzleDeal;
export function dealPuzzle(random: RandomSource, attempts?: number): PuzzleTable;

// game/daily.ts (T101) — pure; never calls `new Date()` itself
export interface LocalDate { year: number; month: number; day: number } // month 1–12
/** Table #1's date. Set once at release; changing it after launch renumbers every table. */
export const DAILY_LAUNCH_DATE: LocalDate;
export function localDateOf(now: Date): LocalDate;                 // getFullYear, getMonth() + 1, getDate()
export function daysFrom(from: LocalDate, to: LocalDate): number;  // via Date.UTC, so no DST hour leaks in
export function dailyNumberOn(date: LocalDate, launch?: LocalDate): number; // daysFrom(launch, date) + 1; ≤ 0 before launch
export function dateOfDaily(number: number, launch?: LocalDate): LocalDate;

// game/dailyPicker.ts (T102) — offline only
export function isDailyCandidate(deal: PuzzleDeal): PuzzleTable | null; // in band and sacrificeRequired, priced
export function plantDailyTable(random: RandomSource, attempts: number): PuzzleTable | null;
export interface FillOptions {
  count: number;
  frozenThrough: number;
  vetoed: ReadonlySet<number>;
  random: RandomSource;
  attemptsPerSlot: number;
}
export function fillDailySlots(existing: readonly PuzzleTable[], options: FillOptions): PuzzleTable[];
export function frozenThroughOn(today: LocalDate, existingLength: number, launched: boolean): number;
// launched ? min(existingLength, max(0, dailyNumberOn(today) + 2)) : 0 — a slot freezes two days before its date; nothing freezes before launch
export function describeDaily(number: number, date: LocalDate, table: PuzzleTable): string; // one review-file block

// game/dailyTables.ts (T103) — dailyTables.json is compact; table #n is index n − 1; product = left × right
export const DAILY_TABLES: readonly PuzzleTable[];
export function dailyTable(number: number): PuzzleTable | undefined; // 1-based
export function todaysDaily(now: Date, tables?: readonly PuzzleTable[]): // default DAILY_TABLES
  { number: number; table: PuzzleTable } | null; // null before launch or past the list

// game/replay.ts (T104)
export interface Replay { state: GameState; actions: GameAction[] }
export function replayMoves(table: PuzzleTable, moves: readonly PuzzleMove[],
  nextTileId: TileIdFactory): Replay | null;
```

`fillDailySlots` (table #n is index n − 1) keeps every slot up to
`frozenThrough` untouched, replaces each vetoed slot above it, keeps every
other existing slot, appends slots until `count`, and never adds a table equal
to one already in the list. It throws a `RangeError` for a vetoed number at or
below `frozenThrough`, for `existing.length < frozenThrough`, and for a slot
with no candidate after `attemptsPerSlot` plants.

`replayMoves`:

1. Starts from `createPuzzleStart(table, nextTileId)`.
2. For each move, each `spend` digit selects the first tile in the hand with
   that digit. Then `SUBMIT_CORRECT`, with `createTiles(row.pay, nextTileId)`,
   when `answerMatches`; otherwise `SUBMIT_INCORRECT`.
3. If the phase is now `overflow`: with `discard` set, it toggles the first
   tile in the hand with that digit; with no `discard`, this must be the last
   move, and the replay stops there. A `discard` when the phase isn't
   `overflow` is a bad record.
4. After a complete move, `NEXT_ROUND`.
5. It returns `null` when any dispatch returns the same object (the reducer
   refused it), when the run is already over and moves remain, or when a
   `discard` appears with no overflow.

The offline generator is run with
`node scripts/run.mjs scripts/daily/generate.ts [--count 365] [--attempts 20000]`.
It reads `src/game/dailyTables.json` (a missing file means `[]`) and
`scripts/daily/vetoes.json`, shaped `{ "pending": [{ "number": 12, "reason": "…" }], "done": [] }`.
It sets `frozenThrough` to
`frozenThroughOn(localDateOf(new Date()), existing.length, DAILY_LAUNCHED)`, so a slot freezes two days before its date arrives and nothing freezes before launch. It uses
`Math.random`, and writes `dailyTables.json`, the committed review file
`scripts/daily/review.md` (one `describeDaily` block per table), and
`vetoes.json`, moving the pending vetoes it handled into `done`. The review file
is public: a known limit (`docs/spec/product.md` §1.2b).

### Tuning surface

The values that decide how the game *feels* live in one data-only module,
`src/game/balance.ts`, so hand-tuning never means hunting through logic.

| Concern | File | Change means |
|---|---|---|
| Feel | `game/balance.ts` | Retuning a shipped game. Safe to edit by hand, within the range each dial documents. |
| Domain | `game/constants.ts` | Changing what the game *is* — operand range. Not a tuning knob. |
| Motion and metrics | `styles/global.css` tokens | Retuning press feel and hairlines in one place; no module hardcodes them. |

After launch, `PUZZLE_CAPACITY`, `PUZZLE_ROWS` and `REWARD_BONUS` are baked into every frozen table and stored record, so changing one needs a new list.

Rules that keep the surface durable:

- **One binding per dial.** A dial is imported by the module that uses it, never
  threaded through a call site as a parameter. Injection is reserved for
  impurity (`RandomSource`, `TileIdFactory`), not for constants — a dial passed
  as an argument is a dial that can be silently overridden.
- **Every dial documents its effect**, its safe range, and what breaks
  outside that range.
- **Agents may add dials; agents may not change a dial's value** without
  explicit instruction (AGENTS.md §4.5). `PUZZLE_MIN_PAR` and
  `PUZZLE_MIN_ONLY_MOVES` define the band for both Practice and the daily list.
  Tuning commits use `tune(balance):` and carry nothing else, so tuning and
  feature work never collide in git.

### 2.4 Browser-bound interfaces

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

// src/services/dailyStorage.ts (T105)
export const DAILY_STORAGE_KEY = "ndle.daily";
export interface DailyOutcome { score: number; par: number; longestStreak: number }
export interface DailyRecord { version: 1; number: number; moves: PuzzleMove[]; outcome: DailyOutcome | null }
export interface DailyStore { load(): DailyRecord | null; save(record: DailyRecord): void }
export function createDailyStore(storage: Pick<Storage, "getItem" | "setItem"> | null): DailyStore;

// src/services/sharing.ts
export type ShareStats = { score: number; rows: number; par: number; longestStreak: number; won: boolean }
  & ({ kind: "daily"; number: number } | { kind: "practice" });

export function formatShareText(
  stats: ShareStats,
  language: Language,
  url: string,
): string;

export interface ShareDependencies {
  nativeShare?: (data: ShareData) => Promise<void>;
  writeClipboard: (text: string) => Promise<void>;
}

export type ShareOutcome = "shared" | "copied" | "failed";

export function shareResult(
  text: string,
  url: string,
  dependencies: ShareDependencies,
): Promise<ShareOutcome>;

export function copyResult(
  text: string,
  dependencies: Pick<ShareDependencies, "writeClipboard">,
): Promise<ShareOutcome>;
```

`main.tsx` supplies `now` as `() => new Date()` and `dailyStore` as
`createDailyStore(storageOrNull())`, where `storageOrNull` returns
`window.localStorage`, or `null` if accessing it throws.

`DailyStore.load` returns `null` when storage is `null` or `getItem` throws,
when the JSON is invalid, when `version !== 1` or `number` is not a positive
integer, when a move's `spend` is not one or two digits from 0 to 9 or its
`discard` is not a digit, and when `outcome` is neither `null` nor three
non-negative integers. `save` writes the record as JSON and swallows `setItem`
errors (quota, private mode). There is a single record, which each save
overwrites.

### 2.5 Reducer invariants

The reducer returns the unchanged `state` object for invalid known actions. Unknown action types are prevented by the `never` exhaustiveness check.

- The reducer never reads the clock or storage; Daily versus Practice is unknown to it.
- `table === null` and `equation === null` only in `title`.
- Live tile IDs are unique across `inventory` and `selectedTiles`.
- A live tile ID cannot be in both `inventory` and `selectedTiles`.
- `lastResult.submittedTiles` is a historical snapshot of consumed tiles and `lastResult.rewardTileIds` intentionally references live reward tiles; neither collection represents additional ownership.
- `selectedTiles.length <= getAnswerLength(equation)`.
- `pendingDiscards` contains unique IDs that exist in inventory.
- `pendingDiscards` is non-empty only in `overflow`.
- `inventory.length <= PUZZLE_CAPACITY` when phase is `answering`, `feedback`, or `gameOver`.
- `inventory.length > PUZZLE_CAPACITY` when phase is `overflow`.
- `lastResult === null` in `title` and `answering`.
- `lastResult !== null` in `feedback` and `overflow`.
- `score <= totalRounds`.
- `SUBMIT_CORRECT` is accepted only when every slot is filled and `answerMatches(selectedTiles, product)`; `SUBMIT_INCORRECT` only when every slot is filled and it does not.
- `NEXT_ROUND` reads `table.rows[round]`; it is refused when no table is loaded, and the reducer never reads past the table.
- `RETURN_TO_TITLE` is accepted in every phase but `title`.
- `currentStreak <= longestStreak <= score`.
- In `answering` and `gameOver`, `round === totalRounds + 1`.
- In `feedback` and `overflow`, the displayed equation has just been submitted, so `round === totalRounds`.

### 2.6 Test fixture conventions

Use deterministic fixtures; never mock `Math.random()` globally.

```ts
export const sequentialIds = (prefix = "tile"): TileIdFactory => {
  let index = 0;
  return () => `${prefix}-${index++}`;
};

export const seededRandom = (seed: number): RandomSource; // mulberry32

export const makeEquation = (left: number, right: number): Equation => ({
  left,
  right,
  product: left * right,
});

export const makeTile = (
  digit: Digit,
  id = `tile-${digit}`,
  isNew = false,
): Tile => ({ id, digit, isNew });

export const makePuzzleRow = (left: number, right: number, pay: Digit[]): PuzzleRow;

// The showcase table: par 7, and par needs a sacrifice on row 1.
export const PUZZLE_SAMPLE: PuzzleTable;
// Its canonical par line. Row 1 is the sacrifice: 57 for 15.
export const PUZZLE_SAMPLE_PAR_LINE: PuzzleMove[];
```

`PuzzleMove` lives in `game/types.ts` and `fixtures.ts` re-exports it.

The phase fixtures are Puzzle-shaped and are built by playing the reducer
(`replayMoves`, or the test helper `play()` in `fixtures.ts`), never
hand-assembled, so each is a §2.5-legal state. Each takes `overrides?`.

- `makeAnsweringState` is `PUZZLE_SAMPLE` at row 1: `table: PUZZLE_SAMPLE`, `rowResults: []`, the hand `1 4 5 7 9`, and row 1's equation.
- `makeFeedbackState` is that state after row 1's par-line move, 5 and 7 for 3 × 5: an incorrect answer, leaving the hand `1 4 9`.
- `makeOverflowState` is the par line through row 3, then row 4's correct `7`: six tiles, with `4` on the rail, and `phase: "overflow"`.
- `makeGameOverState` is the full par line: `phase: "gameOver"`, score 7, longest streak 7.

### 2.7 Dev-only states gallery

`gallery.html` is a second root HTML entry, parallel to `index.html`, that
loads `src/gallery/main.tsx` instead of `src/main.tsx`. It mounts `Gallery`
(`src/gallery/Gallery.tsx`) under the same `StrictMode` and `I18nProvider` as
the real app, so every rendered state gets real i18n and the double-render
behavior that catches `StrictMode`-only bugs.

Vite's default build input is `index.html` alone; it does not auto-discover
sibling root HTML files. `npm run build && ls dist/` confirms `dist/` holds
only `assets/`, `favicon.svg`, and `index.html` — `gallery.html` never ships.
The dev server serves it anyway, since `vite dev` transforms any HTML file
under the project root on request, not just the configured build input. (Full
probe record: `https://github.com/cgm-16/ndle/blob/3ccd37b/docs/journal/journal-2026-08-12.md`.)

The catalogue, `src/gallery/states.tsx`, exports
`GALLERY_STATES: Record<GamePhase, GalleryEntry[]>`. Keying by phase rather
than a flat array means adding a member to `GamePhase` fails `tsc` until the
gallery covers it — a flat array with a hand-written phase list would rot
silently instead.

`Gallery` renders exactly one entry at a time, chosen from a picker, rather
than every state at once. `GameScreen` calls `useGameKeyboard`
(`src/hooks/useGameKeyboard.ts`), which attaches a window-level `keydown`
listener per mounted instance; N simultaneous screens would mean N listeners
each calling `preventDefault()` on the same keypress. Rendering one state at a
time also means each renders at the page's real width. Neither the picker's
`<nav>` nor the stage `<div>` is a `<main>`, because several rendered states
(`TitleScreen`, `GameOverScreen`) own that landmark themselves.

The catalogue's phase coverage is enforced, not just conventional:
`GALLERY_STATES`'s `Record<GamePhase, GalleryEntry[]>` type fails `tsc` the
moment a new `GamePhase` member ships without a matching key, and
`src/gallery/states.test.tsx` asserts every key's array is non-empty, which
catches the type check's own blind spot — an empty array added just to
satisfy the compiler.
