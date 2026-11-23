# Quality Checklists

Master checklists §8.1–§8.5. The release checklist (§8.6) and Definition of
Done (§9) live in `docs/checklists/release.md`.

### 8.1 Specification lock

- [x] A table opens with five distinct digits and has eight rows.
- [x] A one-digit product pays 2 tiles and a two-digit product pays 3.
- [x] Capacity is exactly 5.
- [x] A wrong answer is legal and pays nothing.
- [x] The run ends after row 8, or earlier when the hand holds fewer tiles
      than the next answer needs. A hand with enough tiles but the wrong
      digits plays on.
- [x] No dial changes value: `PUZZLE_MIN_PAR` is 7 and `PUZZLE_MIN_ONLY_MOVES`
      is 2 for both Practice and the daily list.
- [ ] Practice deals live with `dealPuzzle(Math.random)`. A Practice table is
      never named or replayed, and its share text gives only the score against
      par.
- [x] The same local date gives the same daily table number.
- [x] Every daily table is in band and needs a sacrifice.
- [x] A daily slot freezes two days before its date arrives, nothing freezes
      before launch, and a veto touches only unfrozen slots.
- [x] A daily is one attempt that resumes after a reload.
- [x] The daily share text gives the table number, the score against par and
      the game's link, and never the rows.
- [x] There is no backend, account, analytics, leaderboard, daily streak or
      result URL.

### 8.2 Architecture lock

- [x] Reducer is pure and deterministic.
- [x] Randomness and IDs are injected.
- [x] Domain utilities import neither React nor browser APIs.
- [ ] State contains canonical data only.
- [x] Invalid actions are reducer no-ops.
- [x] Language state is independent of game state.
- [x] Storage holds only the language and today's daily (its table number, its
      moves so far and its outcome).
- [x] Share/copy browser APIs are injected in tests.
- [x] No backend or external state library exists.

### 8.3 Interaction acceptance

- [ ] Mouse/touch selects and returns tiles.
- [x] Duplicate click selects the exact tile.
- [x] Digit key selects the first sorted matching tile.
- [x] Backspace returns the latest selected tile.
- [x] Enter submits only when every slot is filled, and advances from
      feedback (docs/spec/product.md §1.11).
- [ ] Disabled keyboard actions are no-ops.
- [x] The mark completes the overflow discard, and the next row starts on its
      own afterwards.
- [x] Back mid-Daily returns to the title, and Daily resumes at the same row.
- [x] Language switches live without resetting the run.

### 8.4 Quality acceptance

- [ ] Unit tests cover all legal reducer transitions.
- [x] Representative invalid transitions return identical state.
- [x] The par line of the sample table replays to Made par 7 / 8 on the real
      reducer.
- [ ] Component tests cover all requested interaction slices.
- [ ] No browser test asserts a game rule, reducer transition, or interaction
      flow.
- [x] Share texts are exact-match tested in en and ko.
- [x] Lint passes with zero warnings.
- [x] Typecheck passes.
- [x] Production build passes.
- [x] No console error appears in normal flows.

### 8.5 Accessibility and responsive acceptance

- [x] Semantic buttons for all actions/tiles/slots.
- [ ] Logical focus order follows visual hierarchy.
- [ ] Visible focus on every control, at `3:1` or better against every surface the
      indicator can appear on, including the tile face.
- [x] Status feedback is announced.
- [ ] State does not rely only on color.
- [x] Minimum target size is 44px.
- [x] No horizontal scroll at 320px.
- [x] Korean copy does not clip.
- [x] Reduced motion is respected.
