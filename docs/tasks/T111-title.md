---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 2 and 11
  - docs/spec/ui-i18n.md  # §1.14 title copy
  - src/components/TitleScreen/
  - src/i18n/messages.ts
  - src/gallery/states.tsx
  - index.html
  - e2e/fit.spec.ts  # KNOWN_MISSES
---

# T111 — The title in B

```yaml
task_id: T111
title: The title in B
milestone: M16 — Identity: Title and Game Over
priority: P1
estimate: M
wave: W5
depends_on: [T110]
parallel_safe: false
paths:
  - src/components/TitleScreen/
  - src/i18n/messages.ts
  - src/gallery/
  - index.html
  - e2e/fit.spec.ts
  - e2e/accessibility.spec.ts
  - e2e/viewport.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

The title is the first screen a player sees: both names, what the game is,
three steps, and the choice of Daily or Practice. The keyboard help stays,
because §1.14 requires it (plan, ruling 2).

## Values (the prototype's title)

**Column:** `display: flex; flex-direction: column;
justify-content: space-between`, padding `24px 0 8px`, so the buttons sit
at the bottom of the frame.

**Top group,** gap 20:
- **Wordmark,** an `h1` holding both names in both locales:
  - `<span lang="en">` with `messages.en.title.name`, and `<span lang="ko">`
    with `messages.ko.title.name`;
  - Gaegu 700, at `--type-wordmark` (104) and `--type-wordmark-ko` (64);
  - 구들 in dust, baseline-aligned, gap 20, `line-height: 1`;
  - **It never wraps.** At 343 px of content, the 375 frame, it scales down,
    both sizes together, for example with container units.
- **Tagline:** `<p>` with `title.tagline`, `--type-lead` (20), 700.
- **Steps:** an `<ol>` with `list-style: none` and gap 10.
  - Each `<li>` is a grid of `28px minmax(0, 1fr)`, gap 8.
  - The numeral is an `aria-hidden` `<span>` in Gaegu at `--type-numeral`
    (22), blue, `line-height: 1`; the `ol` carries the order.
  - The text is `title.how1`–`3` at 16 px, in dust.
- **More:** a `<details>` with summary `title.more` (16 px, 700, chalk),
  closed by default.
  - It holds `howToPlay.selecting`, `slots`, `incorrect`, `overflow`,
    `progress` and `keyboard`, at 14 px in dust.
  - The fit is measured closed. Open, the title may scroll, because the
    player asked for the text.

**Bottom group,** gap 12:
- **Daily:** an `ActionButton` primary, 56 px tall, 19 px, labelled
  `title.daily`, `title.dailyPlayed` or `title.dailyNone`. `none` is
  disabled and keeps its text.
- **Practice:** an `ActionButton` secondary, 52 px tall, 18 px.
- **Note:** `<p>` with `title.note`, 14 px, in dust, centred.

The four material rules and their swatches are deleted.

## Copy

New keys:

| Key | en | ko |
|---|---|---|
| `title.tagline` | `A daily multiplication puzzle` | `매일 한 판, 곱셈 퍼즐` |
| `title.how1` | `Spell each row's answer with tiles from your hand.` | `손에 든 숫자 타일로 각 줄의 답을 만드세요.` |
| `title.how2` | `A right answer pays the tiles printed on its row. Your hand holds five.` | `맞히면 그 줄에 적힌 타일을 받습니다. 손에는 다섯 개까지 들 수 있습니다.` |
| `title.how3` | `Par is the best score this table allows. Sometimes the way there is a miss.` | `목표는 이 판에서 낼 수 있는 최고 점수입니다. 때로는 일부러 틀려야 닿습니다.` |
| `title.note` | `One Daily a day. Practice deals a new table every time.` | `오늘의 판은 하루 한 번. 연습은 매번 새 판을 냅니다.` |

Deleted: `title.summary`, `howToPlay.correct`, `howToPlay.capacity`.

`index.html`'s meta description becomes the English tagline.

## Steps

- [ ] **Tests** in `TitleScreen.test.tsx`, in en and ko:
  - the `h1`'s accessible name is `9dle 구들`;
  - the tagline renders, then the three steps in order, then the note;
  - `More` is closed, and holds exactly the six topics above;
  - each `DailyEntry` keeps its label, `none` is disabled, and Practice stays
    enabled.

  Record the failures.
- [ ] **Gallery:** add `title-played` and `title-none`, and raise
      `viewport.spec.ts`'s `STATE_COUNT` to match.
- [ ] **Implement** the values above. `messages.ts`'s type rejects a
      missing `ko` entry, so the deleted keys go from both languages.
- [ ] **Remove** every title key from `fit.spec.ts`'s `KNOWN_MISSES`. The
      title states must fit in en and ko at both sizes.
- [ ] **Amend `ui-i18n.md` §1.14:**
  - the copy table above;
  - the paragraph on the title's rule copy names `title.how1`–`3` and the
    `More` topics;
  - `title.summary` is gone.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(title): the title in B`, with `Task: T111`.

## Acceptance gate

- The TitleScreen tests are green in en and ko.
- The three title states fit at `393 × 660` and `375 × 660` in en and ko,
  with the wordmark on one line.
- No title key is in `KNOWN_MISSES`.
