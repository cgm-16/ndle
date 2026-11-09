# Puzzle spin-off — design

Date: 2026-11-09
Status: approved by Ori, 2026-11-09. "Puzzle spin-off" is a working title
until the game's name is chosen.
Owner: Ori (`cgm-16`).
Home: recorded in ozterisk until the new repo exists, then moved there as its
first design doc. Decision record: ozterisk `docs/journal/journal-2026-11-09.md`.

## 1. Intent

ozterisk's M8 prototyped **Puzzle**: five digit tiles and eight multiplication
rows dealt face up, played against par. Ori's judgement is that the pitch is
strong but the mode does not fit ozterisk. ozterisk's thesis (`product.md` §1.1)
is an inventory loop under random draws; Puzzle is a planning puzzle with
nothing random after the deal. So Puzzle leaves ozterisk and becomes its own
game, with its own name and identity.

As its own game it is free of ozterisk's lines against seeds and replayable
runs (ozterisk `AGENTS.md`; `product.md` §1.17). That opens the form that suits
a puzzle: **a daily table, the same for everyone, chosen ahead of time so that
every day's table needs a sacrifice.** On M8's live deals only about 1 accepted
table in 140 needs one (ozterisk journal 2026-10-19), so random play rarely
shows the moment the pitch is built on.

## 2. The game

### 2.1 Rules

M8's rules, unchanged. The source is M8's design spec §3,
`docs/superpowers/specs/2026-10-19-puzzle-prototype-design.md` at `3ccd37b`.

- **Table.** An opening hand of five distinct digits and eight rows. Each row is
  a multiplication and its **pay**: the digits a correct answer takes, two for a
  one-digit product and three for a two-digit one.
- **Hand.** Five sockets. A correct answer spends the answer's tiles and takes
  the row's pay, so a correct answer at a full hand forces one discard.
- **Wrong answers** spend the tiles and take nothing. A deliberate one is a
  **sacrifice**: an ordinary wrong submission, with no control of its own.
- **End.** After row eight, or earlier when the hand holds fewer tiles than
  the next answer needs. A hand with enough tiles but the wrong digits can still
  answer wrong and play on. The solver and every par assume this rule.
- **Par** is the solver's best score for the table, shown before the first
  move. A score equal to par is **Made par**.

### 2.2 Two modes

**Daily**
- One table per day, the same for everyone.
- "Today" is the player's local date. Tables are numbered from launch day, which
  is #1.
- One attempt per day. The result is saved on the device, and reopening the game
  that day shows the result instead of the table.
- A table in progress resumes, as Wordle does (Ori, 2026-11-09). Each move is
  saved as it is made. Reopening the game that day replays the saved moves
  through the reducer and carries on from there. Given its table, the game is
  deterministic, so the replay rebuilds the exact state. There is no way to
  start the day over.
- The game-over screen shows the result, when the next table arrives, and Share.
- Practice stays open after the daily is played.

**Practice**
- A fresh random table each time, dealt live as M8 deals now: `dealPuzzle` and
  its acceptance band (par at least `PUZZLE_MIN_PAR` 7, the myopic bot below
  par, at least `PUZZLE_MIN_ONLY_MOVES` 2 only-moves).
- Play Again deals a new table. There is no way to replay or share a specific
  table.

### 2.3 Where the daily tables come from

- The solver chooses them ahead of time, never at run time. A generator plants
  tables, solves them, and keeps those in M8's band that also need a sacrifice
  (`solvePuzzle`'s `sacrificeRequired`). It writes a year of them, numbered, as a
  data file that ships with the game.
- Ori can veto any table whose date hasn't come. The generator refills a
  vetoed slot.
- A slot freezes once its date arrives, so a table number always means one
  table, in stored results and in posted share texts alike.
- The generator also writes a review file showing each table, its par line and
  where the sacrifice falls. Launch doesn't wait for Ori to review all 365.
- Because it runs offline, the 1-in-140 rate costs only compute time.
- More tables are generated before the list runs out.

### 2.4 Sharing

- **Daily:** the share text names the table number, the score against par, and
  the game's link. It does not reveal the table's rows.
- **Practice:** the share text gives the score against par, as M8's does.
- No result URLs.

### 2.5 Saved on the device

The language preference, and today's daily: its table number, the moves made
so far, and the outcome once it ends. Nothing else: no Practice run, and no
daily streak.

## 3. Identity

- The game has its own name, in English and Korean, and its own identity. It
  reuses none of ozterisk's name, wordmark, Tile House palette or type.
- The identity is being designed on a Claude design canvas, private to Ori. It
  holds a brief, updated to match this design, and screenshots of M8.
- **Screens:**
  - title, with the choice of Daily or Practice;
  - a table in play, including the state after a miss and the overflow
    discard;
  - game over, in a Daily and a Practice variant.
- **Two of M8's states don't fit a phone.** After a miss, Next Round sits
  just below a 660 px window. An overflow discard makes the page 859 px tall
  and scrolls the played rows off the top, and it ends 5 of the 8 rows on a
  par line (ozterisk journal 2026-10-19). Ori accepted both for M8's playtest
  only. Here §6's fit rule holds, so the canvas draws both states and the
  build makes them fit.

## 4. How it gets made

- **Repo.** A new GitHub repo, created by Ori on GitHub's website once the name
  is chosen. GitHub won't fork a repo into the account that owns it, and agents
  can't create repos. It is seeded with ozterisk's history up to M8's tip,
  `3ccd37b`, so the trail stays.
- **ozterisk sources.** The ozterisk docs this design cites are on ozterisk's
  `main`, which the seed doesn't include:
  - the journal entries for 2026-10-19 and 2026-10-26;
  - `product.md` §1.1 and §1.17.

  ozterisk is a public repo, so the new repo cites them by link
  (https://github.com/cgm-16/ozterisk) and doesn't copy them.
- **Order.** The generator, Daily, the device storage and the strip-out don't
  wait for the identity. They are built on placeholders, and the UI is
  restyled when the design canvas hands off: name, Korean name, fonts with
  Hangul coverage, palette, keyframes and copy.
- **Stack**, unchanged from ozterisk: Vite, React, TypeScript, a pure
  `useReducer` reducer, CSS Modules, Vitest and React Testing Library. It gets a
  Vercel project of its own.
- **Removed from the code:**
  - Endless, Classic and face tiles, with whatever only they use;
  - the preview's fixed playtest set: `src/game/playtestTables.ts` and its
    wrapper in `src/main.tsx`;
  - ozterisk's name, wordmark, fonts, palette and copy.
- **Rules rewritten.** `AGENTS.md` and `docs/spec/**` are rewritten for the new
  game, not reinterpreted. ozterisk's `AGENTS.md` says "do not generate,
  display, encode, or share run seeds" and "Do not implement a leaderboard,
  result URLs, saved records…". Agents follow those lines as written, so a
  daily table list would be refused under them.

## 5. Goals, non-goals, anti-goals

**Goals**
- A deployed, bilingual daily puzzle with a Practice mode, in its own identity.

**Non-goals**
- The window (M10). It is mothballed in ozterisk and not part of this game.
- Accounts, a server, leaderboards, a daily streak.
- Replaying or sharing a specific Practice table. Result URLs.
- Sound.

**Anti-goals**
- A daily table that doesn't need a sacrifice. That would be a Practice table
  with a number on it.
- A share text that spoils the day's table.

## 6. Constraints carried from ozterisk

These come from ozterisk's `AGENTS.md` and spec, and hold unless Ori changes
them:

- Client-only: no backend, accounts or analytics.
- Self-hosted fonts and zero non-origin requests.
- English and Korean through a typed in-code dictionary, with no i18n
  dependency.
- Phone first: every screen fits 393 × 660 without scrolling, and 375 wide. It
  also works on desktop, with mouse, touch and keyboard.
- State is never shown by colour alone.
- No animation library: CSS transitions, plus a named set of keyframes that the
  new identity defines.
- No sound.
- Test-first with Vitest and React Testing Library. A browser suite only for
  layout geometry.
- The reducer stays pure: no randomness, no date and no storage inside it. The
  date picks the daily table at the boundary, as randomness does now.

## 7. Left to the builder

- What ozterisk docs stay in the tree. Git history keeps all of them.
- The generator's tooling and output format, and how a veto is recorded.
- How the device storage is keyed and versioned.
- How the Daily game-over screen states when the next table arrives.
- Milestones and the task split.

## 8. Calls Claude made, for Ori to check

- "Today" is the local date, and tables are numbered from launch day.
- One attempt is enforced only by device storage. There is no anti-cheat.
- No daily streak and no result URLs.
- Practice uses M8's band unchanged.
- The daily share text doesn't reveal the rows.
- The list covers a year: 365 tables.
- A slot freezes once its date arrives. Vetoes touch only future slots, and
  launch doesn't wait for a full review.
- The canvas draws the after-miss and overflow states, and the build makes
  them fit 393 × 660.
- Logic is built before the identity arrives, and the UI is restyled after.
- ozterisk docs are cited by link, not copied.
- The constraints in §6.

## 9. Related, outside this design

- **ozterisk:** a journal entry records the split. #205 closes unmerged, and M10
  (#207, #209) is mothballed.
- **ozterisk's next experimental mode:** whether ozterisk still uses M8's
  baseline playtest to pick it is an ozterisk question.
