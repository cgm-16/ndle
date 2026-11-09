# 9dle UI, Language, and Sharing Contract

Visual, language, copy, sharing, and persistence contracts (§1.12–§1.16).
The game rules live in `docs/spec/product.md`.

### 1.12 Responsive and visual contract

Token values live in `src/styles/tokens/`. The palette and type are
placeholders until the identity replaces them (the second plan); this section
states the contract any values must satisfy.

**Layout and information architecture**

- **Every screen fits `393 × 660` with no page scroll, and `375` wide.** 393 × 660
  is a common phone's viewport less its browser chrome. The geometry specs in
  `e2e/` assert it.
- Use one centered vertical arena on desktop and mobile.
- Preserve order across breakpoints: Back → HUD → ledger → equation/slots → phase action → rail (while a tile is past capacity, and until a dropping tile lands) → rack. The rail sits directly above the rack, because a perched tile drops from it into a socket.
- Mobile changes spacing, wrapping, and control size, not information architecture.
- **Back** (`action.back`, `Back` / `뒤로`) is the first focusable element of the game screen and of the game-over screen, for Daily and Practice alike. It is at least `44 px` tall and carries an `aria-hidden` inline-SVG arrow. It has no key binding, because `Escape` already clears the selection. It dispatches `RETURN_TO_TITLE`, with no confirmation. Back is not a move: a Daily keeps its record and resumes from the title, and a Practice run is dropped.
- **The ledger** lists the table's 8 rows. Each row shows its equation and the tiles it pays, and a mark once answered: correct or missed, in text or shape as well as colour. The current row is marked by more than colour. Each row is one accessible string (`ledger.row`).
- **The rack** is five fixed sockets in a single row at every breakpoint (`PUZZLE_CAPACITY`). The grid never resizes; an empty socket is a tile spent.
- **The rail.** The tile past capacity (the newest arrival, `product.md` §1.7) perches on a band one tile high above the rack with a `1px` `--border-accent` top rule, right-aligned and drawn at the rack's tile size (where the rack's tracks shrink below it, a dropping tile narrows by a few pixels as it lands). The rail exists while a tile is past capacity, and until the tile it held has landed in a freed socket (`8a·2`). It never adds a row to the rack.
- **Discard scroll.** When a discard starts, the rack scrolls into view once, with `scrollIntoView({ block: "nearest", behavior: "instant" })`. If the rack is already in view, it does nothing. It is a jump, not a motion moment, so it has nothing for reduced motion to neutralise.
- Answer slots are `64 × 80` at the arena's widest tier.
- Rack sizing has three tiers: below `408px`, tiles are `52 × 64` with an `8px` gap; from `408px`, `66 × 64` with a `12px` gap; from `48rem`, `64 × 80` with a `12px` gap. A tier's rack width — five tiles plus four gaps — must leave room for the arena's horizontal padding at that tier's lower bound. The arena spends `24px` of that width on its own padding below `40rem`, so the narrow tier needs `292px` of `296px` and the middle tier needs `378px` of the `384px` a `408px` viewport leaves.
- **A tier's figures are the tile's maximum size, not a fixed size.** The rack is sized from its container rather than from the viewport, and scales down toward the `44 × 44` target minimum when the container is narrower than the tier's natural width. At every width where the tier already fits, the rendered size is exactly the figure above.
- **The target minimum is a floor, and it outranks the layout.** A tile is a control, so below the content width where five tiles at `44` plus their gaps no longer fit — about `276px` once the arena's padding is counted — the rack stops shrinking and the page scrolls instead. The `320px` rule below is silent under `320px`, while the target minimum has no lower bound, so that is the order they resolve in.
- **This is what the `320px` no-horizontal-scroll rule requires, because a boundary cannot carry it.** A `min-width` query matches the scrollbar-*inclusive* viewport while the content box excludes it, so wherever scrollbars take layout width every tier fires about `15px` early. Scaling within the tier fixes it, and the target minimum bounds how far.
- **Two known misses, owned by the second plan (M16):** the Next Round action sits below `660` after a miss, and the overflow page reaches `859 px`. Until then these two states are the only exceptions to the first rule of this list.

**Phases**

- **Answering.** Selecting a tile moves it into the leftmost empty slot; a filled slot returns its tile. Submit is enabled only when every slot is filled (`product.md` §1.4). The remaining rows stay visible in the ledger.
- **Feedback.** The verdict reads **Correct** or **Incorrect** in text. A correct answer shows the tiles received (`result.rewards`); an incorrect answer shows the submitted and the correct answer (`result.submitted`, `result.answer`). **Next Round** advances; `Enter` does the same.
- **Overflow.** A correct answer at a full hand leaves one tile on the rail, and the prompt reads `overflow.instructionOne`. Any owned tile can be marked, by click or by digit key, and a mark can be taken back until the discard completes. The mark completes the discard, and no confirmation control is rendered. The marked tile leaves the rack, the rail tile takes the freed socket, and the round advances on its own once the discard and the verdict's celebration have both visibly finished.
- **Game over.** The verdict is **Made par** (`gameOver.parTitle`) or `{short} short of par` (`gameOver.shortTitle`), in text. The screen shows the score as `7 / 8`, Par, and Longest streak (within the table), then Share and Copy Result. After an early end the terminal row stays visible with `gameOver.reason`; after row 8 the line is `gameOver.tableReason`.
  - **Daily** also shows `gameOver.dailyNumber`, `gameOver.nextTable`, and a **Practice** button. It has no Play Again, and `R` does nothing.
  - **Practice** shows **Play Again** with its `R` hint, which deals a new table.

**Material and colour**

- Tiles carry the light values of the system, with a hard bottom edge that reads as the tile's thickness, never a blurred all-round shadow.
- One meaning per hue: one accent for focus and the current row, one for correct, one for wrong or a tile leaving.
- Semantic colour appears only at the moment of the event and only on the object concerned. There is no full-screen colour wash.
- Transparency is used only for ink and hairlines. No backdrop blur.
- **State is never shown by colour alone.** Use colour plus text or shape for correctness, selection, the current row, and discard state.

**Typography**

- Interface text is never below `11px`.
- Each locale must render in a face that covers its script. A face that does not cover Hangul may not be the sole `ko` interface face. The Latin interface and the digits use the system stack; the placeholder Hangul face is self-hosted and loaded on Korean.
- Fonts are self-hosted, and the app makes zero non-origin requests.

**Accessibility**

- Interactive targets are at least `44 × 44` CSS pixels.
- Text contrast is at least `4.5:1`.
- All controls use semantic HTML buttons.
- Visible focus styles are required. The focus indicator must reach at least `3:1` contrast against **every** surface it can appear on, including the tile face.
- Status changes use an appropriate `aria-live` region.
- No horizontal scroll at `320px`.

**Motion**

- Motion is budgeted by frequency: what happens every round is fastest and quietest; what happens once a run may be theatrical.
- Permitted motion is the inventory below. Motion outside it is not permitted; extending it amends this section. There is no animation library.
- **Provisional; the identity's keyframe list replaces it.** Each keyframe lives in `src/styles/tokens/keyframes.css`, and its timing in `src/styles/tokens/motion.css`.

| Keyframe | Animates |
|---|---|
| `oz-bloom` | Answer tiles rise and settle on a correct answer (`2a`) |
| `oz-ring` | The streak rings on the answer tiles, one to three by streak (`7a`–`7c`) |
| `oz-fan` | The six-chip burst at streak tier 3 (`2d`) |
| `oz-crack` | The crack across the answer tiles on a wrong answer (`9f`) |
| `oz-dust` | The dust from a wrong answer's crack (`9f`) |
| `oz-fire` | Pay tiles firing in place in the rack (`9i`) |
| `oz-round-rise` | The next equation rising into place (`10b`) |
| `oz-counter-fall` | The streak counter falling when the streak breaks (`10e`) |
| `oz-counter-zero` | The `0` fading in after the streak counter falls (`10e`) |
| `oz-rim-reject` | The tile past capacity rim-rejecting onto the rail (`8a`) |
| `oz-slide-off` | The marked tile sliding off the table on a discard (`8c`) |
| `oz-perch-drop` | The perched tile dropping into the freed socket (`8a·2`) |
| `oz-slot-arrive` | A tile arriving in its answer slot (`9b`) |
| `oz-rise-ready` | A resting offset on a disabled action; defined and unused, because the rise is a transition (`11d`) |

- Respect `prefers-reduced-motion` by removing nonessential motion wholesale, including press offsets.
- No audio.

### 1.13 Language behavior

- Supported languages: `en` and `ko`.
- On first visit, choose Korean if `navigator.language` or the first matching `navigator.languages` entry begins with `ko`; otherwise choose English.
- Persist the manual selection under `localStorage["ndle.language"]`.
- A valid saved preference overrides browser detection.
- An invalid saved value is ignored.
- Language changes take effect immediately in every phase.
- Language changes do not reset the run.
- Only the language preference and today's daily persist across a refresh. A refresh returns to `title`; opening Daily that day resumes or shows its result.

### 1.14 Required copy

The implementation may improve punctuation but may not change rule meaning.
Every string lives in `src/i18n/messages.ts`, in both languages. The copy is
placeholder until the identity.

| Key | English | Korean |
|---|---|---|
| `title.name` | `9dle` | `구들` |
| `title.more` | `More` | `더 보기` |
| `title.daily` | `Daily #{number}` | `오늘의 판 #{number}` |
| `title.dailyPlayed` | `Today's result #{number}` | `오늘의 결과 #{number}` |
| `title.dailyNone` | `No table today` | `오늘은 판이 없습니다` |
| `title.practice` | `Practice` | `연습` |
| `action.back` | `Back` | `뒤로` |
| `action.submit` | `Submit` | `제출` |
| `action.clear` | `Clear` | `지우기` |
| `action.next` | `Next Round` | `다음 라운드` |
| `action.playAgain` | `Play Again` | `다시 하기` |
| `action.share` | `Share` | `공유` |
| `action.copy` | `Copy Result` | `결과 복사` |
| `language.groupLabel` | `Language` | `언어` |
| `hud.score` | `Score` | `점수` |
| `hud.streak` | `Streak` | `연속 정답` |
| `hud.round` | `Round` | `라운드` |
| `hud.par` | `Par` | `목표` |
| `ledger.label` | `Table` | `판` |
| `ledger.row` | `Row {row}, {left} × {right}, pays {pay}` | `{row}번째 줄, {left} × {right}, 보상 {pay}` |
| `ledger.answered` | `answered` | `정답` |
| `ledger.missed` | `missed` | `오답` |
| `result.correct` | `Correct` | `정답` |
| `result.incorrect` | `Incorrect` | `오답` |
| `result.submitted` | `Your answer: {value}` | `제출한 답: {value}` |
| `result.answer` | `Correct answer: {value}` | `정답: {value}` |
| `result.rewards` | `Received {count} tiles` | `타일 {count}개 획득` |
| `overflow.instructionOne` | `Choose a tile to discard.` | `버릴 타일 1개를 선택하세요.` |
| `gameOver.reason` | `Not enough tiles left to answer.` | `답을 만들 타일이 부족합니다.` |
| `gameOver.longestStreak` | `Longest streak` | `최장 연속 정답` |
| `gameOver.restartHint` | `Press R to play again` | `R 키를 눌러 다시 하기` |
| `gameOver.parTitle` | `Made par` | `목표 달성` |
| `gameOver.shortTitle` | `{short} short of par` | `목표까지 {short}점 부족` |
| `gameOver.tableReason` | `All eight rows played.` | `여덟 줄을 모두 풀었습니다.` |
| `gameOver.dailyNumber` | `Table #{number}` | `{number}번째 판` |
| `gameOver.nextTable` | `The next table opens at midnight.` | `다음 판은 자정에 열립니다.` |
| `share.copied` | `Result copied.` | `결과를 복사했습니다.` |
| `share.failed` | `Could not share or copy the result.` | `결과를 공유하거나 복사하지 못했습니다.` |
| `share.puzzleAsk` | `Can you make par?` | `목표를 달성할 수 있나요?` |
| `answerSlot.filled` | `Answer slot {position}: {digit}` | `정답 칸 {position}: {digit}` |
| `answerSlot.empty` | `Answer slot {position}: empty` | `정답 칸 {position}: 비어 있음` |
| `tile.digitLabel` | `Digit {digit}` | `숫자 {digit}` |
| `tile.newLabel` | `New tile` | `새 타일` |
| `tile.discardLabel` | `Marked for discard` | `버릴 타일로 표시됨` |

The title's rule copy (`title.summary` and the `howToPlay.*` keys) states
Puzzle's rules in both languages, and covers:

- selecting and returning tiles;
- ordered answer slots;
- the printed pay, and correct and incorrect outcomes;
- the five-tile capacity and overflow discarding;
- par, score, streak, round, and the end of a table;
- keyboard controls.

`title.more` labels the disclosure holding the rules beyond the always-visible
ones.

`ledger.row` joins its pay with `Intl.ListFormat` in the current language, so
no "and" is written in the dictionary.

### 1.15 Sharing contract

- Sharing exists only on `gameOver`.
- Text uses the current interface language at the moment the action is invoked.
- The text gives the score against par and the game's link, and a Daily's table number. It never gives the table's rows.
- Do not encode result state in the URL.
- Do not claim a shared result is verified.
- **Share** calls `navigator.share({ text, url })` when available.
- If native sharing is unavailable, **Share** performs the copy behavior.
- If native sharing is rejected or fails, keep the player on game over and show an inline failure status. Do not automatically copy after a rejected native share because cancellation may be intentional.
- **Copy Result** always calls the clipboard writer.
- Clipboard failure shows an inline failure status; do not open a modal.

`url` stands for the game's link, and `\n` for a line break.

| Case | Text |
|---|---|
| Daily en, made | `9dle #12 — Made par — 7/8 · par 7\n{url}` |
| Daily en, short | `9dle #12 — 1 short of par — 6/8 · par 7\n{url}` |
| Daily ko, made | `구들 #12 — 목표 달성 — 7/8 · 목표 7\n{url}` |
| Daily ko, short | `구들 #12 — 목표까지 1점 부족 — 6/8 · 목표 7\n{url}` |
| Practice en | `9dle Practice — Made par — Score: 7/8 · par 7\nLongest streak: 7\n\nCan you make par?\n{url}` |
| Practice ko | `구들 연습 — 목표 달성 — 점수: 7/8 · 목표 7\n최장 연속 정답: 7\n\n목표를 달성할 수 있나요?\n{url}` |

The name comes from `title.name`, and "Practice" / "연습" from `title.practice`.
The other words are the existing keys: the outcome words are `gameOver.parTitle`
and `gameOver.shortTitle`, and a Practice run that falls short uses
`gameOver.shortTitle` in the same place.

### 1.16 Persistence and reload

- Persist language on every valid language change.
- Read language once during i18n initialization.
- Storage holds the language and today's daily, and nothing else.
- The daily is one record under `localStorage["ndle.daily"]`, which each save overwrites:

  ```ts
  export interface DailyOutcome { score: number; par: number; longestStreak: number }
  export interface DailyRecord { version: 1; number: number; moves: PuzzleMove[]; outcome: DailyOutcome | null }
  ```

  Its table number, moves so far and outcome are the whole of it (`docs/spec/architecture.md` §2.4 gives the `DailyStore` that reads and writes it). A record that fails validation is ignored, and storage errors are swallowed.
- A Practice run writes no record.
- A reload constructs a fresh `title` state; the daily is restored only through Daily.
- No unload warning or recovery prompt.
