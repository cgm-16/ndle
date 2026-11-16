---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 8, 10, 13
  - docs/spec/ui-i18n.md  # §1.12 Game over, §1.15 Sharing
  - src/components/GameOverScreen/
  - src/services/sharing.ts  # formatShareText, getShareStats
  - src/app/App.tsx
  - src/game/types.ts  # RoundResult, GameState.rowResults
  - src/game/balance.ts  # PUZZLE_ROWS
  - src/gallery/states.tsx
  - e2e/fit.spec.ts
---

# T112 — Game over in B, with row marks

```yaml
task_id: T112
title: Game over in B, with row marks
milestone: M16 — Identity: Title and Game Over
priority: P0
estimate: M
wave: W5
depends_on: [T111]
parallel_safe: false
paths:
  - src/components/Mark/
  - src/components/GameOverScreen/
  - src/app/App.tsx
  - src/app/App.test.tsx
  - src/i18n/messages.ts
  - src/gallery/
  - e2e/fit.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

**Game over** is what a Daily player sees for the rest of the day. B adds the
row marks and a preview of the share text, and the Daily number joins the
heading (plan, rulings 8 and 10).

**`Mark`** is the one correct-or-wrong mark. Game over, the ledger (T113)
and the verdict (T115) all use it. It is an SVG because Gothic A1 has no
✓ or ✗, and has ○ only in a slice the app doesn't load.

## Interfaces

**Produces:**

```ts
// src/components/Mark/Mark.tsx
export interface MarkProps { result: RoundResult["kind"] }
/** aria-hidden inline SVG, 1em square, stroked in currentColor.
    "correct" draws ✓ in en and ○ in ko; "incorrect" draws ✗ in both.
    It sets data-shape="check" | "circle" | "cross" for tests. */
export function Mark(props: MarkProps): JSX.Element;
```

**`GameOverScreenProps` changes:**
- it gains `rowResults: readonly RoundResult["kind"][]`, which App passes
  from `state.rowResults`;
- it loses `equation`, because the stopped-on equation is no longer drawn
  (ruling 13);
- the marks list has `PUZZLE_ROWS` entries, and a row past
  `rowResults.length` is unplayed.

## Values (the prototype's game over), top to bottom

1. **Heading:** one `h1`.
   - **Daily:** the first line is `gameOver.dailyNumber`, 15 px, 700, in
     dust, `display: block`; then the verdict.
   - **Practice:** the verdict only.
   - The verdict, `gameOver.parTitle` or `gameOver.shortTitle`, is
     `--type-prompt` (30), 700, in chalk.
2. **Reason:** `gameOver.tableReason` or `gameOver.reason`, 14 px, in dust.
3. **Score:** `7 / 8` at `--type-score` (52), 700.
4. **Cards:** Par and Longest streak, side by side.
   - Each card is raised, radius 6, 52 px tall, padding `0 12px`.
   - Its label is 13 px in dust, and its value `--type-value` (20), 700.
5. **Row marks:** an `ol` labelled `gameOver.rowsLabel`, 8 equal columns,
   gap 6, 32 px tall, radius 4.

   | Row | Look | Mark |
   |---|---|---|
   | answered | chalk fill | a slate `Mark` |
   | missed | `1.5px` pink outline | a pink `Mark` |
   | unplayed | `1.5px` dashed socket outline | none |

   Each `li` has `aria-label` from `gameOver.rowMark`, with `{result}`
   being `ledger.answered`, `ledger.missed` or `gameOver.unplayed`.
6. **Next table** (Daily only): `gameOver.nextTable`, 15 px, in dust, in a
   class of its own, not `restartHint`.
7. **Share preview:** a label, `gameOver.shareText`, 12 px in dust, then a
   box holding exactly `formatShareText`'s output for this game.
   - The box is raised, radius 6, padding `8px 10px`, 13 px with an 18 px
     line height, `white-space: pre-line`.
   - It is the text Share sends, so it never names a row.
8. **Share and Copy Result,** side by side, each `flex: 1`, 48 px tall.
   - Share is the primary at 17 px; Copy Result is the secondary at 16 px.
9. **The last button,** a secondary, 48 px tall:
   - **Daily:** Practice;
   - **Practice:** Play Again, then `gameOver.restartHint`, 13 px in dust,
     centred.
10. **Status:** `role="status"`, 14 px, 18 px tall, centred.

## Copy

New keys:

| Key | en | ko |
|---|---|---|
| `gameOver.rowsLabel` | `Rows` | `줄별 결과` |
| `gameOver.rowMark` | `Row {row}: {result}` | `{row}번째 줄: {result}` |
| `gameOver.unplayed` | `not played` | `풀지 않음` |
| `gameOver.shareText` | `Share text` | `공유 문구` |

## Steps

- [ ] **Tests** `src/components/Mark/Mark.test.tsx`:
  - `correct` has `data-shape="check"` in en and `"circle"` in ko;
  - `incorrect` has `"cross"` in both;
  - the mark is `aria-hidden`.
- [ ] **Tests** in `GameOverScreen.test.tsx`, in en and ko:
  - the Daily `h1`'s accessible name is `Table #12 Made par` /
    `12번째 판 목표 달성`, and Practice's is the verdict alone;
  - the marks list is named `Rows` and holds 8 items labelled by row, with
    unplayed rows past the run's end;
  - the preview's text equals `formatShareText`'s output exactly, in both
    variants;
  - Share comes before Copy Result, which comes before Practice or Play
    Again;
  - Practice keeps `R` and its hint, and Daily has neither;
  - the next-table line renders only in the Daily.

  Record the failures.
- [ ] **Implement** `Mark`, the screen, and App's new prop.
- [ ] **Remove** every game-over key from `fit.spec.ts`'s `KNOWN_MISSES`.
      Each game-over state must fit in en and ko at both sizes.
- [ ] **Amend `ui-i18n.md` §1.12, Game over:**
  - the order above;
  - the row marks and the share preview;
  - "After an early end, `gameOver.reason` says why, and the row marks show
    where the run stopped", in place of the terminal row;
  - §1.14 gets the copy table.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(game-over): game over in B, with row marks`, with
      `Task: T112`.

## Acceptance gate

- The Mark and GameOverScreen tests are green in en and ko.
- Every game-over state fits at `393 × 660` and `375 × 660` in en and ko.
- The share preview matches the shared text exactly.
