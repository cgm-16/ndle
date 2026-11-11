# ndle Identity and Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task by task.
> Task steps live in `docs/tasks/T109..T118.md` and use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Give 9dle its approved identity (direction B, Chalkboard), make
every screen fit `393 × 660` and `375` wide in English and Korean, set the
launch date, and release to `prod`.

**Architecture:**
- No rule, reducer or storage change. The work is tokens, faces, components'
  markup and CSS, copy, keyframes, and the geometry suite.
- **The app's top bar becomes one component, `TopBar`.** App and the gallery
  both render it, so every gallery state is measured with the bar's 52 px.
- **The answer row stays mounted** through feedback and overflow. The motion
  plays on it, and the discard's auto-advance waits on its `animationend`
  (`GameScreen.tsx:35-47`).
- **Correct and wrong marks are one inline-SVG component, `Mark`.** Gothic A1
  carries no ✓ or ✗, and has ○ only in a slice the app does not load, so the
  marks draw the same in every browser.

**Tech Stack:** Vite, React 19 `useReducer`, TypeScript, CSS Modules, Vitest
and React Testing Library, and Playwright for geometry only, all unchanged.
Two packages are added: `@fontsource/atkinson-hyperlegible` and
`@fontsource/gaegu`. Both are 5.3.0 and OFL-1.1 (`npm view`, 2026-11-11).

**Spec:**
- [`2026-11-09-puzzle-spin-off-design.md`](../specs/2026-11-09-puzzle-spin-off-design.md)
  §3 and §6;
- `docs/spec/ui-i18n.md` §1.12–§1.16;
- `docs/spec/product.md` §1.2b and §1.10.

The identity is drawn on the design canvas (private to Ori):
- `PrototypeB.dc.html` draws the screens; Ori approved it as checkpoint 1.3 on
  2026-11-10;
- `IdentityB.dc.html` gives the palette, contrast, type and motion; Ori
  approved it as 1.2 on 2026-11-11.

The canvas is not in the repo. Each task file carries the values it needs.

## Ori's answers, 2026-11-11

- **Contrast, with one blue.**
  - The focus ring stays `#8ccff2`, moved to a 3 px offset, so it clears the
    tile's 3 px dust edge.
  - The language toggle's two halves get a 6 px slate gap and lose
    `overflow: hidden`, so no ring lands on chalk.
  - The pink discard dash and the "+" badge keep their colours. Each passes
    against slate where it meets the field (8.08 and 9.06 : 1).
- **Hues.** §1.12 is amended to B:
  - blue marks focus, the current row and actions;
  - pink marks wrong, or a tile leaving;
  - correct has no hue; its mark and its word carry it.
- **The correct mark** is ○ in Korean and ✓ in English. ✗ marks wrong in
  both.
- **The launch date** is the day after Ori plans to merge the release PR. It
  is set in T118, and Ori confirms it in that PR.

## Rulings in this plan, for Ori to check

Each settles a gap between the prototype, the board and the spec. The spec
wins unless the ruling amends it, and each amendment lands in the task that
needs it.

1. **Settled by the prototype and the spec:**
   - Back sits at the bar's left edge, the wordmark and a label in the
     centre, and the toggle on the right.
   - The streak counter and the held (on-loan) socket stay; the prototype
     omits both.
2. **The keyboard help stays.** The prototype's title shows three steps and
   a note, but §1.14 requires the keyboard controls on the title. The `More`
   disclosure stays, holding the topics the three steps don't state (T111).
3. **The answer row stays mounted in feedback and overflow.** This is the
   riskiest ruling.
   - **Why:** the prototype replaces the row with the verdict, but the
     board's motion animates the answer tiles. In overflow, the auto-advance
     also waits on them.
   - **What changes:** the verdict takes the actions' place. Its line carries
     the verdict and the row's equation with its product, for example
     `✗ Missed · 3 × 5 = 15` or `✓ Correct · Received 8 1 6`. The played
     tiles stay visible in the slots, and the status announcement says
     "you played 57" (T115).
   - **The arithmetic,** at the prototype's sizes at `393 × 660`:
     - the answering screen is 622 px (52 bar, 28 HUD, 8 + 290 ledger,
       12 + 120 band, 12 + 84 hand, 16 bottom), which leaves 158 px for the
       band;
     - the feedback band is the 60 px answer row, an 8 px gap, a 26 px
       verdict line, another 8 px gap and the 48 px Next Round, so 150 px;
     - the miss screen is therefore 652 of 660 px, with 8 px to spare;
     - T113 takes ledger rows from 32 to 30 px, which brings the spare to
       about 22 px;
     - the band is a fixed 150 px in every phase, so the rack never moves.
       Every phase's screen is then about 638 px.
   - **If it doesn't fit,** for example because the verdict line wraps in
     Korean, the alternative is Ori's choice: the prototype's layout, with
     the miss motion moved elsewhere. T115 stops and reports rather than
     shrinking type below the board's sizes.
4. **Reduced motion keeps every animation at 0.01 ms.** The prototype's
   `animation: none` would fire no `animationend` and stall the round after a
   discard (T116).
5. **`miss-nudge` is dropped.** The board gives a miss its pink stroke across
   the answer tiles (`crack`).
   - `chalk-in` is the board's look for `fire` and `rim-reject`.
   - The unused `rise-ready` is deleted, which leaves thirteen keyframes
     (T116).
6. **Keyframes are renamed from `oz-` to `nd-`.** `oz-` is ozterisk's prefix,
   and T116 rewrites every keyframe anyway.
7. **One rack size.** Five equal columns of the arena, 8 px apart, 56 px
   tall, never narrower than 44 px. It replaces §1.12's three tiers, and the
   arena is at most 393 px wide at every viewport, so desktop shows the phone
   layout centred (T114).
8. **Game over gains the prototype's row marks and share-text preview** (T112).
9. **The miss verdict reads `Missed` / `오답`.** The prototype prints the
   ledger's lower-case word; this matches `Correct` (T115).
10. **The Daily number moves inside the game-over `h1`,** as its first line,
    so heading navigation reads "Table #12, Made par" (T112). This closes a
    parked M15 finding.
11. **Copy follows the prototype.** §1.14 changes are:
    - **HUD:** `Round` becomes `Row` / `줄` (`hud.round`), so
      `howToPlay.progress` starts "Row shows…" / "줄은…" (T113).
    - **Title:**
      - `title.summary` is replaced by `title.tagline` and `title.how1`–`3`;
      - `howToPlay.correct` and `howToPlay.capacity` are deleted, because
        `how2` states both;
      - `title.note` is added (T111).
    - **Feedback:**
      - `result.submitted` and `result.answer` give way to the verdict line
        and the announcement in ruling 3;
      - `result.rewards` lists the digits ("Received 8 1 6") instead of a
        count (T115).
    - **Overflow:** `overflow.instructionOne` becomes "Six tiles, five
      sockets. Choose a tile to discard." (T114).
    - **The toggle** shows `EN` / `한`, while its accessible names stay
      `English` / `한국어` (T110).
    - Each task's file gives its exact en and ko strings.
12. **Three milestones, not one.** The restyle would be one very large PR, and
    launch is a one-way door, so it merges alone (AGENTS.md §4.4):
    - M16: tokens, the bar, the geometry sweep, the title and game over;
    - M17: the table in play, motion, and closing the suite;
    - M18: the launch.
13. **Game over no longer draws the equation the run stopped on.** The
    prototype doesn't draw it. `gameOver.reason` says why the run ended, and
    the row marks show where. §1.12's "terminal row stays visible" is
    amended (T112).
14. **The title is measured with `More` closed.** Opened, it may scroll,
    because the player asked for the text (T111).

## Milestones

| Milestone | Outcome | Tasks | Exit gate |
|---|---|---|---|
| `M16 — Identity: Title and Game Over` | B's palette, faces and focus ring; one top bar on every screen; a geometry sweep over every gallery state in en and ko; the title and both game-over variants in B | T109–T112 | The contrast test is green. The sweep measures every state at `393 × 660` and `375 × 660` in en and ko, with the top bar. Only states named in its known-miss list overflow, and the title and game-over states are not on it |
| `M17 — Identity: The Table in Play` | The HUD, ledger, answer row, rack, rail, feedback and overflow in B; B's motion; the suite closed | T113–T117 | The known-miss list is gone, and every state fits with the ring-reach check passing. §1.12's "two known misses" line is deleted. The keyframe inventory is B's thirteen, under `nd-` |
| `M18 — Launch` | The launch date set, `DAILY_LAUNCHED` true, and the review file dated from it | T118 | `dailyNumberOn(DAILY_LAUNCH_DATE)` is 1 at Ori's date. The review-file test is green. The release checklist is ready for the release PR |

**The release follows M18:** a PR from `main` into `prod`, which Ori merges
with a merge commit (AGENTS.md §4.6). See "Release" below.

## Global Constraints

Every task inherits these, and plan 1's Global Constraints still hold
(`2026-11-09-ndle-core.md`). Values are copied from the board.

- **Palette** (the board's §2):

  | Name | Hex | Role |
  |---|---|---|
  | slate | `#1d2530` | the field, and ink on chalk and blue |
  | raised | `#283241` | the current row, cards, the share preview |
  | chalk | `#eef0ea` | text, the tile face |
  | dust | `#aab3bf` | secondary text, the tile's bottom edge, outlined buttons |
  | socket | `#7d8896` | the empty socket's and unplayed mark's dash |
  | hairline | `#3a4656` | row rules, and the borders of Back and the toggle |
  | blue | `#8ccff2` | focus, the current row, actions, the "+" badge |
  | pink | `#f2a7b6` | wrong, and a tile leaving |

- **Faces:**
  - Atkinson Hyperlegible 400 and 700, for Latin and every digit, loaded
    eagerly from the `latin` subset;
  - Gothic A1 400 and 700, for Hangul, loaded on Korean by the existing
    `loadKoreanFont`;
  - Gaegu 700, for both wordmarks and the title's step numerals, from its
    sliced `700.css`.
  - `--font-ui` is Atkinson Hyperlegible, then Gothic A1, then the system
    stack. Only weights 400 and 700 exist.
- **Type:** 12 px is the smallest text. There is no uppercase transform and
  no letter tracking.
- **Focus:** a `3px solid` blue outline at a `3px` offset, on every control.
- **Material:** the tile is a flat chalk face with a `0 3px 0` dust bottom
  edge, and no blurred shadow. Disabled is 45 % opacity. There is no backdrop
  blur, and no colour wash.
- **Frame:** the arena's content is at most 361 px wide, inside a 393 px
  frame with a 16 px gutter on each side.
- **The canvas** is never rendered or screenshotted. Every value a task
  needs is in its task file.
- **Copy:** every new string gets an `en` and a `ko` entry, and §1.14 is
  amended in the same commit.
- **Gates for every task:**
  - `npm run lint`, `npm run typecheck`,
    `npx vitest run --reporter=default` (output read in full),
    `npm run test:e2e` and `npm run build`;
  - before each command, `eval "$(fnm env --shell bash)" && fnm use 24`.
- **Git:** as plan 1.
  - One branch per milestone: `feat/M16-identity`, `feat/M17-identity-play`,
    `feat/M18-launch`.
  - One Conventional Commit per task, with `Task: T##` in the body.

## Review Focus

Failure modes the spec implies but no headline test reaches. Each has its
test in the task named.

1. **The top bar's height.** A fit measured without the bar passes 52 px
   short, and one measured with the gallery's picker fails for the wrong
   reason.
   - The gallery gains a single-state page, `gallery.html?state=<id>`,
     which renders only `TopBar` and the screen. The sweep measures that
     document.
   - Pinned in T110: the sweep fails at `393 × 400`, and fails a state whose
     stack fits only without the bar.
2. **Korean wraps longer.** "타일 여섯 개, 칸 다섯 개. 버릴 타일 1개를
   선택하세요." is wider than its English.
   - Every state is measured in ko as well as en (T110), and each layout task
     clears its states in both.
3. **Fonts that load late.** A fit measured in the fallback face can pass,
   then fail once Gaegu or Atkinson arrives.
   - The sweep awaits `document.fonts.ready` and asserts that the faces in
     use are the self-hosted ones (T109, T110).
4. **Reduced motion must still fire `animationend`,** or the round never
   advances after a discard.
   - Pinned in T116: under `prefers-reduced-motion`, every element whose
     `animationend` the round waits on still has an animation, of at most
     1 ms.
5. **A focus ring painted onto a neighbour.** At a 3 px offset, a ring
   reaches 6 px out.
   - T109 checks the outline's style on the live screens that
     `accessibility.spec.ts` already visits.
   - Pinned in T110, over every sweep state: no focused control's ring box
     meets another control's border box. That covers the toggle's halves,
     Clear beside Submit, slots and rack tiles.

The tasks also pin these:
- the contrast pairs, by computed WCAG ratio (T109);
- the ○ mark in Korean and ✓ in English, from one component (T112);
- the held socket, visibly distinct from an empty one (T114);
- the launch date's review file, re-dated (T118).

## Tasks

| Task | Title | Milestone | Depends on |
|---|---|---|---|
| [T109](../../tasks/T109-palette-and-faces.md) | B's palette, faces and focus ring | M16 | — |
| [T110](../../tasks/T110-top-bar-and-sweep.md) | One top bar, and the geometry sweep | M16 | T109 |
| [T111](../../tasks/T111-title.md) | The title in B | M16 | T110 |
| [T112](../../tasks/T112-game-over.md) | Game over in B, with row marks | M16 | T111 |
| [T113](../../tasks/T113-hud-ledger-answer-row.md) | HUD, ledger and answer row in B | M17 | T112 |
| [T114](../../tasks/T114-rack-rail-overflow.md) | Rack, rail and overflow in B | M17 | T113 |
| [T115](../../tasks/T115-feedback.md) | Feedback in B | M17 | T114 |
| [T116](../../tasks/T116-motion.md) | B's motion | M17 | T115 |
| [T117](../../tasks/T117-close-the-suite.md) | Every screen fits; the suite closed | M17 | T116 |
| [T118](../../tasks/T118-launch-date.md) | The launch date | M18 | T117 |

Every task depends on the one before it. Nothing is parallel-safe, because
the tasks share `src/styles/tokens/`, `src/i18n/messages.ts`, the gallery and
the e2e specs.

## Parked from plan 1

Each item from the ledger and the journal's "Found, for M16" lists has an
owner or a "left as is".

| Item | Owner |
|---|---|
| `--font-ui` leads with Gothic A1, so Korean digits render in it | T109 |
| CSS asks for weights 500 and 600, which aren't loaded | T109 |
| Unused `--verm-400` and `--surface-table`; old-identity token names | T109 |
| Comments citing the old palette's ratios, gold or ceramic | the task that restyles each file (T109–T116) |
| `.ringJade` and `.ringGold` draw the same blue | T116 |
| `@container app (width >= 304px)` has no stated derivation | T116 |
| The two weak `>= 5` floors in `accessibility.spec.ts` | T117 |
| 21 bare ozterisk issue numbers in `src` and `e2e` comments | T117 |
| Back's placement in the bar | T110 |
| The next-table line reuses the R hint's class | T112 |
| The Daily number is read before the verdict heading | T112 |
| A Daily left by Back between its last submit and Next Round is labelled `Daily #n` until opened | left as is: opening it resumes at feedback, and Next Round reaches its result |
| Generic multi-discard code and its excess-2 tests; two unreachable guards | left as is: they are dead, not wrong, and no task here touches the reducer |
| The shipped-list test does not check pay digits are 0–9 | left as is |
| T106 and T108's task files describe Back and `variant` as first planned | left as is: task files are the record of what was asked |

## Release (after M18 merges)

The release is not a task, because it has no code. It runs in this order.

1. **Prepare (Claude):**
   - work through `docs/checklists/release.md` §8.6 on `main`;
   - check that CI is green on `main`'s tip;
   - check the date of T118's generator run. If it is more than a day before
     the planned merge, rerun the generator on a branch first. That meets
     "ships within a day of being generated";
   - open the release PR, base `prod`, head `main`, titled
     `Release 9dle 1.0`.
2. **[Ori]** Confirm that the launch date in the PR is the day after you
   merge it. If it isn't, Claude fixes it on a branch first.
3. **[Ori]** Merge the release PR with **Create a merge commit**, never a
   squash (§4.6).
4. **Smoke test on release day (Claude),** on `https://ndle.vercel.app`, in
   en and ko:
   - the deployment's commit is the merge commit;
   - the title offers Practice and shows `No table today`;
   - a Practice run plays to game over with the mouse, then again with
     touch (Playwright with `hasTouch`) and with the keyboard only;
   - there are zero non-origin requests, and the fonts are served
     same-origin;
   - storage holds only `ndle.language`.
5. **Smoke test on launch day (Claude):**
   - Daily #1 opens;
   - two browsers with fresh storage get the same table. That is Chromium and
     WebKit if both are installed; otherwise two Chromium contexts, and the
     report says so;
   - a reload mid-run resumes at the same row;
   - a finished Daily shows its result;
   - the share text names #1 and the production URL, and no row.
6. **Record (Claude):**
   - a journal entry with every command and its result;
   - the evidence column of `docs/plan/traceability.md`, one row at a time,
     each pointing at its test or smoke step;
   - #19: comment, then close.

**CI covers the release:** `ci.yml` runs on every pull request and on pushes
to `main` and `prod`. So the release PR and its merge commit are each built.

**[Ori], outside the code:** CI is not yet a required check. Making it
required is a ruleset change, which agents cannot make.

## After Ori approves this plan, before T109

Claude files the GitHub queue, per `docs/plan/github.md`:

1. **Milestones:**
   - rename `M16 — Identity and Release` to
     `M16 — Identity: Title and Game Over`;
   - create `M17 — Identity: The Table in Play` and `M18 — Launch`.
2. **Issues:** one per task, T109–T118, each opening with its task file's
   `yaml` block and linking the task file.
3. **#19** becomes the tracking issue for this plan. It is retitled
   `Identity, Launch and Release (tracking)` and gets the ten issues as a
   task list.

Each milestone's PR closes its own task issues. #19 closes after the launch-day
smoke test.
