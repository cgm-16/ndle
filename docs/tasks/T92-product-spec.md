---
reads:
  - docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md  # §2, §5, §6
  - docs/superpowers/specs/2026-10-19-puzzle-prototype-design.md  # §3 rules, §5 deal, §7 screens
  - docs/spec/product.md
  - src/game/puzzle.ts
---

# T92 — `product.md` for 9dle

```yaml
task_id: T92
title: product.md for 9dle
milestone: M11 — ndle's Rules
priority: P0
estimate: M
wave: W0
depends_on: [T91]
parallel_safe: false
paths:
  - docs/spec/product.md
```

## Why

`docs/spec/**` is canonical, yet it has never described Puzzle: M8's spec
amendments never landed. It covers Endless and Classic only. This task
writes 9dle's rules into it. The section numbers stay where they still
apply, so cross-references keep resolving.

## Steps

- [ ] **Rewrite `docs/spec/product.md`.** Each section gets the content below.
      "Keep" means the current text minus anything about faces, Classic or
      Endless.

| § | Title | Content |
|---|---|---|
| 1.1 | Product thesis | 9dle is a planning puzzle. Every table is face up, nothing is random after the deal, and the run is judged against par. Keep the tile triad (resource, consumable, inventory). |
| 1.2 | The table | Five distinct digits and eight rows, each a pair from the 45-pair pool, shown in either order, with a pay of `getRewardCount` printed digits. |
| 1.2a | Practice deals | `dealPuzzle(Math.random)`: planted, solved and accepted in band (`par ≥ PUZZLE_MIN_PAR`, the myopic bot below par, `onlyMoves ≥ PUZZLE_MIN_ONLY_MOVES`), with at most `PUZZLE_DEAL_ATTEMPTS` tries. Play Again deals a new table. A Practice table is never replayed or shared. |
| 1.2b | The daily list | Numbered from launch day, which is #1. The local date picks the number. Each table is in the band and has `sacrificeRequired`. The list is chosen offline by `scripts/daily/generate.ts`. A slot freezes once its date arrives, a veto touches only future slots and the generator refills it. The review file is local and git-ignored. More tables are generated before the list runs out. Before launch or past the list's end there is no Daily that day. The launch date is set once and never changed after launch. |
| 1.3 | Initial run state | The hand opens full at five, sorted. Row 1 is current. Score, streaks and rounds start at 0. |
| 1.4 | Answer construction | Keep. |
| 1.5 | Correct submission | Spend the tiles and take the row's pay in printed order. Score +1. |
| 1.6 | Incorrect submission | Keep, plus: a deliberate miss is the sacrifice, with no control of its own. |
| 1.7 | Overflow | A correct answer at a full hand is one over capacity. The newest arrival waits on the rail, and one discard completes it and advances the round. Keep "sort only what fits". |
| 1.8 | End and par | The run ends after row 8, or earlier when the hand holds **fewer tiles than the next answer needs**. A hand with enough tiles but the wrong digits plays on. Par is the solver's best score, shown before the first move. Made par is a game over with score equal to par. |
| 1.9 | Statistics | Score, current streak, longest streak and rounds played. Longest streak is within one table: there is no daily streak. |
| 1.10 | Screens | The title offers Daily and Practice. The game screen has the HUD (round, score, streak, par), the ledger, the slots, the actions and the rack. Two game-over variants follow; their content is T108's. A Daily resumes when opened again that day, and once finished it shows its result until the next table. |
| 1.11 | Keyboard | Keep. `R` deals a new table at a Practice game over only. It does nothing at a Daily game over. |
| 1.17 | Out of scope | Keep the list, with three changes. Delete "Saved best score or history" and "Seeded/replayable runs". Add "A daily streak or history across days", "Replaying or sharing a Practice table" and "Starting a Daily over". Keep "Result pages or result parameters": the table number travels only inside the share text. |

- [ ] **Delete §1.4a (face tiles) and §1.7a (Classic capacity).** Leave a
      one-line tombstone under each number, "Removed with Classic (T97)", so
      that old references still resolve.
- [ ] **Check:**
      `grep -nE "seed|replayable|Saved best|Endless|Classic|face tile" docs/spec/product.md`
      prints only the §1.17 lines above and the tombstones.
- [ ] **Commit:** `docs(spec): product rules for 9dle`, with `Task: T92`.

## Acceptance gate

- §1.8's end rule contains the exact words "fewer tiles than the next answer
  needs".
- §1.2b names the freeze rule, the veto rule and the launch-date rule.
