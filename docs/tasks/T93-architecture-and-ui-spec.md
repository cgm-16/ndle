---
reads:
  - docs/superpowers/plans/2026-11-09-ndle-core.md  # every task's Interfaces block
  - docs/spec/architecture.md
  - docs/spec/ui-i18n.md
  - docs/design-system/decisions.md  # the motion inventory this task inlines
  - src/styles/tokens/keyframes.css
  - e2e/puzzle-fit.spec.ts
---

# T93 — `architecture.md` and `ui-i18n.md` for 9dle

```yaml
task_id: T93
title: architecture.md and ui-i18n.md for 9dle
milestone: M11 — ndle's Rules
priority: P0
estimate: M
wave: W0
depends_on: [T92]
parallel_safe: false
paths:
  - docs/spec/architecture.md
  - docs/spec/ui-i18n.md
```

## Why

- `ui-i18n.md` has four lines that forbid the saved daily: lines 174–175 and
  307–308.
- It routes the motion contract into `docs/design-system/`, which T100
  deletes.
- `architecture.md` describes a file map and types that M12 removes.

Both files are rewritten to the target that this plan's tasks build.

## Steps

- [ ] **Rewrite `architecture.md`.**
  - **§2.1 file map:** the tree after T108. Each module that doesn't exist
    yet is tagged with its owning task: `src/game/daily.ts` (T101),
    `src/game/dailyPicker.ts` (T102), `scripts/run.mjs` and `scripts/daily/`
    (T102), `src/game/dailyTables.ts` and `dailyTables.json` (T103),
    `src/game/replay.ts` (T104), `src/services/dailyStorage.ts` (T105).
  - **§2.2 types:**
    - `Tile = { id; digit; isNew }`;
    - `GameState`, with no `mode` and with a required `table` and
      `rowResults` (T99);
    - `PuzzleMove = { spend: Digit[]; discard?: Digit }` (T102).
  - **§2.3 pure interfaces:** copy the signatures from T101–T104's
    Interfaces blocks.
  - **§2.4 browser-bound:** the `AppDependencies` from T107, and the
    `DailyStore` from T105.
  - **§2.5 reducer invariants:** keep them, minus faces. Add "the reducer
    never reads the clock or storage; Daily versus Practice is unknown to
    it".
  - **§2.6 fixtures** and **§2.7 gallery:** keep them, with the Puzzle-shaped
    fixtures from T98.
- [ ] **Rewrite `ui-i18n.md`.**
  - **§1.12 layout:**
    - every screen fits **393 × 660 with no page scroll, and 375 wide**;
    - add the ledger (8 rows), the five-socket single-row rack, the rail,
      and colour never alone;
    - mark the two known misses as owned by the second plan: Next Round
      below 660 after a miss, and the overflow page reaching 859 px.
  - **§1.12 motion:**
    - inline the inventory as it is today, without `oz-seal`, `oz-seal-rim`
      and `oz-reseat`, which T97 removes, and without `oz-title-settle` and
      `oz-chop`, which T100 removes;
    - one line per name, naming what it animates;
    - mark it "provisional; the identity's keyframe list replaces it";
    - the pointer to `docs/design-system/` goes.
  - **§1.13 language behaviour:** replace lines 174–175 with "Only the
    language preference and today's daily persist across a refresh. A refresh
    returns to `title`; opening Daily that day resumes or shows its result."
  - **§1.14 copy:** a table of every key in use after T108, en and ko. It
    holds T106–T108's new keys verbatim, and is marked placeholder copy until
    the identity.
  - **§1.15 sharing:** the exact share texts in T108's Interfaces table,
    replacing ozterisk's.
  - **§1.16 persistence:** replace lines 307–308 with the `DailyRecord`
    contract from T105, and "A reload constructs a fresh `title` state; the
    daily is restored only through Daily".
- [ ] **Check:**
      `grep -nE "Only the language preference|Do not write any game field|design-system" docs/spec/ui-i18n.md`
      prints nothing.
- [ ] **Commit:** `docs(spec): architecture and UI contract for 9dle`, with
      `Task: T93`.

## Acceptance gate

- §1.12 states 393 × 660 and 375.
- Every keyframe name in §1.12 exists in `src/styles/tokens/keyframes.css`
  today, apart from the five marked for removal.
