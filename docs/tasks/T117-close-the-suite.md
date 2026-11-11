---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # "Parked from plan 1"
  - docs/spec/ui-i18n.md  # §1.12, the first rule and its known misses
  - docs/plan/traceability.md  # R-13
  - e2e/fit.spec.ts
  - e2e/accessibility.spec.ts  # the two ">= 5" floors, :126 and :248
  - src/styles/tokens/
  - src/gallery/states.tsx
---

# T117 — Every screen fits; the suite closed

```yaml
task_id: T117
title: Every screen fits; the suite closed
milestone: M17 — Identity: The Table in Play
priority: P1
estimate: S
wave: W6
depends_on: [T116]
parallel_safe: false
paths:
  - e2e/
  - src/styles/tokens/
  - src/gallery/
  - src/components/
  - docs/spec/ui-i18n.md
  - docs/plan/traceability.md
```

## Why

Every screen now fits, so the sweep's list of known misses has nothing left
to hold, and §1.12's first rule loses its two exceptions. This task also
clears what the restyle leaves behind: unused tokens, the old identity's
words in comments, and the issue numbers that name ozterisk's issues but
read as 9dle's.

## Steps

- [ ] **The sweep:**
  - **If `KNOWN_MISSES` still holds any key, stop and report it.** That state
    belongs to an earlier task.
  - Otherwise delete the set and its asserting branch, so the sweep requires
    every state to fit and to pass the ring-reach check.
- [ ] **The floors:**
  - run `accessibility.spec.ts` and record the two counts it sweeps, at
    `:126` (focusable controls) and `:248` (targets);
  - replace each `toBeGreaterThanOrEqual(5)` with the measured count, as
    `toBe(n)`, so a lost control fails;
  - check the instrument: with one control's `button` changed to a `div`,
    the count check fails. Revert that change.
- [ ] **Unused tokens:**
  - for each custom property defined in `src/styles/tokens/`,
    `grep -rn -- "var(--name)" src` finds a use, or it is deleted;
  - this covers the old `--size-*` scale and the Korean size overrides T109
    left in place.
- [ ] **The old identity's words:**
  - `grep -rniE "ceramic|gold|vermilion|jade|felt|clay" src e2e` prints
    nothing;
  - that covers the gallery's labels and text (`states.tsx:92,94,131`, the
    `feedback-streak-5` label, `states.test.tsx:116,119`) and any comment the
    restyle tasks left.
- [ ] **Bare ozterisk issue numbers:**
  - `#31`, `#84`, `#85`, `#104`, `#105`, `#130`, `#138` and `#142` name
    ozterisk's issues, in comments in `src` and `e2e`;
  - drop each number, keeping the comment's meaning, for example "which is
    how #84 survived a measurement pass" becomes "which is how an overflow
    survived a measurement pass";
  - `grep -rnE "#(31|84|85|104|105|130|138|142)\b" src e2e` then prints
    nothing. `#12` in tests is the Daily table's number and stays.
- [ ] **Spec and traceability:**
  - `ui-i18n.md` §1.12: delete "Two known misses, owned by the second plan
    (M16)…", and the first rule's "Until then…" clause;
  - name `e2e/fit.spec.ts` among the geometry specs;
  - in `traceability.md`, R-13's evidence names `e2e/fit.spec.ts`, every
    gallery state at `393 × 660` and `375 × 660` in en and ko.
- [ ] **Gates**, all of them.
- [ ] **Commit:** `test(layout): every screen fits; the suite closed`, with
      `Task: T117`.

## Acceptance gate

- `KNOWN_MISSES` is gone, and the sweep passes for every gallery state in en
  and ko at both sizes.
- The two floors are exact counts, and the count check fails on a removed
  control.
- The three `grep`s above print nothing.
