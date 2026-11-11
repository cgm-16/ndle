---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # Global Constraints, rulings
  - docs/spec/ui-i18n.md  # §1.12 Material and colour, Typography, Accessibility
  - src/styles/tokens/colors.css
  - src/styles/tokens/elevation.css
  - src/styles/tokens/typography.css
  - src/styles/tokens/fonts.css
  - src/styles/tokens/radius.css
  - src/styles/global.css
  - src/i18n/koreanFont.ts
  - src/components/ActionButton/
  - src/components/LanguageToggle/LanguageToggle.module.css
  - src/components/AnswerSlots/AnswerSlots.module.css
  - e2e/accessibility.spec.ts
  - public/OFL.txt
  - public/favicon.svg
---

# T109 — B's palette, faces and focus ring

```yaml
task_id: T109
title: B's palette, faces and focus ring
milestone: M16 — Identity: Title and Game Over
priority: P0
estimate: L
wave: W5
depends_on: [T108]
parallel_safe: false
paths:
  - src/styles/tokens/
  - src/styles/global.css
  - src/main.tsx
  - src/gallery/main.tsx
  - src/components/ActionButton/
  - src/components/LanguageToggle/LanguageToggle.module.css
  - src/components/AnswerSlots/AnswerSlots.module.css
  - e2e/accessibility.spec.ts
  - public/OFL.txt
  - public/favicon.svg
  - package.json
  - package-lock.json
  - docs/spec/ui-i18n.md
```

## Why

Every later task builds on B's colours, faces and focus ring. This task
changes what every screen inherits; layout and sizes stay as they are until
each screen's own task, so the existing fit checks stay green.

## Values

**Primitives.** Rename the old identity's primitives to B's eight, with the
values in the plan's palette table: `--slate`, `--raised`, `--chalk`,
`--dust`, `--socket`, `--hairline`, `--blue`, `--pink`. No `--felt-*`,
`--clay-*`, `--well-*`, `--gold-*`, `--jade-*` or `--verm-*` name remains.

**Semantic aliases.**
- Keep each alias whose role survives, and point it at a B primitive.
- Delete the aliases with no use in `src`: `--surface-table`,
  `--border-danger`, `--accent-hover`, `--accent-pressed`, `--shadow-panel`,
  `--shadow-tile-pressed`. Check each with `grep` first.
- `--accent` is blue. It is the one hue for focus, the current row and
  actions.
- `--state-incorrect` and `--state-discard` are pink.
- `--state-correct` points at `--chalk`, because correct has no hue.
- `--focus-ring` is blue.

**Components that name primitives directly** move onto aliases:
- `LanguageToggle.module.css:33` (`--clay-900`);
- `AnswerSlots.module.css` (`--gold-500`, `--gold-300`, `--clay-050`,
  `--clay-400`);
- `ActionButton.module.css:19,26` (`--verm-800`, `--felt-800`).

**Primary buttons are blue,** with slate text. `ActionButton.module.css:21`
fills them with `--state-incorrect` today. It reads `--accent` instead, in
this commit, so no primary button turns pink.

**ActionButton,** shared by every screen:

| Variant | Look |
|---|---|
| primary | `--accent` fill, slate text, no border |
| secondary | transparent, `1.5px` dust border, chalk text |
| ghost (Back) | transparent, `1.5px` hairline border, chalk text |

- Radius 8, weight 700, sentence case: no `text-transform` and no tracking.
- No raised edge. A press moves it `1px` down, and disabled is opacity
  `0.45`.
- `--btn-edge-depth*` and the edge tokens are deleted.
- `ActionButton.test.tsx:163-164` asserts the old edge names. Rewrite it
  against the new look.
- Each screen's task sets its buttons' heights and type sizes.

**Material** (`elevation.css`):
- `--shadow-tile` is `0 3px 0 var(--dust)`.
- `--shadow-tile-sm` is `none`, because pay tiles have no edge.
- No blurred shadow, glow or inset socket shadow remains.
- `--ring-focus` is deleted.

**Focus:** `global.css`'s `:focus-visible` rule becomes
`outline: 3px solid var(--focus-ring); outline-offset: 3px`. Each
component's own ring (the inset two-tone `box-shadow`s) is deleted.

**The language toggle's halves** stand 6 px apart, on slate, with no
`overflow: hidden`, and each keeps a 44 × 44 target. T110 restyles the rest
of the toggle.

**Faces:**
- `npm install --save-exact @fontsource/atkinson-hyperlegible@5.3.0 @fontsource/gaegu@5.3.0`.
- Both entry points, `src/main.tsx` and `src/gallery/main.tsx`, import:
  - `@fontsource/atkinson-hyperlegible/latin-400.css` and `latin-700.css`;
  - `@fontsource/gaegu/700.css`.
- Gothic A1 keeps loading through `loadKoreanFont`, unchanged.
- `--font-ui` is
  `"Atkinson Hyperlegible", "Gothic A1", system-ui, -apple-system, "Segoe UI", sans-serif`.
- `--font-display` is `"Gaegu", "Gothic A1", sans-serif`.
- `--font-mono` and `--font-numeral` are deleted, and their uses read
  `--font-ui`.
- Only weights 400 and 700 exist, so `--weight-medium` and
  `--weight-semibold` are deleted. Their uses read 400 and 700 respectively.

**B's type scale,** added beside today's `--size-*` tokens:

| Token | px |
|---|---|
| `--type-wordmark` | 104 |
| `--type-wordmark-ko` | 64 |
| `--type-score` | 52 |
| `--type-prompt` | 30 |
| `--type-bar-wordmark` | 28 |
| `--type-tile` | 28 |
| `--type-row-current` | 24 |
| `--type-verdict` | 22 |
| `--type-numeral` | 22 |
| `--type-lead` | 20 |
| `--type-value` | 20 |
| `--type-row` | 17 |
| `--type-body` | 16 |
| `--type-hud` | 15 |
| `--type-secondary` | 14 |
| `--type-label` | 13 |
| `--type-small` | 12 |

Today's `--size-*` tokens and the Korean size overrides stay until the
screens that use them are restyled. T117 deletes whatever no file uses.

**Radius:** 8 for buttons, toggle and Back; 6 for tiles, slots, rows and
cards; 4 for pay tiles and game-over marks.

## Steps

- [ ] **Test** `src/styles/tokens/contrast.test.ts`.
  - It reads `colors.css?raw`, resolves each custom property through its
    `var()` chain to a hex, and computes the WCAG 2 contrast ratio:
    relative luminance with the 0.03928 threshold, then
    `(L1 + 0.05) / (L2 + 0.05)`.
  - **Text at least 4.5 : 1:**
    - `--text-primary` on `--surface-field`;
    - `--text-meta` on `--surface-field`;
    - the tile's digit (slate) on `--chalk`;
    - slate on `--accent` (button text);
    - `--state-incorrect` on slate;
    - `--accent` on slate;
    - `--text-primary` on `--raised`.
    - Use whatever alias names the file ends with, but cover these eight
      roles.
  - **Non-text at least 3 : 1:**
    - `--focus-ring` on slate and on `--raised`;
    - `--socket` on slate;
    - `--dust` on slate;
    - `--pink` on slate;
    - `--blue` on slate.
  - **The instrument against the board,** to two decimals:
    - chalk on slate is 13.45;
    - dust on slate is 7.29;
    - the socket colour on slate is 4.29;
    - blue on slate is 9.06;
    - blue on raised is 7.59;
    - pink on slate is 8.08.
  - **A case it must fail:** blue on chalk computes 1.48, below 3.
  - Run it and record the failure: today's primitives don't exist.
- [ ] **Test** in `e2e/accessibility.spec.ts`: replace the two-tone ring
      check (`:131-202`). On the screens the spec already visits, each
      focused control's computed `outline` is `3px solid` with a colour of
      `rgb(140, 207, 242)`, and its `outline-offset` is `3px`.
- [ ] **Test** in `e2e/accessibility.spec.ts`'s face check, after
      `document.fonts.ready`:
  - `document.fonts.check('700 28px "Gaegu"', "9dle")` and
    `document.fonts.check('400 16px "Atkinson Hyperlegible"', "Row 1")` are
    true in en;
  - Gothic A1 400 and 700 are loaded in ko, as today.
- [ ] **Implement** the values above. Each file this task touches loses its
      comments that cite the old palette (ratios, gold, ceramic, felt).
- [ ] **Check Gaegu's slicing** before going on:
  - `grep -c "unicode-range" node_modules/@fontsource/gaegu/700.css` prints
    more than 1;
  - the Korean glyphs come in numbered slices, not one file.
  - **If they come in one file, stop and report the file's size.** The
    controller rules on it, because the title shows 구들 in both locales.
- [ ] **Amend `ui-i18n.md` §1.12:**
  - **Material and colour:** the tile is B's (it is no longer provisional),
    and the hue rule is Ori's (plan, "Hues").
  - **Typography:** the three faces and their roles replace "the system
    stack".
  - **Accessibility:** the ring is a 3 px outline at a 3 px offset.
  - The first line no longer calls the palette and type placeholders.
- [ ] **Licences and favicon:**
  - `public/OFL.txt` names all three faces, with each package's copyright
    lines copied from its `LICENSE`.
  - `public/favicon.svg` is recoloured slate and chalk, and its comments no
    longer cite felt or clay.
- [ ] **Gates**, all of them.
- [ ] **Manual check**, with a scratch script against `npm run build` and
      `npm run preview`, not committed. A Practice run in en, then in ko:
  - it makes zero requests to another origin;
  - record the font files the English title downloads, and their total
    bytes.
- [ ] **Commit:** `feat(identity): B's palette, faces and focus ring`, with
      `Task: T109`.

## Acceptance gate

- The contrast test is green, and its must-fail case computes below 3.
- The ring and face checks in `accessibility.spec.ts` are green.
- `grep -rE -- "--(felt|clay|well|gold|jade|verm)-" src` is empty.
- No primary button reads a pink token.
- A Practice run makes zero non-origin requests, and the report lists the
  English title's font bytes.
