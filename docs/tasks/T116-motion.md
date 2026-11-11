---
reads:
  - docs/superpowers/plans/2026-11-11-ndle-identity.md  # rulings 4, 5, 6; Review Focus 4
  - docs/spec/ui-i18n.md  # §1.12 Motion
  - src/styles/tokens/keyframes.css
  - src/styles/tokens/keyframes.test.ts
  - src/styles/tokens/motion.css
  - src/styles/global.css  # the reduced-motion block, :68-95
  - src/components/AnswerSlots/
  - src/components/TileInventory/
  - src/components/GameHud/
  - src/components/EquationBoard/
  - src/components/GameScreen/  # the @container rule, :39-43; the auto-advance, :35-47
  - e2e/viewport.spec.ts  # the slide-off's frame sampling, :379-429
  - e2e/accessibility.spec.ts  # the reduced-motion test, :300-332
---

# T116 — B's motion

```yaml
task_id: T116
title: B's motion
milestone: M17 — Identity: The Table in Play
priority: P1
estimate: M
wave: W6
depends_on: [T115]
parallel_safe: false
paths:
  - src/styles/tokens/keyframes.css
  - src/styles/tokens/keyframes.test.ts
  - src/styles/tokens/motion.css
  - src/styles/global.css
  - src/components/
  - e2e/viewport.spec.ts
  - e2e/accessibility.spec.ts
  - docs/spec/ui-i18n.md
```

## Why

§1.12's keyframe list says "the identity's keyframe list replaces it". This
task is that replacement: chalk, short, and no overshoot.

**What stays:** the moments, the components that trigger them, and the
reduced-motion mechanism (plan, ruling 4).

## Values

Every keyframe is renamed from `oz-` to `nd-` (ruling 6), in
`keyframes.css`, every `:global()` reference, `keyframes.test.ts`'s
`KEYFRAME_REFERENCE` and its absent-name check, and §1.12.

| Keyframe | B's version | Duration | Easing |
|---|---|---|---|
| `nd-bloom` | On a correct answer, the answer tiles lift 4 px and settle | 200 ms | ease-out |
| `nd-ring` | One to three chalk rings, by streak tier (the existing tiers), drawn round the answer tiles like a hand-drawn circle, 60 ms apart | 240 ms each | ease-out |
| `nd-fan` | At the top tier, six chalk flecks fan out 12 px and fade | 320 ms | ease-out |
| `nd-crack` | A pink chalk stroke drawn across the answer tiles | 200 ms | ease-in |
| `nd-dust` | Dust-coloured specks fall 8 px from the stroke and fade | 280 ms | ease-out |
| `nd-fire` | A paid tile's `+` badge fades in from 6 px above; the tile does not move | 180 ms | ease-out |
| `nd-round-rise` | The next prompt rises 6 px into place as it fades in | 180 ms | ease-out |
| `nd-counter-fall` | When the streak breaks, the counter drops 8 px and fades | 200 ms | ease-in |
| `nd-counter-zero` | Then the 0 fades in | 160 ms | ease-out |
| `nd-rim-reject` | The rail tile fades in from 6 px above, with no tilt | 180 ms | ease-out |
| `nd-slide-off` | The discarded tile slides 24 px down and fades | 200 ms | ease-in |
| `nd-perch-drop` | The rail tile drops into the freed socket, from its measured offset | 200 ms | ease-out |
| `nd-slot-arrive` | A tile settles into its slot from 4 px above | 120 ms | ease-out |

- **`oz-rise-ready` is deleted.** It was defined and unused, and B's press is
  a transition. `miss-nudge` is not added (ruling 5).
- **Rings:** `.ringJade`, `.ringGold` and `.ringBright` collapse into one
  chalk ring.
- **The rail:** its `sin(11deg)` padding goes with the tilt.
- **Transitions:**
  - a button's press moves it `1px` down, as `transform` over 80 ms
    ease-out;
  - its background changes over 120 ms ease-out;
  - `--press-offset` is `1px`, and `--ease-snap` and every overshoot curve
    are deleted.
- **Reduced motion:**
  - `global.css` keeps clamping durations to 0.01 ms and delays to 0, so
    every `animationend` still fires;
  - `--press-offset` stays 0;
  - no rule sets `animation: none`.
- **The `@container app (width >= 304px)` clip** existed for the old exit's
  46 px sideways travel.
  - Delete it if `viewport.spec.ts`'s slide-off frame sampling still passes
    at every width without it.
  - Otherwise keep it, with a comment giving its derivation from B's exit.

## Steps

- [ ] **Tests:**
  - **`keyframes.test.ts`:** the defined set equals §1.12's thirteen names,
    every reference resolves, and no `oz-` name is defined or referenced.
    Record the failure.
  - **`accessibility.spec.ts`'s reduced-motion test** (Review Focus 4): in
    the overflow state under `prefers-reduced-motion: reduce`, mark a tile.
    The departing tile and the perch drop each have a computed
    `animation-name` other than `none`, and a duration of at most 1 ms.
    That is a computed-style property; the browser suite asserts no
    behaviour (AGENTS.md).
- [ ] **Implement** the values above. Each touched file's old comments on
      motion budgets, ceramic or gold go.
- [ ] **Replace** §1.12's keyframe table with the table above.
- [ ] **Gates**, all of them, including the slide-off frame sampling at
      every width.
- [ ] **Commit:** `feat(motion): B's motion`, with `Task: T116`.

## Acceptance gate

- The keyframe test is green with thirteen `nd-` names, and no `oz-` name
  remains in `src`.
- Under reduced motion, the gated animations still run at 1 ms or less.
- The GameScreen auto-advance tests are green unchanged.
- The slide-off stays inside the page at every width the viewport spec
  samples.
