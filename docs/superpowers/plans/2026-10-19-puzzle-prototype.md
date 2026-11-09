# Puzzle Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task.
> Task steps live in https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/ (T85..T90) and use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** A third mode, Puzzle, that deals five tiles and eight equations face
up and judges the run against par, playable on a Vercel preview with a fixed
playtest set, so the draft's kill playtest can run.

**Architecture:** Puzzle is a third `GameMode` inside the existing
`gameReducer` (spec §4). The table, its pays and its par ride in
`START_RUN`/`RESTART_RUN`; the reducer stays pure and checks pays and the end.
A new pure module, `src/game/puzzle.ts`, solves and deals tables; App receives
the dealer as an injected `dealPuzzle` dependency, which `main.tsx` composes
as "the playtest set, then live deals".

**Tech Stack:** Vite, React `useReducer`, TypeScript, CSS Modules, Vitest + React
Testing Library, Playwright (geometry only). No new dependencies.

**Spec:** [`2026-10-19-puzzle-prototype-design.md`](../specs/2026-10-19-puzzle-prototype-design.md)
**Research draft:** [`03-puzzle/README.md`](../../research/game-modes/03-puzzle/README.md)
**Milestone:** `M8 — Puzzle Prototype` · **Tracking issue:** #196 · **Branch:** `feat/M8-puzzle-prototype`

## Global Constraints

Every task inherits these.

- **No new dependencies**, runtime or dev. `Intl.ListFormat` is the platform's.
- **The reducer stays pure.** No `Math.random()`, `crypto.randomUUID()`, browser
  or storage API inside `src/game/`. `puzzle.ts` takes an injected `RandomSource`.
- **No seeded PRNG ships.** `mulberry32` may appear in `src/test/` and in the
  research folder, never in code `main.tsx` reaches.
- **No new motion.** Only the §1.12 inventory; the ledger's state changes are
  instant.
- **Bilingual.** Every user-visible string gets `en` and `ko` entries in
  `src/i18n/messages.ts`. "Par" is **목표** in Korean (Ori, 2026-10-19).
- **Dials.** Add `PUZZLE_*` dials to `balance.ts` with their economy effect;
  change no existing dial's value (AGENTS.md §4.5).
- **Browser suite asserts geometry only** (`product.md` §1.17).
- **Gates per task:** `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build`, all green; `npm run test:e2e` from T87 on, when the title
  gains its third mode.
- **Commits.** One Conventional Commit per task on `feat/M8-puzzle-prototype`,
  with `Task: T##` in the body and the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Fixups before
  push are squashed into their task's commit.
- **Nothing merges** until the playtest passes and T90 has amended
  `docs/spec/**` (journal 2026-10-19).

## Review Focus

Failure modes the spec implies that its listed tests do not reach. Each has its
test in the owning task.

1. **StrictMode must not deal twice.** Dev renders under `<StrictMode>`; a
   `dealPuzzle` call that leaked into render would step the playtest set two
   tables at a time. Pinned in T87 (Start then Play Again under StrictMode
   deals tables 1 then 2).
2. **Puzzle play draws no randomness after the deal.** The pay comes from the
   table, and the next equation comes from the table. Pinned in T87 by playing
   rows with an exhausted `RandomSource`, which throws on any call.
3. **A discard's auto-advance takes the next row.** After a discard the round
   advances on its own (`GameScreen`), through the same `onNextRound`. Pinned
   in T87: after an overflow discard the screen shows row k+1's equation.
4. **Play Again replaces the table.** A stale `table` would check the new run's
   pays against the old one. Pinned in T86 (reducer) and T88 (the ledger shows
   the new table's row 1).
5. **Korean reads the pay as a Korean list.** The ledger's row label joins pay
   digits with `Intl.ListFormat`, not a hard-coded "and". Pinned in T88 in `ko`.

## Tasks

| Task | Title | Depends on | Parallel-safe |
|---|---|---|---|
| [T85](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T85-puzzle-solver-and-deal.md) | Puzzle solver and deal | — | no |
| [T86](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T86-puzzle-rules.md) | Puzzle rules in the reducer | T85 | no |
| [T87](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T87-puzzle-app-wiring.md) | App wiring and the playtest set | T86 | no |
| [T88](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T88-puzzle-ledger.md) | HUD, ledger, rack and the layout check | T87 | no |
| [T89](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T89-puzzle-game-over.md) | Game over, sharing and copy | T88 | no |
| [T90](https://github.com/cgm-16/ndle/blob/3ccd37b/docs/tasks/T90-puzzle-merge-gate.md) | After a pass: strip the set, amend the spec | T89, playtest pass | no |

## Dependency order

```
T85 solver and deal ─> T86 reducer ─> T87 App and set ─> T88 ledger ─> T89 game over
                                                                          │
                                         playtest on the preview ─────────┤
                                                                          └─> T90 (pass only)
```

Strictly serial. Each task builds on the previous one's interface, and T86–T89
all edit `types.ts`, `App.tsx` or `messages.ts`.

## Whole-build verification

Beyond the per-task gates:

- **The replay guard is seen failing** (T86). Change one digit of the sample's
  row 6 pay in the fixture, confirm the replay test fails, and revert.
- **The port is calibrated** (T85). The q = 0.6 cell, 2,000 seeded plants on
  the ported `plantTable`, lands within 13.0–16.2% in band (14.6% ± two
  standard errors). Recorded in the PR body.
- **Endless and Classic are untouched.** The existing `gameReducer.test.ts`,
  `selectors.test.ts` and `App.test.tsx` cases stay green without edits to
  their expectations. A needed edit means semantics changed: stop. Checked on
  2026-10-19: no existing test pins exactly two modes (the title test names
  each mode by its own regex), so the one sanctioned edit is `renderApp`'s new
  `dealPuzzle` option.
- **Phone timing** (Ori, manual). On the preview, on the iPhone 13 mini, Safari
  Web Inspector's timeline from the Start Run tap to the ledger's first paint
  is under 100 ms, for a live deal (the fourth table).
- **The preview opens without a login** for a tester's phone.

## On a pass

T90 strips the playtest set, amends `docs/spec/**` (spec §9.3) and
`docs/plan/traceability.md`, and the PR is marked ready. On a fail the PR closes
unmerged and the result goes to `main` in its own journal PR (spec §9.2).
