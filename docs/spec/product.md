# 9dle Product Specification

Canonical game rules (§1.1–§1.11, §1.17). The visual, language, copy, sharing,
and persistence contracts (§1.12–§1.16) live in `docs/spec/ui-i18n.md`.

### 1.1 Product thesis

9dle is a planning puzzle. Every table is face up, nothing is random after the deal, and the run is judged against par. A digit tile is simultaneously:

1. a resource required to construct an answer;
2. a consumable spent on every submission; and
3. an inventory-management choice because correct play returns one net tile before capacity resolution.

It has two modes: **Daily**, one shared table a day, and **Practice**, a table dealt live on demand. The PoC validates whether this loop is understandable and engaging. It does not validate competition, retention, monetization, anti-cheat, or online services.

### 1.2 The table

- A table is five distinct opening digits and eight rows.
- Each row is an equation drawn from the 45 unordered pairs `(a, b)` where `1 <= a <= b <= 9`, shown in either order. `3 × 7` and `7 × 3` are presentations of one pool entry.
- Operands are integers `1` through `9`, inclusive. Products range from `1` through `81`; an answer therefore has exactly one or two decimal digits.
- Each row has a pay of `getRewardCount` printed digits: 2 for a one-digit product and 3 for a two-digit product. The pay is printed on the table, so nothing is random after the deal.
- Immediate repetition is legal.

### 1.2a Practice deals

- A Practice table is dealt live with `dealPuzzle(Math.random)`: a table is planted, solved, and accepted when it is in band (`par ≥ PUZZLE_MIN_PAR`, the myopic bot scoring below par, and `onlyMoves ≥ PUZZLE_MIN_ONLY_MOVES`), with at most `PUZZLE_DEAL_ATTEMPTS` tries.
- **Play Again** deals a new table.
- A Practice table is never replayed or shared: there is no way to replay it, and no share text gives its rows. Its run still has a share text with the score against par (`ui-i18n.md` §1.15).
- Tests provide deterministic `RandomSource` functions.

### 1.2b The daily list

- Daily tables are numbered from launch day, which is #1. The player's local date picks the number.
- Each table is in the same band as a Practice deal and has `sacrificeRequired`.
- The list is chosen offline by `scripts/daily/generate.ts`. The generator's review file, `scripts/daily/review.md`, is committed.
- **Freeze rule.** A slot freezes once its date arrives. A **veto** touches only future slots, and the generator refills the vetoed slot.
- **Launch-date rule.** The launch date is set once and never changed after launch.
- More tables are generated before the list runs out. Before launch, or past the list's end, there is no Daily that day.
- **Known limit** (Ori, 2026-11-09): the shipped bundle holds every future table, and the solver ships with Practice, so anyone can read ahead and solve. The committed review file adds convenience, not information. Seeding would not change this, because the generator would ship too. Only a server releasing each day's table would hide it, and the game is client-only.

### 1.3 Initial run state

- The hand opens full at the capacity of `5` (a tuning dial; see § Tuning surface), holding the table's five digits, sorted ascending.
- Score: `0`.
- Current streak: `0`.
- Longest streak: `0`.
- Submitted rounds: `0`.
- Current row ordinal: `1`.
- Inventory display order: ascending digit; duplicates are ordered deterministically by tile ID.

### 1.4 Answer construction

- The product's canonical decimal representation determines the slot count.
- One-digit products show one answer slot.
- Two-digit products show two ordered answer slots.
- Clicking or tapping an inventory tile moves that exact tile into the leftmost empty slot.
- Pressing a digit key selects the first tile that holds the digit, in sorted inventory order.
- Duplicate digit tiles have no strategic distinction.
- A selected tile leaves the inventory row and appears in its answer slot.
- Clicking or tapping a filled slot returns that tile to the inventory.
- `Backspace` returns the most recently selected answer tile.
- Returned tiles are re-sorted into inventory.
- The player cannot select more tiles than there are answer slots.
- **Submit** and `Enter` are enabled only when all slots are filled.
- Slot order is answer order: selecting `5` then `6` constructs `56`; selecting `6` then `5` constructs `65`.
- Every row allows exactly one submission.
- An answer is correct when every slot's tile holds the digit that slot needs.

### 1.4a Face tiles

Removed with Classic (T97).

### 1.5 Correct submission

Given `N` submitted tiles:

1. Remove the `N` submitted tiles permanently.
2. Increment score by `1`.
3. Increment current streak by `1`.
4. Set longest streak to `max(previous longest streak, current streak)`.
5. Increment submitted rounds by `1`.
6. Take the row's pay: its printed digits, in printed order (§1.2).
7. Append the pay. Sort only the tiles that fit within the capacity (§1.7). The tiles past capacity are the newest arrivals, kept in arrival order, and sit on the rail.
8. Mark every pay tile as new for feedback presentation.
9. If inventory size exceeds the capacity, enter overflow resolution immediately.
10. Otherwise enter feedback with **Next Round** enabled.

The score is the number of correct submissions, not a product-, speed-, streak-, or difficulty-weighted value.

### 1.6 Incorrect submission

Given `N` submitted tiles:

1. Remove the `N` submitted tiles permanently.
2. Do not change score.
3. Reset current streak to `0`.
4. Preserve longest streak.
5. Increment submitted rounds by `1`.
6. Take no pay.
7. Show the submitted answer and correct answer.
8. Enter feedback with **Next Round** enabled.

An incorrect answer is legal even when the correct answer cannot be constructed from current tiles. The game never performs an exact-answer-constructibility loss check. A deliberate miss is the sacrifice: it is an ordinary incorrect submission, with no control of its own.

### 1.7 Overflow

- Capacity is `5` and is checked only after the pay has been inserted.
- A correct answer at a full hand leaves the hand one over capacity, so `excess = inventory.length - capacity` is `1`.
- The newest arrival waits on the rail, and one discard completes it and advances the round.
- The player may mark any owned tile: a seated tile, or a tile on the rail.
- A mark can be taken back until the discard completes.
- **The mark that reaches `excess` completes the discard.** No confirmation control is rendered. The collapse is driven by the player's action, never by a render.
- Completing the discard removes the marked tile. A rail tile that survives takes the socket the discard freed; the rest of the rack neither compacts nor re-sorts.
- Sort only what fits: the next round re-sorts the whole hand (§1.8).
- The round then advances on its own once the discard and the verdict's celebration have both visibly finished; there is no **Next Round** after a discard.
- The next row cannot begin while overflow remains unresolved.

### 1.7a Classic capacity

Removed with Classic (T97).

### 1.8 End and par

The run ends after row 8, or earlier when the hand holds **fewer tiles than the next answer needs**. A hand with enough tiles but the wrong digits plays on.

When the player advances:

1. If row 8 has been submitted, enter `gameOver`.
2. Clear `isNew` on surviving inventory tiles, and sort the whole inventory — the one re-sort per round.
3. Clear the previous answer selection, pending discards, and prior result.
4. Increment the row ordinal.
5. Compare `inventory.length` with the next row's answer-slot count.
6. If the hand has enough tiles, enter `answering`.
7. If the hand holds fewer tiles than the answer needs, enter `gameOver`.

The player advances with **Next Round** or `Enter` from feedback, or automatically when a discard finishes (§1.7).

The loss check compares tile count with the answer-slot count only:

```ts
inventory.length < getAnswerLength(equation)
```

**Par** is the solver's best score for the table, shown before the first move. **Made par** is a game over with a score equal to par. The terminal row remains visible to explain an early end. It is not counted as a submitted round.

### 1.9 Statistics semantics

| Field | Definition |
|---|---|
| `score` | Number of correct submissions |
| `currentStreak` | Consecutive correct submissions ending at the latest submitted round |
| `longestStreak` | Maximum `currentStreak` observed during the run, within one table; there is no daily streak |
| `totalRounds` | Number of submitted rows, correct or incorrect |
| `round` | One-based ordinal of the currently displayed row; in game over it is `totalRounds + 1` |

### 1.10 Screens

- The title offers **Daily** and **Practice**.
- The game screen has the HUD (round, score, streak, par), the ledger, the slots, the actions and the rack.
- Two game-over variants follow, one for Daily and one for Practice; their content is T108's.
- A Daily resumes when opened again that day, and once finished it shows its result until the next table.
- Every game and game-over screen has **Back** at the top, which returns to the title (Ori, 2026-11-09). Back is not a move: a Daily keeps its record and resumes, and a Practice run is dropped.
- Round, score, streak and par are never shown by colour alone.

### 1.11 Keyboard contract

| Phase | Key | Effect |
|---|---|---|
| `answering` | `0`–`9` | If a slot is empty, select the first matching digit tile |
| `answering` | `Backspace` | Return most recently selected answer tile |
| `answering` | `Escape` | Return every selected tile at once; no-op at zero selection |
| `answering` | `Enter` | Submit only if all answer slots are filled; a focused button retains normal browser behavior |
| `overflow` | `0`–`9` | Mark the first matching digit tile not already marked. The mark that reaches the required count completes the discard |
| `feedback` | `Enter` | Advance to the next row. Inert after a discard, which advances on its own |
| `gameOver` | `R` | Deal a new table, at a Practice game over only. It does nothing at a Daily game over. Accepts the key by either its value or its physical position, so neither a Korean IME nor a Dvorak layout can make it unreachable |
| `gameOver` | `Enter` | No global shortcut; a focused button retains normal browser behavior |
| `title` | `Enter` | No global shortcut; a focused button retains normal browser behavior |

Back has no key, because `Escape` already clears the selection.

Disabled keyboard actions are no-ops. Language changes are available in every phase and never reset game state.

In every phase a focused button retains normal browser behavior, and the global
shortcut bound to that key stands aside for it.

`gameOver` restarts on `R` rather than `Enter` because `Enter` cannot be made
safe there. A player advancing a run by keyboard — Submit, `Enter`, Submit,
`Enter` — destroys the score screen with the tap already in flight, before it can
be read or shared; measured as `{ reachedGameOver: true, survivedSecondEnter:
false, activeTag: "BODY" }`. `event.repeat` does not help, because it catches a
held key rather than two discrete presses, and scoping the shortcut to an unfocused
document fixes a different failure. `Enter` on the language toggle, which renders
buttons and is present in this phase, also restarted the run and discarded the
language change — contradicting the line above. `R` activates no button, so it
needs no focus guard.

The two failures are different, which is why the phases take different rules. On
`gameOver` the stray `Enter` arrives with focus on `BODY`, so no focus guard can
see it and the key itself has to change. In `answering`, `feedback` and
`overflow` a shortcut and a focused control compete for one key, and standing
aside is the whole fix: every control that wins the key reaches the same action
through its own activation. Without it, `Enter` on a focused **Clear** submitted
the answer rather than clearing it, spending tiles that submission does not give
back.

### 1.17 Explicitly out of scope

- Operand `0`.
- Division, addition, or subtraction modes.
- Difficulty curves — any weighting that adapts to player skill or escalates over a run.
- Timers.
- Multiple attempts.
- Skip buttons or a separate manual-discard action during answering.
- Exact-answer-constructibility loss detection.
- A daily streak or history across days.
- Replaying or sharing a Practice table. Its share text, the score against par, is in scope (§1.2a).
- Starting a Daily over.
- Result pages or result parameters: the table number travels only inside the share text.
- Leaderboards, authentication, backend APIs, databases, and server authority.
- Audio and haptics.
- End-to-end tests of game behavior. A browser suite is in scope only for
  layout properties jsdom cannot observe, and must assert no game rule,
  reducer transition, or interaction flow. §8.5's `320px` and Korean-clipping
  gates are unverifiable without one, because jsdom performs no layout.
- Analytics and telemetry.
- Offline/PWA behavior.
