---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 3, 7
  - docs/spec/ui-i18n.md  # §1.12 rack, rail, Overflow
  - docs/spec/product.md  # §1.7 Overflow, §1.10 the held socket
  - src/components/TileInventory/
  - src/components/Tile/
  - src/components/OverflowControls/
  - src/components/GameScreen/GameScreen.tsx  # the auto-advance, :35-47
  - src/styles/tokens/spacing.css
  - e2e/viewport.spec.ts  # the tier assertions
  - e2e/fit.spec.ts
---

# T114 — Rack, rail and overflow in B

```yaml
task_id: T114
title: Rack, rail and overflow in B
milestone: M17 — Identity: The Table in Play
priority: P0
estimate: L
wave: W6
depends_on: [T113]
parallel_safe: false
paths:
  - src/components/TileInventory/
  - src/components/Tile/
  - src/components/OverflowControls/
  - src/components/GameScreen/
  - src/styles/tokens/spacing.css
  - src/i18n/messages.ts
  - e2e/viewport.spec.ts
  - e2e/fit.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

**The rack** is the player's hand. **Overflow** is one of M8's two layout
misses: today the page reaches about 859 px, because a feedback panel, an
overflow panel and the rail stack in one column. B puts the overflow message
and the rail side by side in the band, with the answer row above them.

**Behaviour is unchanged.** One mark completes the discard, and the round
advances once the discard and the verdict have both settled.

## Values (the prototype's rack and overflow)

**Arena width:** at most 361 px of content, centred (plan, Frame).

**Hand label:** `rack.hand` at 14 px, in dust, 22 px tall, 12 px below the
band. `{count}` is the number of seated tiles, at most 5.

**Rack,** 6 px below the label:
- `grid-template-columns: repeat(5, minmax(44px, 1fr))`, gap 8, rows 56 px;
- this replaces the three tiers (ruling 7), and `--tile-w*`, `--tile-h*`,
  `--rack-gap` and their media queries go;
- below about 284 px of viewport, the 44 px floor wins and the page scrolls,
  as §1.12 already says.

**Tiles:**

| Tile | Look |
|---|---|
| Resting | chalk face, slate digit at `--type-tile` (28), 700, radius 6, `0 3px 0` dust edge |
| Empty socket | a `1.5px` dashed socket-colour outline, radius 6, no fill |
| Held (on loan) | the lifted digit stays in the socket, at 16 px in dust, inside a `1.5px` dashed socket-colour outline. It is distinct from an empty socket because it shows the digit (product §1.10). It sets `data-state="held"` |
| New (arrived this row) | an 18 px blue circle at top and right −8 px, holding a slate `+`, `aria-hidden`. This replaces the `reward` glow |
| Inert (feedback) | the resting look; not a pressable target |
| Discard choice (overflow) | a `2px` dashed pink border and no bottom edge. Named `tile.discard`, plus `, ` and `tile.newLabel` for the arrival |

**Overflow,** inside the band's fixed 150 px (T113), below the answer row
with an 8 px gap:
- **Left cell, the message:**
  - a `Mark` (correct), `result.correct`, ` · ` and `result.handFull`, at
    20 px, 700;
  - below it, `overflow.instructionOne` at 16 px in dust.
- **Right cell, the rail,** 88 px wide:
  - `rail.arriving` at 12 px in dust;
  - below it, the arriving tile at 66 × 56, with the discard-choice border
    and the `+` badge.
  - There is no top rule.
  - The tilt and rim motion go in T116; this task moves only where the rail
    sits.
- `OverflowControls`' bordered panel is deleted. Its instruction moves into
  the left cell, and the component goes if nothing else uses it.

**The arithmetic,** at 393 × 660:
- in en and ko, the message wraps to two lines in its cell, so its content
  is about 60 + 8 + 74 = 142 px, inside the 150 px band;
- the screen is the same height as answering, about 638 px.
- The sweep decides.

## Copy

| Key | en | ko |
|---|---|---|
| `rack.hand` (new) | `Hand · {count} of 5` | `손 · 5칸 중 {count}개` |
| `rail.arriving` (new) | `Arriving` | `들어오는 타일` |
| `result.handFull` (new) | `hand full` | `손이 가득 참` |
| `tile.discard` (new) | `Discard {digit}` | `{digit} 버리기` |
| `tile.newLabel` (changed) | `new tile` | `새 타일` |
| `overflow.instructionOne` (changed) | `Six tiles, five sockets. Choose a tile to discard.` | `타일 여섯 개, 칸 다섯 개. 버릴 타일 1개를 선택하세요.` |

`tile.discardLabel` is unchanged, for the tile that is leaving.

## Steps

- [ ] **Tests** in `TileInventory.test.tsx`, in en and ko:
  - **Held socket:**
    - a lifted tile's socket has `data-state="held"` and shows its digit;
    - an empty socket shows none;
    - the rack does not re-sort while a tile is held.
  - **New tile:** a tile that arrived this row renders the `+` badge. This
    replaces the test that says the badge was removed.
  - **Hand label:** it reads `Hand · 4 of 5` / `손 · 5칸 중 4개`.
  - **In overflow:**
    - each tile is named `Discard {digit}`, and the arrival
      `Discard 7, new tile`;
    - `Arriving` labels the rail.

  Record the failures.
- [ ] **Tests** in `GameScreen.test.tsx`: overflow shows one message, the
      verdict line and the instruction, and no second panel. The
      auto-advance tests stay green unchanged.
- [ ] **Rewrite** `viewport.spec.ts`'s tier assertions (`:38-49`,
      `:163-166`, `:291-293`) against the one size:
  - five equal columns that fill the arena's content, gap 8, 56 px tall;
  - never narrower than 44 px;
  - the 260 px case keeps its 44 px target.
- [ ] **Implement** the values above. Each file's old-palette comments go.
- [ ] **Remove** `overflow-required-1` from `fit.spec.ts`'s `KNOWN_MISSES`,
      in every language and size.
- [ ] **Amend `ui-i18n.md` §1.12:**
  - **Rack sizing:** one size, replacing the three tiers and their
    arithmetic;
  - **The rail:** in the band's right cell, labelled, with no top rule;
  - **Overflow:** the message;
  - **§1.14:** the copy table.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(play): rack, rail and overflow in B`, with
      `Task: T114`.

## Acceptance gate

- The TileInventory and GameScreen tests are green in en and ko.
- The held socket is distinct from an empty one, by digit and by
  `data-state`.
- Overflow fits at `393 × 660` and `375 × 660` in en and ko.
- The viewport spec's sizing checks pass against the one size.
