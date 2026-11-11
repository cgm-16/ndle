---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # Review Focus 1, 2, 3 and 5
  - docs/spec/ui-i18n.md  # §1.12 Layout, Back
  - src/app/App.tsx
  - src/app/App.module.css
  - src/components/LanguageToggle/
  - src/components/TitleScreen/TitleScreen.tsx
  - src/gallery/Gallery.tsx
  - src/gallery/main.tsx
  - src/gallery/states.tsx
  - e2e/puzzle-fit.spec.ts  # its must-fail case at 393 × 400
  - e2e/viewport.spec.ts
---

# T110 — One top bar, and the geometry sweep

```yaml
task_id: T110
title: One top bar, and the geometry sweep
milestone: M16 — Identity: Title and Game Over
priority: P0
estimate: M
wave: W5
depends_on: [T109]
parallel_safe: false
paths:
  - src/components/TopBar/
  - src/components/LanguageToggle/
  - src/components/TitleScreen/
  - src/app/App.tsx
  - src/app/App.module.css
  - src/app/App.test.tsx
  - src/gallery/
  - src/i18n/messages.ts
  - e2e/fit.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

**The fit must include the bar.** The bar is 52 px of every screen, but the
gallery renders screens without it, and no geometry check measures height
beyond the live Practice answering screen. This task makes the bar one
component, renders it in the gallery, and adds the sweep that every later
task's fit is judged by.

## Interfaces

**Produces:**

```ts
// src/components/TopBar/TopBar.tsx
export interface TopBarProps {
  /** Shown on the game and game-over screens; omitted on the title. */
  onBack?: () => void;
  /** The centre label: "#12" for a Daily, "Practice" for Practice; omitted on the title. */
  label?: string;
}
export function TopBar(props: TopBarProps): JSX.Element;
```

**Gallery single-state page:** `gallery.html?state=<id>` renders the
state's `TopBar` and its screen, and nothing else: no picker and no gallery
chrome.
- Game and game-over states have Back.
- Daily states are labelled `#12`, the gallery's Daily number. Practice
  states are labelled `Practice`.
- The language comes from `localStorage["ndle.language"]`, as in the app.
- Without `?state`, the gallery is unchanged.

## Values (the prototype's bar)

**Bar:**
- 52 px tall, `display: flex`, `justify-content: space-between`, gap 8.
- It sits inside the 393 px frame's 16 px gutters, on every screen,
  including the title.

**Back:**
- 44 px tall, at least 44 px wide, padding `0 12px 0 8px`, gap 6.
- Transparent, with a `1.5px` hairline border and radius 8; text 15 px, 700.
- Its arrow is an inline SVG, 18 × 18, `stroke-width: 2.5`, `aria-hidden`.

**Centre** (game and game-over screens only):
- a `<p>` holding the wordmark, `title.name` in Gaegu 700 at 28 px with
  `line-height: 1`;
- then the label, 15 px, 700, in dust, baseline-aligned, gap 6.

**Toggle:**
- `role="group"` labelled `language.groupLabel`;
- two buttons, each at least 44 × 44, 6 px apart, on slate, with a `1.5px`
  hairline border and radius 8;
- the visible text is `EN` (14 px, 700) and `한` (15 px, 700, Gothic A1);
- the accessible names stay `English` and `한국어` (`aria-label`), so the
  tests and screen readers keep the full names, and each visible label is
  part of its name;
- the pressed half is chalk with slate text; the other is transparent with
  chalk text.

**On the title,** the left side is empty and the toggle sits right.
`TitleScreen` no longer renders its own `LanguageToggle`.

**Copy** (new):

| Key | en | ko |
|---|---|---|
| `bar.daily` | `#{number}` | `#{number}` |

## Steps

- [ ] **Tests** in `src/components/TopBar/TopBar.test.tsx`:
  - with `onBack` and a label, Back comes first in tab order, then the
    toggle;
  - the label and the wordmark render in en and ko;
  - without them, only the toggle renders.
- [ ] **Tests** in `App.test.tsx`:
  - the bar renders on the title, with no Back;
  - a Daily game shows `#n`, and Practice shows `Practice` / `연습`.
- [ ] **Test** in `src/gallery/Gallery.test.tsx`:
  - `?state=answering-empty` renders a `TopBar` and the screen, and no
    picker;
  - an unknown id renders the default gallery.
- [ ] **Test** `e2e/fit.spec.ts`, the sweep:
  - **Coverage:** for every gallery state id, in en and ko, at `393 × 660`
    and `375 × 660`, open `gallery.html?state=<id>` and await
    `document.fonts.ready`.
  - **The bar is counted:** the `TopBar`'s box is 52 px tall.
  - **The fit:** `document.documentElement.scrollHeight <= innerHeight` and
    `scrollWidth <= innerWidth`.
  - **`KNOWN_MISSES`** is a `Set` of `"<id> <lang> <width>"` keys, each
    commented with its measured `scrollHeight` at this commit. For a listed
    key the test asserts the state **does** overflow, so fixing a state
    fails the sweep until its key is removed.
  - **The must-fail case:** `answering-empty` in en at `393 × 400` reports
    an overflow.
  - **The focus-ring reach,** in every state:
    - every two controls (`button`, `[role="button"]`, `a`, `summary`) are
      at least 6 px apart, which is the ring's 3 px offset plus its 3 px
      width;
    - no element whose computed background is chalk or dust (a tile face, a
      pay tile, the pressed toggle half), other than the control itself,
      lies within 6 px of a control.
    - A state that fails this goes in `KNOWN_MISSES` under the key
      `"<id> <lang> <width> ring"`, asserted the same way.
  - Record which states miss, and why, in the report.
- [ ] **Implement** `TopBar`, with App and the gallery rendering it. Delete
      App's `.languageBar`.
- [ ] **Amend `ui-i18n.md` §1.12:**
  - **Back:** at the bar's left edge, the wordmark and label in the centre,
    the toggle on the right; this closes the M15 note that M16 decides it.
  - **Layout:** the sweep (`e2e/fit.spec.ts`) is named among the geometry
    specs.
- [ ] **Gates**, all of them. The sweep's `KNOWN_MISSES` holds exactly the
      keys that overflow at this commit, and no others.
- [ ] **Commit:** `feat(layout): one top bar, and the geometry sweep`, with
      `Task: T110`.

## Acceptance gate

- The sweep runs every gallery state in en and ko at both sizes, with the
  bar counted.
- Its must-fail case fails, and every listed miss is asserted to overflow.
- The ring-reach check passes in every state, or each failure is in
  `KNOWN_MISSES` under its `ring` key, with its reason.
- App and the gallery render the same `TopBar`.
