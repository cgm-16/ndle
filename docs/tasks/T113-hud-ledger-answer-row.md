---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 3, 7, 11
  - docs/spec/ui-i18n.md  # §1.12 Layout, ledger, Answering
  - src/components/GameScreen/
  - src/components/GameHud/
  - src/components/PuzzleLedger/
  - src/components/EquationBoard/
  - src/components/AnswerSlots/
  - src/components/Mark/Mark.tsx
  - src/i18n/messages.ts
  - e2e/fit.spec.ts
---

# T113 — HUD, ledger and answer row in B

```yaml
task_id: T113
title: HUD, ledger and answer row in B
milestone: M17 — Identity: The Table in Play
priority: P0
estimate: M
wave: W6
depends_on: [T112]
parallel_safe: false
paths:
  - src/components/GameScreen/
  - src/components/GameHud/
  - src/components/PuzzleLedger/
  - src/components/EquationBoard/
  - src/components/AnswerSlots/
  - src/i18n/messages.ts
  - e2e/fit.spec.ts
  - e2e/accessibility.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

**What this task builds:** the top half of the table in play, which is the
HUD, the face-up ledger, and the row the player is answering.

**The fixed band:** it holds the answer row and the actions while answering.
Feedback (T115) and overflow (T114) swap their content into the same band, so
the rack stays where it is.

## Values (the prototype's game screen), top to bottom

**HUD:** one row, 28 px tall, 15 px (`--type-hud`).
- It keeps its `dl`. Each `dt` and `dd` pair sits inline, for example
  `Row 1/8`, `Score 3`, `Streak 2`, `Par 7`, in that order.
- The score's value is 700.
- The streak value has no hue, and keeps its fall and zero hooks; T116
  retimes them.

**Ledger:** an `ol`, 8 px below the HUD, with a gap of 2 px between rows.
- It spans the arena's full content width; the cap to the rack's width is
  deleted.
- Each row stays one accessible string (`ledger.row`). The visible parts are
  `aria-hidden`, as today.

| Row | Height | Look |
|---|---|---|
| Current | 52 | grid `40px minmax(0, 1fr) auto`, padding `0 10px`, gap 8. Raised fill, a `2px` blue border, radius 6, `aria-current="step"`. Cells: `ledger.now` at 13 px, 700, in blue; the equation `3 × 5` (no `=`) at `--type-row-current` (24), 700; `ledger.pays` at 12 px in dust, then the pay tiles, 28 × 28, chalk, slate digits at 16 px, 700, radius 4 |
| Answered | 30 | the same grid, a `1px` hairline bottom border. The row number at 14 px in dust, the equation at `--type-row` (17), then a `Mark` (18 px) and `ledger.answered` at 15 px, 700, in chalk |
| Missed | 30 | as answered, with `ledger.missed`, and the `Mark` and the word in pink |
| Future | 30 | dust text. The pays are 24 × 24 outlined boxes, a `1.5px` dust border, radius 4, digit 14 px |

The prototype draws the rows at 32 px. They are 30 px here for the feedback
band's margin (plan, ruling 3).

**The band** starts 12 px below the ledger. It is a fixed 150 px in every
phase, so the rack never moves.
- Answering fills 120 px of it from the top: the answer row, a 12 px gap and
  the actions.
- Feedback (T115) fills all 150 px, and overflow (T114) about 142.
- At 393 × 660 with 30 px rows, the answering screen comes to about 638 px.
- **Answer row,** 60 px tall:
  - the prompt `3 × 5 =` at `--type-prompt` (30), 700. `EquationBoard`
    moves here from the ledger, and keeps its rise hook;
  - then the slots, 52 × 56, gap 10;
  - a filled slot is a chalk button with a slate digit at 28 px, 700,
    radius 6 and a `0 3px 0` dust edge;
  - an empty slot is a `2px` dashed dust outline, radius 6.
- **Actions,** 12 px below, 48 px tall:
  - Clear (`flex: 1`, secondary, 16 px), then Submit (`flex: 2`, primary,
    17 px), 12 px apart;
  - in tab order, Clear comes before Submit, as drawn.

**§1.12's order** becomes: Back (bar) → HUD → ledger → answer row → phase
action → rail (in the band; T114) → rack.

## Copy

| Key | en | ko |
|---|---|---|
| `hud.round` (changed) | `Row` | `줄` |
| `ledger.now` (new) | `Now` | `지금` |
| `ledger.pays` (new) | `pays` | `보상` |
| `howToPlay.progress` (changed) | `Row shows which row of the table is current, score counts correct answers, and streak counts consecutive correct answers. The table ends after row 8, or sooner once you hold fewer tiles than the next answer needs.` | `줄은 지금 풀고 있는 판의 줄을, 점수는 정답 횟수를, 연속 정답은 이어지는 정답 횟수를 나타냅니다. 판은 8번째 줄을 풀면 끝나고, 다음 답에 필요한 타일보다 보유한 타일이 적어지면 더 일찍 끝납니다.` |

The HUD's round value reads `{round}/{totalRounds}`, for example `1/8`.

## Steps

- [ ] **Tests:**
  - `GameHud.test.tsx`: the terms are `["Row", "Score", "Streak", "Par"]`,
    and the round's value is `1/8`.
  - `PuzzleLedger.test.tsx`:
    - the current row shows `Now` and `pays` visibly;
    - an answered row shows a `Mark` with `data-shape="check"` and
      `answered` in en, and `"circle"` and `정답` in ko;
    - a missed row shows `"cross"`;
    - each row's accessible name is still `ledger.row`.
  - `GameScreen.test.tsx`:
    - the prompt `L × R =` is in the answer row, not the ledger;
    - Clear comes before Submit in tab order.

  Record the failures.
- [ ] **Implement** the values above. Each file's comments that cite the old
      palette go.
- [ ] **Remove** every `answering-*` and `interaction-*` key from
      `fit.spec.ts`'s `KNOWN_MISSES`, including their `ring` keys. They must
      fit in en and ko at both sizes.
- [ ] **Amend `ui-i18n.md`:**
  - §1.12: the order, the ledger, and "Answer slots are 52 × 56";
  - §1.14: the copy table.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(play): HUD, ledger and answer row in B`, with
      `Task: T113`.

## Acceptance gate

- The HUD, ledger and GameScreen tests are green in en and ko.
- Every answering and interaction state fits at `393 × 660` and
  `375 × 660` in en and ko, with no `ring` miss.
