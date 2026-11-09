# Puzzle prototype — design

Date: 2026-10-19
Status: sections approved in session; written spec awaiting review
Tracking: #196 (milestone `M8 — Puzzle Prototype`)
Research draft: `docs/research/game-modes/03-puzzle/README.md` (cited below as "the draft")
Decision record: `https://github.com/cgm-16/ozterisk/blob/c212fcd/docs/journal/journal-2026-10-19.md` (#198)
Supersedes: nothing. Amends nothing until the playtest passes; §9.3 lists the
amendments the merge then needs.

## 1. Purpose

Puzzle deals five tiles and eight equations face up, each printed with the
tiles it pays, and judges the run against **par**, the best score the table
allows. Classic and Endless ask *what do I keep, given what might come?*
Puzzle asks *what do I keep, given what will come?*

This branch exists to run the draft's kill playtest (its §7, as amended in
§6.1 here): five people, four tables each, watched by a person, told the
title-screen rules only. It answers
**do they read the board and plan?** The answer picks the research pool's
Batch 2: Well if yes, Four Winds lite if they enjoy the arc but not the reading.

Success for this branch is a Vercel preview that runs that playtest, built to
merge standard so that a pass needs only §9.3, not a rebuild.

Ori's prototype rule (journal 2026-10-19) governs it: own branch, draft PR
against `main`, no merge until the playtest passes and `docs/spec/**` is
amended, and a failed playtest closes the PR unmerged.

## 2. Scope

**In:** a third mode with per-session deals, par printed before the first
move, the ledger, a five-socket rack, a Puzzle game over and share text, and a
fixed playtest set on the preview (§6).

**Out:** numbered, daily or retryable tables (#195); a par-line reveal (#195);
the draft's outcome histogram; face tiles; any telemetry or analytics (the
observer records by hand); new motion.

## 3. Rules

A delta against Endless:

- **Table.** An opening hand of five distinct digits and eight rows. Each row
  is an equation from the existing pair list and its **pay**:
  `getRewardCount(answer length)` printed digits, so 2 for a one-digit product
  and 3 for a two-digit one.
- **Capacity.** Five sockets (`PUZZLE_CAPACITY`). The hand opens full.
- **Answering.** Unchanged: slots, keys, Clear, Submit. One submission per row.
- **Correct.** Spend the answer's tiles and take that row's pay, in printed
  order. Net +1, so a correct answer at a full hand overflows; overflow is
  Endless's one-tile discard, seated or rail.
- **Incorrect.** Spend the tiles, take nothing. A deliberate one is the
  **sacrifice**, and it is an ordinary wrong submission: no new control.
- **Kind bias.** None during play. It acts once, inside the deal (§5).
- **End.** The run ends after the eighth submission, or earlier by the existing
  loss: the hand holds fewer tiles than the next row's answer needs.
- **Par.** The solver's maximum over every line. Score cannot exceed it.
  **Made par** is a game over with score equal to par, however the run ended.

## 4. State and reducer

### 4.1 Types

```ts
export type GameMode = "endless" | "classic" | "puzzle";

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

// GameState gains two optional fields, set only in Puzzle:
table?: PuzzleTable;
/** One entry per submitted row, in order: what the ledger marks ✓ or ✗. */
rowResults?: RoundResult["kind"][];
```

Optional, like `RoundResult.discarded`, so every existing `GameState` literal
stays valid. `rowResults` exists because `lastResult` holds only the latest
submission, and the ledger marks every played row. A run starts it empty, and
each submission in Puzzle appends its kind.

### 4.2 Actions

`START_RUN` and `RESTART_RUN` gain an optional `table`. The reducer refuses a
Puzzle `START_RUN` without one, and a Puzzle `RESTART_RUN` without one. App
still supplies every equation, as it does for the other modes: row 1's at the
start and `table.rows[state.round].equation` at each `NEXT_ROUND`. The reducer
keeps the table for two jobs only: checking pays and ending the run.

### 4.3 Reducer

- **`SUBMIT_CORRECT`** in Puzzle also requires the reward tiles' digits to equal
  the current row's pay (`table.rows[state.round - 1].pay`), in order. The
  existing refusal of faces outside Classic already covers Puzzle.
- **`NEXT_ROUND`** ends the run when `isRunComplete(state)`, in place of the
  `isAtClassicFloor` check it makes today. The loss check is unchanged.
- **Everything else** is unchanged. Overflow follows from `getCapacity`.

### 4.4 Selectors and factories

- **`getCapacity`** gains an explicit `"puzzle"` case returning
  `PUZZLE_CAPACITY`. Without it, every mode but Endless falls through to
  Classic's twenty and its descent.
- **`isRunComplete(state)`**: Classic at its floor, or Puzzle once
  `totalRounds` reaches `table.rows.length`. It replaces the `isAtClassicFloor`
  calls in the reducer's `NEXT_ROUND` and App's advance. `isAtClassicFloor`
  stays for `isClassicWin`.
- **`isParMade(state)`**: game over, Puzzle, and score equal to `table.par`.
  The counterpart to `isClassicWin`.
- **`createTiles(digits, idFactory)`** builds tiles from digits.
  `createInitialInventory` delegates to it, and App uses it for the table's hand
  and each pay.

### 4.5 App

- **Start and restart.** For Puzzle, App calls `dependencies.dealPuzzle()`,
  builds the hand with `createTiles`, and dispatches with the table and row 1's
  equation.
- **Submit.** For a correct Puzzle answer the reward tiles are
  `createTiles(row.pay, nextTileId)`, not `generateRewardTiles`.
- **Advance.** At `isRunComplete` the current equation is passed, as Classic's
  floor does today. Otherwise Puzzle passes the next row's equation.
- **`AppDependencies`** gains `dealPuzzle(): PuzzleTable`. Tests inject a fixed
  table; `main.tsx` composes the production one (§6).

## 5. The deal

### 5.1 `src/game/puzzle.ts`

Pure, ported from the draft's `sims/solver.ts` and trimmed to what ships:
the printed-pay model only. The wall model, `randomTable`, the lookahead bot,
the line histogram and `mulberry32` stay in the research folder; a seeded PRNG
must not ship.

- **`solvePuzzle(table)`** returns `{ par, onlyMoves, sacrificeRequired }`. A memoized search over
  (row index, digit counts); hand size follows from the counts. Options from a
  state:
  - **correct**, when the counts cover the product's digits: spend them, add
    the pay, and if the hand passes capacity, one option per distinct digit
    held to discard;
  - **miss**, one-digit product: one option per distinct held digit other than
    the product;
  - **miss**, two-digit product: one option per distinct pair of held digits
    (no two-digit product has a repeated digit, so every pair misses);
  - **none**, when the hand is smaller than the answer: the line ends.

  Options are counted by digit, not tile identity, since equal digits are
  interchangeable. **Only-moves** are the decisions on the canonical par line
  (first optimal option, correct before miss) that offer two or more options of
  which exactly one keeps par. **`sacrificeRequired`** is true when the best
  score over lines that miss only when no correct answer is available falls
  below par. It is the one property that proves the sample is a sacrifice table.
- **`playMyopic(table)`** returns the score of the draft's myopic bot, the
  journal 2026-09-27 T84 bot at skill 100%: it answers whenever it can, never
  sacrifices, discards the digit held in most copies (ties go to the higher
  digit), and on a forced miss spends the most-copied digits, excluding the
  product's digit for a one-digit product.
- **`plantTable(random)`** is the draft's planted deal. The hand is five
  distinct digits by shuffle. For each row, with probability
  `PUZZLE_PLANT_RATE` the pair comes from `EQUATION_PAIRS` whose product a
  hidden line's hand can spell, otherwise uniformly from all pairs. It is
  oriented at random, and the pay is uniform digits. The hidden line then
  plays the row: it answers if it can, discarding a random held tile on
  overflow, and otherwise misses with random tiles. A row its hand is too small
  to attempt is skipped, and the line plays on at the next row. The line is
  never shown; only the solver decides par.
- **`dealPuzzle(random)`** plants and solves until a table lands in the band,
  for at most `PUZZLE_DEAL_ATTEMPTS` (200) attempts. The band, pre-registered in
  the draft's §5:
  - `par ≥ PUZZLE_MIN_PAR`;
  - `playMyopic(table) < par`;
  - `onlyMoves ≥ PUZZLE_MIN_ONLY_MOVES`.

  About one plant in seven is accepted, so all 200 attempts fail with
  probability about 10⁻¹⁴. At the cap it returns the last table planted. Its par
  is still solved, so the screen stays honest; only the band is skipped.

It reuses `EQUATION_PAIRS` (exported from `generators.ts`; it is the same set
and order as the solver's list, so the draft's numbers carry over), the
existing orientation and sampling helpers, and the injected `RandomSource`.
Production passes `Math.random`.

### 5.2 Dials

Added to `src/game/balance.ts`, each with its economy effect documented there:

| Dial | Value | Effect |
|---|---|---|
| `PUZZLE_CAPACITY` | 5 | Sockets in Puzzle. The draft's band figures are measured at 5. |
| `PUZZLE_ROWS` | 8 | Rows per table, so the run's length. |
| `PUZZLE_PLANT_RATE` | 0.6 | How often a row is drawn from what the hidden line can spell. 1.0 makes every table clearable, though the myopic bot still scores only about three rows in four. |
| `PUZZLE_MIN_PAR` | 7 | The lowest par the band accepts. |
| `PUZZLE_MIN_ONLY_MOVES` | 2 | The fewest only-moves on the par line the band accepts. |

`PUZZLE_DEAL_ATTEMPTS` is a bound, not a dial, and lives in `puzzle.ts`.

### 5.3 Calibration

Checked on the ported code:

- **The sample** (§6, table 3): par 7 of 8, and par needs a sacrifice.
- **Five 1s** against six rows of 7 × 8: par 0, and the myopic bot scores 0.
- **The no-0 control**: hand 1 2 4 6 8; rows 5 × 8, 2 × 3, 3 × 4, 2 × 4; pays
  1 2 3 · 1 2 · 6 8 9 · 1 3. Par 3 of 4.
- **The sample's par line replayed on the real `gameReducer`** scores 7. Capacity
  5 is now a dial, so the draft's `run-cap.mjs` load hook is no longer needed.
- **The draft's q = 0.6 cell**: 2,000 plants on the port land near 14.6% in band.
  This is a one-off script run recorded in the PR, not a suite test.

## 6. The playtest set

Ori allowed this exception on the preview only (journal 2026-10-19).

- **The tables.** Three literal tables in `src/game/playtestTables.ts`, in this
  order:
  1. **Medium**: in band, the lookahead bot makes par, par needs no sacrifice,
     and the par line has exactly 2 only-moves (the draft's median).
  2. **Hard**: in band, the lookahead bot misses par, and par needs no
     sacrifice.
  3. **The sample**: `plantedTable(mulberry32(16641), 5, 8, 0.6, distinct)`,
     opening hand 1 4 5 7 9, par 7, and the key is a sacrifice on row 1.
- **Picking them.** Tables 1 and 2 are picked offline with the draft's research
  tooling, which keeps the lookahead bot. Their `mulberry32` seeds are research
  handles, recorded in the T87 commit body and never shown to a player. A unit
  test checks each table's par, only-moves and `sacrificeRequired` against
  `solvePuzzle`.
- **The sample outlives the set.** `src/test/fixtures.ts` owns the sample table
  and its par line. The par line is transcribed from the draft's §5 table:
  sacrifice 5 and 7, then 14, 9, 7 (discard 6), 4 (discard 8), 24 (discard 0),
  6 (discard 7) and 12 (discard 0). The calibration, the reducer replay, the App
  integration test and the gallery all read the fixture; the gallery already
  imports from it. `playtestTables.ts` holds its own copy, because production
  code does not import from `src/test/`, and a test asserts that the two are
  equal. That test leaves with the file.
- **Wiring.** `main.tsx` passes App a `dealPuzzle` that returns the three tables
  in order for the first three Puzzle deals of a page load, Start Run and Play
  Again alike, then calls `dealPuzzle(Math.random)`. A reload replays the set.
  There is no URL parameter and no UI.
- **Removal.** Before merge, T90 deletes `playtestTables.ts` and the wrapper in
  `main.tsx`. No game code changes with it, and a green full suite afterwards
  shows nothing else depended on it.

### 6.1 Protocol

Fixed before the first tester, so the result cannot move the bar.

- **Rules.** Before table 1 the observer opens "More" on the title screen with
  every tester, so Puzzle's rule is read, not folded away. The always-visible
  title rules are written for Endless ("at most ten tiles"). A tester who never
  saw Puzzle's rule could fail to plan for want of it, and the playtest asks
  whether people plan once they know the rules (Ori, 2026-10-19).
- **Tables.** Each tester plays four: Medium, Hard, the sample, then one live
  deal. The wiring above already deals live after the set, so the fourth table
  needs no code.
- **Scrolling.** On a 660 px phone, Next Round sits just below the fold after a
  miss, and a correct answer at a full hand scrolls the played rows off the top
  while the rows still to play stay on screen. The observer expects both and
  counts neither against planning (Ori, 2026-10-19; journal 2026-10-19).
- **Recorded per table, by the observer** (the draft's §7): seconds before the
  first submission; whether they look at the ledger; after missing par, whether
  they can name the move they would change; score against par.
- **The planning verdict** is the kill test, and it is judged on tables 1, 2 and
  4 only. Drop the direction if, on those tables, most testers submit row 1
  within about 5 s *and* cannot name a move to change. Also drop it if Medium
  and Hard feel the same. This narrows the draft's "on every table": once
  merged, Puzzle deals only live tables, and about 1 accepted table in 140
  needs a sacrifice (0.7%, the draft's §5). A pass must not rest on the sample,
  which the draft calls a showcase.
- **The sacrifice probe** is table 3, judged apart: does the tester find the
  sacrifice, and do they want more tables like it? It neither passes nor fails
  the playtest. If it lands, a merged Puzzle needs a source of sacrifice tables,
  such as the shipped pool in the draft's §8 Q5. That is decided after the
  playtest, with its own spec reading. If it does not land, nothing ships for it.
- **The result** goes to `main` in its own journal PR (§9.2).

## 7. Screens and copy

- **Title.** `MODES` gains `"puzzle"`. `MORE_TOPICS` gains `"puzzle"`, after
  `"classic"`.
- **HUD.** Round, Score and Streak as now, plus **Par** as a fourth entry: a
  `par?` prop on `GameHud`, beside `capacity?`. Puzzle shows no
  `CapacityMeter`, as Classic shows none.
- **Ledger.** `PuzzleLedger` takes `EquationBoard`'s place in Puzzle. The slots
  stay below it, so the §1.12 order (HUD → equation and slots → phase action →
  rail → rack) holds. It is an `<ol>` of the eight rows:
  - **played rows**: the equation and an ink ✓ or ✗, with no semantic colour,
    since §1.12 allows colour only at the moment of the event;
  - **the current row**: `aria-current="step"`, its equation rendered by
    `EquationBoard`, so it keeps the existing 10b rise, and its pay as small
    `Tile`s;
  - **the row just submitted** is played and current at once, until the round
    advances: it keeps the current row's frame, `aria-current` and
    `EquationBoard`, and shows its ✓ or ✗ in place of its pay;
  - **later rows**: the equation and the pay as small `Tile`s.

  No motion is added. A row's change of state is instant, and rewards arrive in
  the rack by the existing treatment. Nothing flies from the ledger to the
  rack. Each row's accessible text is "Row 3, 3 × 3, pays 2 and 7", with the
  pay read as a list in the current language, plus "answered" or "missed" once
  played.
- **Rack.** `capacity` 5, not stepped. A non-stepped rack draws as many sockets
  as its capacity, but its grid is a fixed `5 × 2` (`--rack-rows: 2` in
  `TileInventory.module.css`), so at five it would reserve an empty second row.
  The rack sets `--rack-rows` from the capacity, giving one row of five at
  Endless's tile tiers. Overflow and the rail are Endless's.
- **Game over.** `won` means a Classic win in three places today: the final
  hand drawn at `CLASSIC_FLOOR` sockets, `winReason` and `winTitle`. Like
  `getCapacity`, every mode but Endless would fall into Classic's branch. So
  `GameOverScreen` and `shareHeading` branch on `stats.mode` first, and
  Puzzle's `won` picks only its heading and that heading's gold.
  - **Heading:** **Made par** in gold, as Run Complete, or **{n} short of par**
    in ink. It depends only on score against par.
  - **Terminal:** an early end keeps the terminal equation and the existing
    loss reason. A table played to its end shows no equation and the reason
    "All eight rows played." This depends only on how the run ended.
  - **Stats:** Score as "6 / 8" (primary), Par, Longest streak. Rounds played
    is dropped, since it repeats the score's denominator.
- **Sharing.** `ShareStats` gains `{ mode: "puzzle"; won: boolean; par: number }`,
  with `won` from `isParMade`. Text:

  ```text
  ozterisk Puzzle — Made par — Score: 7/8 · par 7
  Longest streak: 4

  Can you make par?
  https://…
  ```

  "Can you make par?" replaces "Can you beat it?", which has no referent without
  a shared table. Nothing names the table, and nothing claims to be verified
  (§1.15).
- **Keyboard.** Unchanged. `R` at game over deals the next table, and it steps
  through the playtest set too.
- **Gallery.** It gains a Puzzle answering state (the sample at row 1), which
  the layout check reads, and a Puzzle game-over state.

### 7.1 Copy

"Par" is rendered 목표 ("the target"), Ori's choice over 최선 and 파. The rest of
the Korean is a draft for Ori to judge.

| Key | English | Korean |
|---|---|---|
| `mode.puzzle` | Puzzle | 묘수풀이 |
| `mode.puzzleHint` | Every tile face up | 모든 타일을 펼쳐 놓고 |
| `howToPlay.puzzle` | Puzzle deals five tiles and eight equations face up, each printed with the tiles it pays. A correct answer takes its row's tiles, and your hand holds five. Par is the best score the table allows. A wrong answer is a legal move. | 묘수풀이는 타일 다섯 개와 문제 여덟 개를 모두 펼쳐 놓고 시작하며, 문제마다 받을 타일이 적혀 있습니다. 정답을 맞히면 그 줄의 타일을 받고, 손에는 다섯 개까지 보관합니다. 목표는 이 판에서 낼 수 있는 가장 높은 점수입니다. 오답도 둘 수 있는 한 수입니다. |
| `hud.par` | Par | 목표 |
| `ledger.label` | Table | 판 |
| `ledger.row` | Row {row}, {left} × {right}, pays {pay} | {row}번째 줄, {left} × {right}, 보상 {pay} |
| `ledger.answered` | answered | 정답 |
| `ledger.missed` | missed | 오답 |
| `gameOver.parTitle` | Made par | 목표 달성 |
| `gameOver.shortTitle` | {short} short of par | 목표까지 {short}점 부족 |
| `gameOver.tableReason` | All eight rows played. | 여덟 줄을 모두 풀었습니다. |
| `share.puzzleAsk` | Can you make par? | 목표를 달성할 수 있나요? |

The Korean share heading uses `mode.puzzle` and the titles above, as Classic's
does.

## 8. Testing

Test-first throughout. Record each test's expected failure before the code.

- **`puzzle.ts`**: the §5.3 controls. `dealPuzzle` under a scripted
  `RandomSource` returns an in-band table, and a source that never lands in band
  returns a solved table at the cap. Each playtest table matches its recorded
  par, only-moves and `sacrificeRequired`, and the set's third table equals the
  fixture's sample.
- **Reducer**: a Puzzle start or restart without a table is refused. The row's
  pay is accepted, and wrong digits, the wrong order or the wrong count are
  refused. A correct answer at five tiles overflows. The run ends after row 8
  and on an early loss. `isRunComplete` and `isParMade` hold. The sample's par
  line replays to 7. The Endless and Classic suites stay green untouched.
- **App integration** (RTL): play the sample's par line through the UI, sacrifice
  included, to "Made par"; one early loss; the Puzzle share text in en and ko;
  the title's three modes.
- **Browser suite** (Playwright; geometry only, as `product.md` §1.17 permits):
  in Puzzle's answering state the HUD, ledger, slots, actions and rack fit
  without page scroll at 393 × 660 and at 375 wide, and the title with three
  modes does not overflow.
- **Manual**: on Ori's iPhone 13 mini, time from Start Run to the first row is
  under 100 ms. Then the playtest.

## 9. Milestone and merge gate

### 9.1 Tasks

`M8 — Puzzle Prototype`, one branch (`feat/M8-puzzle-prototype`), one PR, one
commit per task (AGENTS.md §4.4):

| Task | Outcome |
|---|---|
| T85 | `puzzle.ts`: solver, myopic bot, planted deal, `dealPuzzle`; the dials |
| T86 | Types, selectors, factories and reducer for Puzzle |
| T87 | App wiring, `AppDependencies.dealPuzzle`, the playtest set, and Puzzle on the title's mode select |
| T88 | HUD, `PuzzleLedger`, the one-row rack, the title's Puzzle topic, the gallery's answering states, and the layout check |
| T89 | Game over, sharing and copy, and the gallery's game-over state |
| T90 | After a pass only: strip the playtest set and amend the spec (§9.3) |

The layout check lands with the ledger, not after it: if eight rows do not fit
393 × 660, the ledger is redesigned before anything is built on top of it.

### 9.2 Flow

1. This spec is the branch's first commit.
2. The draft PR opens early, so Vercel builds a preview to playtest. The
   project's previews have no password or SSO protection (Vercel project
   settings, read 2026-10-19), so testers open the preview link directly.
3. The playtest result goes to `main` in its own journal PR.
4. **Pass:** T90 lands, and the PR is marked ready.
5. **Fail:** the PR closes unmerged. The result's journal PR also records that
   `M8`'s row in `roadmap.md` never reached `main`, since it rode on this branch.

### 9.3 Amendments a merge needs

- `product.md`: §1.1 (three modes), §1.2 (the deal and its randomness), §1.3
  (the opening hand), §1.5 (the row's pay), §1.7a (Puzzle's capacity), §1.8 (the
  end and made par), §1.10 (the HUD's par), §1.14 (copy).
- `ui-i18n.md`: §1.12 (the one-row rack and the ledger), §1.15 (the Puzzle share
  format).
- `docs/plan/traceability.md`: the new requirements and their evidence.

## 10. Risks

- **Nobody reads the ledger.** This is the draft's own biggest risk, and the
  playtest exists to find it.
- **The phone layout.** Eight rows, the slots and a rack on a 660px viewport is
  tight; the draft's mock is 900px tall with its annotation. T88's check is the
  gate, and a failure redesigns the ledger before the playtest, not after.
- **Port drift.** The calibration in §5.3 is the guard. If the q = 0.6 cell
  misses 14.6% by more than sampling noise, the port is wrong.
