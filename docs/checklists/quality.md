# Quality Checklists

Master checklists §8.1–§8.5. The release checklist (§8.6) and Definition of
Done (§9) live in `docs/checklists/release.md`.

### 8.1 Specification lock

- [ ] A table opens with five distinct digits and has eight rows.
- [ ] A one-digit product pays 2 tiles and a two-digit product pays 3.
- [ ] Capacity is exactly 5.
- [ ] A wrong answer is legal and pays nothing.
- [ ] The run ends after row 8, or earlier when the hand holds fewer tiles
      than the next answer needs. A hand with enough tiles but the wrong
      digits plays on.
- [ ] No dial changes value: `PUZZLE_MIN_PAR` is 7 and `PUZZLE_MIN_ONLY_MOVES`
      is 2 for both Practice and the daily list.
- [ ] Practice deals live with `dealPuzzle(Math.random)`. A Practice table is
      never named or replayed, and its share text gives only the score against
      par.
- [ ] The same local date gives the same daily table number.
- [ ] Every daily table is in band and needs a sacrifice.
- [ ] A daily slot freezes two days before its date arrives, nothing freezes
      before launch, and a veto touches only unfrozen slots.
- [ ] A daily is one attempt that resumes after a reload.
- [ ] The daily share text gives the table number, the score against par and
      the game's link, and never the rows.
- [ ] There is no backend, account, analytics, leaderboard, daily streak or
      result URL.

### 8.2 Architecture lock

- [ ] Reducer is pure and deterministic.
- [ ] Randomness and IDs are injected.
- [ ] Domain utilities import neither React nor browser APIs.
- [ ] State contains canonical data only.
- [ ] Invalid actions are reducer no-ops.
- [ ] Language state is independent of game state.
- [ ] Storage holds only the language and today's daily (its table number, its
      moves so far and its outcome).
- [ ] Share/copy browser APIs are injected in tests.
- [ ] No backend or external state library exists.

### 8.3 Interaction acceptance

- [ ] Mouse/touch selects and returns tiles.
- [ ] Duplicate click selects the exact tile.
- [ ] Digit key selects the first sorted matching tile.
- [ ] Backspace returns the latest selected tile.
- [ ] Enter submits only when every slot is filled, and advances from
      feedback (docs/spec/product.md §1.11).
- [ ] Disabled keyboard actions are no-ops.
- [ ] The mark completes the overflow discard, and the next row starts on its
      own afterwards.
- [ ] Back mid-Daily returns to the title, and Daily resumes at the same row.
- [ ] Language switches live without resetting the run.

### 8.4 Quality acceptance

- [ ] Unit tests cover all legal reducer transitions.
- [ ] Representative invalid transitions return identical state.
- [ ] The par line of the sample table replays to Made par 7 / 8 on the real
      reducer.
- [ ] Component tests cover all requested interaction slices.
- [ ] No browser test asserts a game rule, reducer transition, or interaction
      flow.
- [ ] Share texts are exact-match tested in en and ko.
- [ ] Lint passes with zero warnings.
- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] No console error appears in normal flows.

### 8.5 Accessibility and responsive acceptance

- [ ] Semantic buttons for all actions/tiles/slots.
- [ ] Logical focus order follows visual hierarchy.
- [ ] Visible focus on every control, at `3:1` or better against every surface the
      indicator can appear on, including the tile face.
- [ ] Status feedback is announced.
- [ ] State does not rely only on color.
- [ ] Minimum target size is 44px.
- [ ] No horizontal scroll at 320px.
- [ ] Korean copy does not clip.
- [ ] Reduced motion is respected.
