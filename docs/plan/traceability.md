# Requirements Traceability Matrix

## 3. Requirements Traceability Matrix

| Requirement | Owning task(s) | Required evidence |
|---|---|---|
| R-01 M8's rules: five distinct opening digits, eight rows, a pay of 2 or 3, capacity 5, a legal wrong answer | T99 | `gameReducer.test.ts` |
| R-02 the end rule: the run ends after row 8, or when the hand holds fewer tiles than the next answer needs | T99 | `gameReducer.test.ts` |
| R-03 Practice band: `dealPuzzle` tables meet `PUZZLE_MIN_PAR` and `PUZZLE_MIN_ONLY_MOVES` | T102 | `puzzle.test.ts` |
| R-04 the daily list is in band and every table needs a sacrifice | T103 | `dailyTables.test.ts` |
| R-05 the same date gives the same number | T101 | `daily.test.ts` |
| R-06 a daily slot freezes two days before its date arrives, nothing freezes before launch, and a veto touches only unfrozen slots | T102 | `dailyPicker.test.ts` |
| R-07 replay rebuilds the state | T104 | replay tests: the par line replays to Made par 7 / 8, and a record cut after a submit lands in overflow |
| R-08 storage holds only its contract: the language and today's daily | T105 | storage tests: a corrupt record is ignored without a crash; T107's `App.test.tsx` test "stores only the language and today's daily" |
| R-09 a Daily is one attempt and resumes | T107 | app tests: a reload mid-Daily resumes, and no input restarts a Daily |
| R-10 the share text hides the rows | T108 | exact-match share tests in en and ko |
| R-11 both game-over variants | T108 | component tests for the Daily and Practice game-over screens |
| R-12 the bilingual copy | T106–T108 | typed dictionary has an `en` and a `ko` entry for every string; component tests in both locales |
| R-13 the fit at 393 × 660 and 375 wide, in en and ko | T110–T117 | the sweep, `e2e/fit.spec.ts`, over every gallery state, with `e2e/viewport.spec.ts`, `e2e/puzzle-fit.spec.ts` and `e2e/accessibility.spec.ts` |
| R-14 zero non-origin requests | T100, T109 | a full run in en and ko makes no request to another origin, rechecked with B's faces |
| R-15 Back returns to the title and is not a move | T106, T107 | `gameReducer.test.ts`, `App.test.tsx` |
| R-16 contrast: text at least 4.5:1, the focus ring and non-text marks at least 3:1 | T109 | `src/styles/tokens/contrast.test.ts`; the ring checks in `e2e/accessibility.spec.ts` and `e2e/fit.spec.ts` |
| R-17 correct and wrong marks by shape as well as colour: ✓ in English, ○ in Korean, ✗ in both | T112, T113 | `Mark.test.tsx`; the ledger and game-over tests |
| R-18 the launch date is set once, and the review file matches it | T118 | `daily.test.ts`, `dailyTables.test.ts` |
