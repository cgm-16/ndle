---
reads:
  - docs/superpowers/plans/2026-11-09-ndle-core.md  # Global Constraints
  - AGENTS.md
  - README.md
  - docs/agents/issue-tracker.md
  - .github/ISSUE_TEMPLATE/implementation-task.yml
---

# T91 — The design, AGENTS.md, README and journal for ndle

```yaml
task_id: T91
title: The design, AGENTS.md, README and journal for ndle
milestone: M11 — ndle's Rules
priority: P0
estimate: M
wave: W0
depends_on: []
parallel_safe: false
paths:
  - docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md
  - AGENTS.md
  - README.md
  - docs/journal/journal-2026-11-09.md
  - docs/agents/issue-tracker.md
  - .github/ISSUE_TEMPLATE/implementation-task.yml
```

## Why

Agents obey `AGENTS.md` as written. Three of its lines forbid the daily list
and the saved daily that the design adds:
- line 57, which persists only the language;
- line 63, which forbids seeds;
- line 66, which forbids saved records.

Until these are rewritten, every later task would be refused.

## Steps

- [ ] **Branch check.** `git branch --show-current` prints
      `feat/M11-ndle-rules`.
- [ ] **The design, verbatim, pinned to its commit:** check
      `git cat-file -e c212fcd`, then
      `git show c212fcd:docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md > docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md`.
      Don't edit it. The name and the source commit go in the journal.
- [ ] **AGENTS.md.** Rewrite it for ndle and keep its structure, with these
      decisions:
  - **Header:** `# AGENTS.md — ndle Agent Kernel`. The goal is the plan's
    Goal sentence, and the architecture paragraph is the plan's.
  - **Routing map:** drop the archive row, and add "Generating or vetoing
    daily tables → `docs/spec/product.md` §1.2b".
  - **Global Constraints:** keep every mode-neutral line. That covers the
    stack, client-only, `useReducer`, the pure reducer, CSS Modules, fonts,
    the keyframe inventory, input methods, the typed i18n, the Vitest/RTL and
    geometry-only rule, no sound, Vercel and test-first. Then:
    - add "and never read the clock" to the pure-reducer line;
    - replace `Product name is \`ozterisk\`.` with `Product name is **9dle** (Korean **구들**); the slug is \`ndle\`.`;
    - replace line 57 with: `Persist only the language preference and today's daily (its table number, its moves so far, its outcome) in \`localStorage\`; never persist a Practice run, a past daily, a streak, or any record across days.`;
    - replace line 63 with: `Practice uses ordinary browser randomness. The daily list is chosen offline and ships as numbered tables, never as seeds; a seeded PRNG may exist only in tests and in the offline generator under \`scripts/\`, never in code \`src/main.tsx\` reaches.`;
    - replace line 66 with: `Do not implement a leaderboard, result URLs, accounts, a daily streak, tutorials, or backend validation. A shared Daily names its table number; a Practice table is never named, replayed or shared.`
  - **§4.4–§7.7:** keep them, with these changes:
    - "ozterisk" becomes "ndle";
    - §4.6 keeps `prod` as the production branch (Ori, 2026-11-09);
    - §4.4 adds that agent shells push over HTTPS through
      `gh auth git-credential`.
  - **Agent skills:** the issue tracker is `cgm-16/ndle`.
- [ ] **README.md:** what 9dle is (design §1–§2, one paragraph each for Daily
      and Practice), the commands (all seven npm scripts plus
      `node scripts/run.mjs scripts/daily/generate.ts`, marked "from T102"),
      the deployment (`main` previews, `prod` production) and a credit line
      for `cgm-16`. Endless, Classic and Tile House don't appear.
- [ ] **Journal** `docs/journal/journal-2026-11-09.md`. Record:
  - the seed (ozterisk `feat/M8-puzzle-prototype` at `3ccd37b`);
  - the design's source (ozterisk `main` at `c212fcd`, PR #210);
  - Ori's choices on 2026-11-09:
    - the name: 9dle / 구들, with the slug `ndle`;
    - ozterisk's process kept;
    - `prod` as the production branch;
    - two plans, with the restyle second;
    - subagent-driven execution, with Claude filing the GitHub queue;
    - the review file committed, and the spoiler limit accepted
      (`docs/spec/product.md` §1.2b): no seeding scheme hides future
      tables without a server;
    - Gothic A1 as the placeholder Hangul face;
    - a Back button at the top of the game and game-over screens (T106);
    - identity direction B, Chalkboard, with a prototype before the
      identity board;
  - links to ozterisk's 2026-10-19, 2026-10-26 and 2026-11-09 entries on
    GitHub.
- [ ] **Tracker files:** in `docs/agents/issue-tracker.md` and the issue
      template, "ozterisk" becomes "ndle".
- [ ] **Check:** `grep -n "ozterisk" AGENTS.md README.md docs/agents .github`
      prints only links to `github.com/cgm-16/ozterisk`.
- [ ] **Gates:** `npm run lint && npm run typecheck && npx vitest run --reporter=default && npm run build`.
      These are docs-only changes, so the suite is unchanged.
- [ ] **Commit:** `docs(agents): rewrite the kernel, README and journal for ndle`,
      with `Task: T91`.

## Acceptance gate

- `diff <(git show c212fcd:docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md) docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md`
  prints nothing.
- AGENTS.md's three replaced lines read exactly as above.
