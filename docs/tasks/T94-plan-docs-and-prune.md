---
reads:
  - docs/superpowers/plans/2026-11-09-ndle-core.md  # Milestones table
  - docs/plan/roadmap.md
  - docs/plan/traceability.md
  - docs/plan/github.md
  - docs/checklists/quality.md
  - docs/checklists/release.md
---

# T94 — Plan docs for ndle, and ozterisk-only docs removed

```yaml
task_id: T94
title: Plan docs for ndle, and ozterisk-only docs removed
milestone: M11 — ndle's Rules
priority: P1
estimate: S
wave: W0
depends_on: [T93]
parallel_safe: false
paths:
  - docs/plan/roadmap.md
  - docs/plan/traceability.md
  - docs/plan/github.md
  - docs/plan/tuning-and-design-system.md
  - docs/checklists/quality.md
  - docs/checklists/release.md
  - docs/archive/
  - docs/design_handoff_m6_classic/
  - docs/design_handoff_m7_face_tiles/
  - docs/research/
  - docs/tasks/
  - docs/journal/
```

## Why

Agents route through `docs/plan/**`, and they read journals and tasks
"on demand". Docs about Endless, Classic and Tile House would mislead them.
Git keeps the history, and the ozterisk repo stays public for citing.

## Steps

- [ ] **`roadmap.md`:**
  - §4.1 holds only ndle's rows: M11–M15 from the plan's Milestones table,
    plus `M16 — Identity and Release (second plan)` with the exit gate "the
    geometry suite passes for every screen in en and ko, and the production
    smoke test passes".
  - Its first line reads: "M0–M10 are ozterisk's; see
    https://github.com/cgm-16/ozterisk/blob/main/docs/plan/roadmap.md".
  - §5 shows one serial wave per milestone.
  - Drop the M5.5 verdict prose.
- [ ] **`traceability.md`:** a new table with these rows, each naming its
      owning tasks and the test file that is its evidence:
  - R-01 M8's rules (T99, `gameReducer.test.ts`);
  - R-02 the end rule (T99);
  - R-03 Practice band (T106, `puzzle.test.ts`);
  - R-04 the daily list in band with a sacrifice (T102, `dailyTables.test.ts`);
  - R-05 the same date gives the same number (T103);
  - R-06 freeze and veto (T101);
  - R-07 replay rebuilds the state (T104);
  - R-08 storage holds only its contract (T105);
  - R-09 one attempt and resume (T107);
  - R-10 the share text hides the rows (T108);
  - R-11 both game-over variants (T108);
  - R-12 the bilingual copy (T106–T108);
  - R-13 the fit at 393 × 660 (M16);
  - R-14 zero non-origin requests (T100).
- [ ] **`github.md`:** keep §4.2–§4.5. Where the text names "ozterisk",
      write "ndle".
- [ ] **Checklists:** change the ozterisk-specific items in `quality.md`
      §8.1 and `release.md` to ndle's rules. Keep §8.5's 320 px and
      Korean-clipping gates.
- [ ] **Delete:**
  - `docs/archive/`;
  - both `docs/design_handoff_*` folders;
  - `docs/plan/tuning-and-design-system.md`;
  - every `docs/tasks/T01`–`T90` file;
  - every `docs/journal/journal-*.md` dated before 2026-11-09;
  - every `docs/research/game-modes/*` folder **except** `_runner/` and
    `03-puzzle/`. T101 moves the runner, and `puzzle.ts` cites `03-puzzle`.

  Keep:
  - `docs/superpowers/specs/2026-10-19-puzzle-prototype-design.md` and its
    plan, the source of Puzzle's rules;
  - `docs/design-system/`, until T100 removes it along with the code that
    reads it.
- [ ] **Check:**
      `grep -rln "ozterisk" docs/plan docs/checklists docs/spec AGENTS.md README.md`
      lists only files whose every hit is a link to `github.com/cgm-16/ozterisk`.
- [ ] **Gates:** `npm run lint && npm run typecheck && npx vitest run --reporter=default && npm run build`.
      Run them because the research folder held `.ts` files.
- [ ] **Commit:** `docs(plan): ndle roadmap and traceability; drop ozterisk-only docs`,
      with `Task: T94`.
- [ ] **Open the PR:** push over HTTPS (see Global Constraints), then
      `gh pr create` with the title `[M11] Write ndle's rules` and a body
      holding the §4.4 template and a `Closes #` line for each of T91–T94.

## Acceptance gate

- `ls docs/tasks` lists only T91–T108.
- `ls docs/research/game-modes` lists only `_runner` and `03-puzzle`.
