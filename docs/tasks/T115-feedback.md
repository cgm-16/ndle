---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 3, 9, 11
  - docs/spec/ui-i18n.md  # §1.12 Feedback
  - src/components/FeedbackPanel/
  - src/components/GameScreen/
  - src/components/AnswerSlots/
  - src/components/Mark/Mark.tsx
  - src/i18n/messages.ts
  - e2e/accessibility.spec.ts  # :224-225, the verdict's copy
  - e2e/fit.spec.ts
---

# T115 — Feedback in B

```yaml
task_id: T115
title: Feedback in B
milestone: M17 — Identity: The Table in Play
priority: P0
estimate: M
wave: W6
depends_on: [T114]
parallel_safe: false
paths:
  - src/components/FeedbackPanel/
  - src/components/GameScreen/
  - src/i18n/messages.ts
  - e2e/accessibility.spec.ts
  - e2e/fit.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

**This fixes M8's other layout miss:** after a miss, Next Round sits below
660.

**The approach:** B swaps the verdict into the band in place of the actions.
The answer row stays mounted, with the played tiles in its slots, because the
motion plays on them (plan, ruling 3).

## Values

**The band in feedback** fills its fixed 150 px (T113):

| Part | Height |
|---|---|
| The answer row (T113), unchanged, showing the submitted tiles | 60 |
| Gap | 8 |
| The verdict line, one line | 26 |
| Gap | 8 |
| Next Round, a primary, full width, 17 px | 48 |

**The verdict line:**
- **The verdict,** at `--type-verdict` (22), 700, `line-height: 1.2`:
  - correct: a `Mark` and `result.correct`, in chalk;
  - missed: a `Mark` and `result.incorrect`, in pink.
- **Then the detail,** after ` · `, at 16 px in dust:
  - correct: `result.rewards`, with the pay's digits joined by spaces, for
    example `Received 8 1 6`;
  - missed: the row's equation and product, `3 × 5 = 15`.
- **It is one line** in en and ko at 343 px of content.

**The announcement:** the verdict line sits in the existing `role="status"`
live region.
- A miss adds a visually hidden sentence, `result.played`, for example
  "You played 57". So the announcement carries both the submitted and the
  correct answer (§1.12).
- `FeedbackPanel`'s bordered box and its reward-tile list are deleted. The
  answer row shows the answer, and the rack's `+` badges show what arrived.

## Copy

| Key | en | ko |
|---|---|---|
| `result.incorrect` (changed) | `Missed` | `오답` |
| `result.rewards` (changed) | `Received {digits}` | `받은 타일 {digits}` |
| `result.played` (new) | `You played {value}` | `제출한 답 {value}` |

Deleted: `result.submitted`, `result.answer`.

## Steps

- [ ] **Tests** in `FeedbackPanel.test.tsx`, in en and ko:
  - correct reads `Correct · Received 8 1 6` / `정답 · 받은 타일 8 1 6`, with
    a `Mark` of `data-shape` `check` / `circle`;
  - a miss reads `Missed · 3 × 5 = 15` / `오답 · 3 × 5 = 15`, with a
    `cross`, and its live region also holds `You played 57` /
    `제출한 답 57`;
  - there is no reward-tile list.
- [ ] **Tests** in `GameScreen.test.tsx`: in feedback, the answer row is
      still mounted with the submitted tiles, and Next Round replaces Clear
      and Submit.

  Record the failures.
- [ ] **Update** `accessibility.spec.ts:224-225` to the new copy:
      `/Correct|Missed/`, and `/You played/` for a miss.
- [ ] **Implement** the values above. The file's old-palette comments go.
- [ ] **Remove** every `feedback-*` key from `fit.spec.ts`'s
      `KNOWN_MISSES`, in every language and size.
- [ ] **If `feedback-incorrect` does not fit** in en or ko at the board's
      type sizes, **stop and report** the measured heights. Do not shrink
      type below the board's sizes. The alternative layout is Ori's choice
      (plan, ruling 3).
- [ ] **Amend `ui-i18n.md`:**
  - §1.12, Feedback: the band and the verdict line, and that a miss shows
    the submitted answer in the slots and announces it;
  - §1.14: the copy.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(play): feedback in B`, with `Task: T115`.

## Acceptance gate

- The FeedbackPanel and GameScreen tests are green in en and ko.
- Every feedback state fits at `393 × 660` and `375 × 660` in en and ko.
- The verdict line is one line in both languages.
