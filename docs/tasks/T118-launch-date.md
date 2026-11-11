---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # "Ori's answers", "Release"
  - docs/spec/product.md  # §1.2b, the freeze and launch-date rules
  - src/game/daily.ts
  - src/game/dailyPicker.ts  # frozenThroughOn, describeDaily
  - src/game/dailyTables.test.ts
  - scripts/daily/generate.ts
  - scripts/daily/vetoes.json
  - docs/checklists/release.md
  - README.md
---

# T118 — The launch date

```yaml
task_id: T118
title: The launch date
milestone: M18 — Launch
priority: P0
estimate: S
wave: W7
depends_on: [T117]
parallel_safe: false
paths:
  - src/game/daily.ts
  - src/game/daily.test.ts
  - src/game/dailyTables.test.ts
  - src/game/dailyTables.json
  - scripts/daily/review.md
  - scripts/daily/vetoes.json
  - README.md
  - docs/checklists/release.md
```

## Why

**Table #1's date is set once.** After launch, changing it renumbers every
table, which breaks every saved `ndle.daily` number and every shared "#n".
This is the one-way door in the plan, so it merges alone.

**The freeze:** `DAILY_LAUNCHED` turns on freezing, so the generator never
again changes a table whose date is within two days.

## Inputs from Ori, before dispatch

The controller gets both from Ori, and the dispatch carries them:
- **`D`:** the launch date, which is the day after Ori plans to merge the
  release PR;
- **vetoes:** any vetoes from `scripts/daily/review.md`, as
  `{ "number": N, "reason": "…" }`, or none.

## Values

- `DAILY_LAUNCH_DATE` is `D`, and `DAILY_LAUNCHED` is `true`.
- Their comments become evergreen:
  - "Table #1's date. Set once; changing it renumbers every table and breaks
    saved and shared numbers";
  - "The generator freezes slots through today + 2".
- The generator is run once, from the repo root, before `D`:
  `node scripts/run.mjs scripts/daily/generate.ts`.
  - It applies the vetoes and re-dates `review.md` from `D`.
  - With no vetoes, `dailyTables.json` is unchanged.

## Steps

- [ ] **Tests:**
  - **`daily.test.ts`:**
    - `DAILY_LAUNCH_DATE` equals `D`, written as a literal, so any later
      change shows in review;
    - `dailyNumberOn(D)` is 1.
  - **`dailyTables.test.ts`:**
    - the committed review file (`../../scripts/daily/review.md?raw`) equals
      `DAILY_TABLES.map((t, i) => describeDaily(i + 1, dateOfDaily(i + 1), t)).join("\n")`;
    - `frozenThroughOn(dateOfDaily(1), DAILY_TABLES.length, DAILY_LAUNCHED)`
      is 3.

  Record the failures: today's constant is the placeholder, and the review
  file is dated from 2026-11-09.
- [ ] **Vetoes:** add Ori's to `vetoes.json`'s `pending`, or none.
- [ ] **Set** the two constants.
- [ ] **Run the generator,** and record its output line (kept, replaced,
      added, plants, seconds).
  - Without vetoes, `git diff --stat` touches only `review.md` among the
    daily files.
  - With vetoes, it also touches `dailyTables.json`, only in the vetoed
    slots, and `vetoes.json`.
- [ ] **Docs:**
  - `README.md`'s Daily section states the launch date;
  - in `docs/checklists/release.md`, tick each §8.6 item that is true on this
    branch, and leave the release-time items open.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `feat(daily): launch on <D>`, with `Task: T118`.

## Acceptance gate

- The four tests are green.
- `review.md` is dated from `D`, and matches the shipped list.
- The generator's output line is in the report.
