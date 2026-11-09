---
reads:
  - src/styles/tokens/colors.css
  - src/styles/tokens/fonts.css
  - src/styles/global.css
  - src/i18n/koreanFont.ts
  - src/components/TitleScreen/TitleScreen.tsx  # the oz✳terisk wordmark and mark tile
  - src/components/GameOverScreen/GameOverScreen.tsx  # the ✳ chop
  - e2e/accessibility.spec.ts  # the Hangul-face check
  - index.html
  - gallery.html
  - public/
---

# T100 — Remove ozterisk's identity

```yaml
task_id: T100
title: Remove ozterisk's identity
milestone: M12 — Puzzle Only
priority: P0
estimate: M
wave: W1
depends_on: [T99]
parallel_safe: false
paths:
  - package.json
  - package-lock.json
  - index.html
  - gallery.html
  - public/
  - src/styles/
  - src/i18n/
  - src/components/TitleScreen/
  - src/components/GameOverScreen/
  - src/services/sharing.ts
  - e2e/
  - docs/design-system/
  - .design-sync/
  - .gitignore
```

## Why

The design: "It reuses none of ozterisk's name, wordmark, Tile House palette
or type." The UI runs on neutral placeholders until the second plan restyles
it.

## Decisions

- **Name:**
  - `package.json` `name` is `ndle`.
  - The `<title>` and the visible name are `9dle`, and `title.name` is
    `9dle` / `구들`.
  - The wordmark is plain text in the UI face, with no mark tile and no ✳.
- **Fonts:**
  - Remove `@fontsource/eb-garamond`, `ibm-plex-mono`, `noto-sans-kr` and
    `zen-kaku-gothic-new`.
  - The Latin interface and the digits use the system stack
    `system-ui, -apple-system, "Segoe UI", sans-serif`, which makes no
    download.
  - The placeholder Hangul face is `@fontsource/gothic-a1` (OFL-1.1, 5.3.0),
    weights 400 and 700, still loaded lazily on Korean by `koreanFont.ts`.
  - `public/OFL.txt` names Gothic A1.
- **Palette:** keep every token name in `colors.css`, and give each a neutral
  placeholder value:
  - a dark grey field and a light grey tile face;
  - one blue accent for focus and the current row;
  - one orange for wrong.

  Recompute every text pair to at least 4.5:1, and the focus ring to at least
  3:1 on the field and on a tile. Put each ratio as a comment beside its
  token.
- **Brand motion:** delete `oz-title-settle` and `oz-chop` with the mark and
  the chop. The other `oz-*` keyframes keep their names until the identity's
  list replaces them.
- **Favicon:** `public/favicon.svg` is a plain "9" on the placeholder field.
- **Language key:** `LANGUAGE_STORAGE_KEY` becomes `"ndle.language"`. There
  is no migration, because 9dle has no users yet. Update the e2e specs'
  hard-coded key.
- **Share heading:** `9dle Puzzle — …` / `구들 …` until T108.
- **Deleted:**
  - `docs/design-system/` and `.design-sync/`;
  - the `.gitignore` lines for design-sync;
  - every package script that design-sync uses.

## Steps

- [ ] **Tests first.**
  - `koreanFont.test.tsx` asserts that the lazy import is `@fontsource/gothic-a1`.
  - `sharing.test.ts` asserts the `9dle` heading.
  - `TitleScreen.test.tsx` asserts the heading `9dle`, with no `✳`.
  - `storage.test.ts` uses `ndle.language`.

  Run them and record the failures.
- [ ] **Code and assets,** per Decisions. Run `npm install` after the
      dependency change, and commit the lockfile.
- [ ] **e2e:**
  - `accessibility.spec.ts`'s Hangul test checks `/Gothic A1/` in place of
    `/Noto Sans KR/`.
  - The focus-ring and target tests stay as they are, with the same gates.
- [ ] **Check:**
  - `grep -rniE "ozterisk|oz✳|tile house|noto sans kr|garamond|plex|zen kaku" src e2e index.html gallery.html public package.json`
    prints nothing.
  - `grep -rn "oz-chop\|oz-title-settle" src` prints nothing.
- [ ] **Network check (manual):** in `npm run dev`, play a run in en, switch
      to ko, and check DevTools → Network for requests that aren't to the
      origin. There should be zero. Record the reading in the PR.
- [ ] **Gates:** all five green.
- [ ] **Commit:** `chore(brand): replace ozterisk's identity with placeholders`,
      with `Task: T100`.
- [ ] **Open the PR** `[M12] Make 9dle Puzzle-only`, with a `Closes #` line
      for each of T95–T100.

## Acceptance gate

- The greps are empty.
- The a11y e2e spec is green, with Korean in Gothic A1.
- Zero non-origin requests are recorded.
