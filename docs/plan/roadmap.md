# Roadmap — Milestones, Dependency DAG, and Waves

M0–M10 are ozterisk's; see https://github.com/cgm-16/ozterisk/blob/main/docs/plan/roadmap.md

### 4.1 Milestones

**A milestone is the unit of merge** (AGENTS.md §4.4), so **every milestone
below must be a reasonable PR-sized goal.** If planning shows one is not, it
is split here before work starts — deliberately and on the record, never ad
hoc at branch time.

| Milestone | Outcome | Tasks | Exit gate |
|---|---|---|---|
| `M11 — ndle's Rules` | `AGENTS.md`, `docs/spec/**`, the README and the plan docs describe 9dle. ozterisk-only docs are gone | T91–T94 | No `docs/spec` or `AGENTS.md` line forbids a numbered daily list or today's daily in storage. `grep -ri ozterisk AGENTS.md docs/spec README.md` finds only links to the ozterisk repo |
| `M12 — Puzzle Only` | Endless, Classic, face tiles, the playtest set and ozterisk's identity are gone. Puzzle is the only run | T95–T100 | The suite, `test:e2e` and build are green. `GameMode` no longer exists. `grep -ri ozterisk src index.html gallery.html public package.json` is empty |
| `M13 — Daily Tables` | 365 numbered tables in band that need a sacrifice ship, with a generator that respects freezing and vetoes | T101–T103 | Every shipped table re-solves to its par, is in band, and has `sacrificeRequired`. The same local date gives the same number |
| `M14 — Daily Resume` | A Daily's moves are saved, and replaying them rebuilds the exact state | T104–T105 | The par line replays to Made par 7 / 8. A record cut after a submit lands in overflow. A corrupt record is ignored without a crash |
| `M15 — Daily and Practice` | The title offers Daily and Practice. A Daily is one attempt that resumes. Both game-over variants and their share texts work | T106–T108 | A reload mid-Daily resumes. A finished Daily shows its result until the next table. No input restarts a Daily. Back mid-Daily returns to the title, and Daily resumes at the same row. The share texts are exact-match tested in en and ko |
| `M16 — Identity: Title and Game Over` | B's palette, faces and focus ring; one top bar; a geometry sweep over every gallery state in en and ko; the title and both game-over variants in B | T109–T112 | The contrast test is green. The sweep measures every state at 393 × 660 and 375 × 660 in en and ko, with the bar; only its known misses overflow, and no title or game-over state is among them |
| `M17 — Identity: The Table in Play` | The HUD, ledger, answer row, rack, rail, feedback and overflow in B; B's motion; the suite closed | T113–T117 | The known-miss list is gone and every state fits. §1.12's two known misses are deleted. The keyframe inventory is B's thirteen, under `nd-` |
| `M18 — Launch` | The launch date set, `DAILY_LAUNCHED` true, the review file dated from it | T118 | `dailyNumberOn(DAILY_LAUNCH_DATE)` is 1 at Ori's date, and the review-file test is green. Then the release PR, and the production smoke test passes |

## 5. Dependency DAG and Execution Waves

One serial wave per milestone: each milestone's tasks run in order, and a
milestone starts when the previous one has merged.

| Wave | Milestone | Tasks | Priority | Parallel rule | Wave exit gate |
|---|---|---|---|---|---|
| W0 | M11 | T91–T94 | P0/P1 | Serial | The M11 exit gate |
| W1 | M12 | T95–T100 | P0 | Serial | The M12 exit gate |
| W2 | M13 | T101–T103 | P0 | Serial | The M13 exit gate |
| W3 | M14 | T104–T105 | P0 | Serial | The M14 exit gate |
| W4 | M15 | T106–T108 | P0 | Serial | The M15 exit gate |
| W5 | M16 | T109–T112 | P0/P1 | Serial | The M16 exit gate |
| W6 | M17 | T113–T117 | P0/P1 | Serial | The M17 exit gate |
| W7 | M18 | T118 | P0 | Serial | The M18 exit gate |

No agent may modify another active task's owned paths. If a shared type must change, pause the dependent task, land the type change through the owning prerequisite task, rebase, and rerun its gate.

### 7.5 Wave monitoring

At the end of every wave:

- [ ] All tasks in the wave are merged or explicitly waived by the user.
- [ ] All wave-owned focused tests pass.
- [ ] Full test suite passes.
- [ ] Typecheck passes.
- [ ] No out-of-scope dependency was added.
- [ ] No task in the next wave has an unresolved dependency.
- [ ] Update milestone progress and unblock the next wave.

## 10. Execution Handoff

Recommended execution mode: `superpowers:subagent-driven-development`, one fresh implementation agent per task, with specification review followed by quality review at every task boundary.

Alternative execution mode: `superpowers:executing-plans`, processing one wave at a time with a user-visible checkpoint after each wave.
