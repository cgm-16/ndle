# 9dle UI, Language, and Sharing Contract

Visual, language, copy, sharing, and persistence contracts (§1.12–§1.16).
The game rules live in `docs/spec/product.md`.

### 1.12 Responsive and visual contract

Token values live in `src/styles/tokens/`. The palette and type are the
Chalkboard identity's (direction B); this section states the contract they
satisfy.

**Layout and information architecture**

- **Every screen fits `393 × 660` with no page scroll, and `375` wide.** 393 × 660
  is a common phone's viewport less its browser chrome. The geometry specs in
  `e2e/` assert it, and `fit.spec.ts` sweeps every gallery state with the top
  bar counted, in Chromium and in Playwright's WebKit.
- Use one centered vertical arena on desktop and mobile.
- Preserve order across breakpoints: Back (in the app's top bar) → HUD → ledger → answer row → phase action (in overflow, the message and the rail beside it) → rack.
- Mobile changes spacing, wrapping, and control size, not information architecture.
- **Back** (`action.back`, `Back` / `뒤로`) sits at the left edge of the app's top bar, with the wordmark and the label (`#12` or `Practice`) in the centre and the language toggle at the right, ahead of the toggle in tab order and outside the screen's `<main>`, on the game screen and the game-over screen, for Daily and Practice alike, so it is the first focusable element on the page. It is at least `44 px` tall and carries an `aria-hidden` inline-SVG arrow. It has no key binding, because `Escape` already clears the selection. It dispatches `RETURN_TO_TITLE`, with no confirmation. Back is not a move: a Daily keeps its record and resumes from the title, and a Practice run is dropped.
- **The ledger** lists the table's 8 rows across the arena's full content width. The current row is `52 px` tall, with a raised fill, a `2 px` blue border, the `ledger.now` label, the equation without its `=`, and `ledger.pays` before the pay tiles. Every other row is `30 px`: an answered or missed row shows the `Mark` and `ledger.answered` or `ledger.missed` (missed in pink) under a hairline, and a future row shows its pays as outlined boxes. Each row is one accessible string (`ledger.row`); what it draws is `aria-hidden`.
- **The answer row and the band.** The prompt (`3 × 5 =`) and the answer slots sit in a `60 px` row below the ledger, inside a band that is at least `150 px` tall in every phase, so the rack does not move. Answering fills `120 px` of it: the answer row, a `12 px` gap and the actions, Clear (`flex: 1`) before Submit (`flex: 2`), `48 px` tall.
- **The rack** is five fixed sockets in a single row at every breakpoint (`PUZZLE_CAPACITY`), under a `rack.hand` label (`14 px`, dust, `22 px` tall, `6 px` above the sockets) that counts the tiles in the sockets, a lifted tile's held socket included, and not the rail. The grid never resizes. An empty socket is a tile spent: a `1.5 px` dashed outline in the socket colour. A socket whose tile is lifted is on loan (`data-state="held"`): it keeps the dashed outline and shows the lifted digit at `16 px` in dust, which is what tells it from an empty one, and the rack does not re-sort until the round resolves. A tile that arrived this row wears an `18 px` blue "+" badge at its top right (`-8 px`), and is named with `tile.newLabel`.
- **The rail.** The tile past capacity (the newest arrival, `product.md` §1.7) perches in the overflow band's right cell, `88 px` wide, under a `rail.arriving` label (`12 px`, dust), drawn `66 × 56` with no top rule. The cell is the screen's: mounted in every phase and placed by the band (`8 px` below the answer row, at its right edge), so it does not move when a discard ends overflow and the tile still leaving is drawn where it was. The rack renders the rail into it. The rail exists while a tile is past capacity. It never adds a row to the rack.
- **Discard scroll.** When a discard starts, the rack scrolls into view once, with `scrollIntoView({ block: "nearest", behavior: "instant" })`. If the rack is already in view, it does nothing. It is a jump, not a motion moment, so it has nothing for reduced motion to neutralise.
- Answer slots are `52 × 56` at every width.
- **Rack sizing is one size.** Five equal columns of the arena's content, `8 px` apart, `56 px` tall, never narrower than `44 px`. The arena is at most `393 px` wide with a `16 px` gutter on each side, so its content is at most `361 px` and the columns at most `65.8 px`; a wider viewport shows the phone layout, centred.
- **The target minimum is a floor, and it outranks the layout.** A tile is a control, so below the viewport width where five tiles at `44` plus their gaps and the gutters no longer fit — `284 px` — the rack stops shrinking and the page scrolls instead. The `320px` rule below is silent under `320px`, while the target minimum has no lower bound, so that is the order they resolve in.
- **The columns are sized from the arena, not from a media query.** A `min-width` query matches the scrollbar-*inclusive* viewport while the content box excludes it, so wherever scrollbars take layout width a boundary fires about `15px` early; the `320px` no-horizontal-scroll rule is carried by the columns shrinking with their container, bounded by the target minimum.

**Phases**

- **Answering.** Selecting a tile moves it into the leftmost empty slot; a filled slot returns its tile. Submit is enabled only when every slot is filled (`product.md` §1.4). The remaining rows stay visible in the ledger.
- **Feedback.** The verdict takes the actions' place in the band, below the answer row, which stays mounted with the submitted tiles in its slots. One `26 px` line in the existing `role="status"` region (below `375 px` wide the detail may wrap to a second line inside the band, and the `Mark` never shrinks): a `Mark` and the word at `22 px` bold (`result.correct` in chalk, `result.incorrect` in pink), then ` · ` and a detail at `16 px` in dust. A correct answer's detail lists the digits received (`result.rewards`), in the order the row prints them; a miss's is the row's equation and product, `3 × 5 = 15`. A miss also announces, in visually hidden text after a `. `, the answer played (`result.played`) as a second sentence, so the region carries both the submitted and the correct answer. **Next Round** (`48 px`, `17 px`) follows, and `Enter` does the same; after a discard the round advances on its own, and the line keeps clear of the rail cell.
- **Overflow.** A correct answer at a full hand leaves one tile on the rail. The answer row stays above the band's content, with the played tiles in its slots, read-only and still: the verdict's celebration on them waits for the discard. Below it the left cell holds one `role="status"` message: the `Mark` (correct), `result.correct`, ` · ` and `result.handFull` at `20 px` bold, then `overflow.instructionOne` at `16 px` in dust. The rail is the right cell. Both status regions, this message's and the feedback panel's, stay mounted in every phase and are empty outside their own phase, so a verdict or message arrives in a region that already exists. Every tile is a discard choice, with a `2 px` dashed pink border and no bottom edge, named `tile.discard` (and `tile.newLabel` for the arrival). Any owned tile can be marked, by click or by digit key. The mark completes the discard, and no confirmation control is rendered. The marked tile leaves the rack, the rail tile takes the freed socket, and the round advances on its own once the discard and the verdict's celebration have both visibly finished.
- **Game over.** One `h1` holds the verdict, **Made par** (`gameOver.parTitle`) or `{short} short of par` (`gameOver.shortTitle`), in text; a Daily's `gameOver.dailyNumber` is the first line inside it, so heading navigation reads "Table #12, Made par". Top to bottom:
  1. the heading, then the reason: `gameOver.tableReason` after row 8, else `gameOver.reason`. The equation the run stopped on is not drawn; after an early end, `gameOver.reason` says why and the row marks show where the run stopped;
  2. the score as `7 / 8`, then Par and Longest streak (within the table) as two cards;
  3. the row marks, an `ol` named `gameOver.rowsLabel` with one item per row: answered (chalk, the correct mark), missed (pink outline, ✗) or unplayed (dashed outline, no mark). Each item holds `gameOver.rowMark` as visually hidden text, with `ledger.answered`, `ledger.missed` or `gameOver.unplayed`. The correct mark is ✓ in English and ○ in Korean, from the `Mark` component;
  4. a Daily's `gameOver.nextTable`;
  5. the share preview: `gameOver.shareText`, then exactly the text Share sends, which never names a row;
  6. Share and Copy Result side by side, then a Daily's **Practice** or a Practice run's **Play Again** with its `R` hint, then the status line.
  - **Daily** has a **Practice** button, no Play Again, and `R` does nothing.
  - **Practice** shows **Play Again** with its `R` hint, which deals a new table.

**Material and colour**

- A tile is a flat chalk face with a `0 3px 0` dust bottom edge that reads as its thickness, never a blurred shadow.
- One meaning per hue: blue marks focus, the current row and actions; pink marks wrong, or a tile leaving; correct has no hue, and its mark and its word carry it.
- Semantic colour appears only at the moment of the event and only on the object concerned. There is no full-screen colour wash.
- Transparency is used only for ink and hairlines. No backdrop blur.
- **State is never shown by colour alone.** Use colour plus text or shape for correctness, selection, the current row, and discard state.

**Typography**

- Interface text is never below `12px`, with no uppercase transform and no letter tracking.
- Each locale must render in a face that covers its script. A face that does not cover Hangul may not be the sole `ko` interface face. Atkinson Hyperlegible (400 and 700) sets the Latin interface and every digit, and Gaegu 700 sets both wordmarks and the title's step numerals; both are self-hosted and loaded eagerly. Gothic A1 (400 and 700) sets Hangul, is self-hosted, and loads on Korean.
- Fonts are self-hosted, and the app makes zero non-origin requests.

**Accessibility**

- Interactive targets are at least `44 × 44` CSS pixels.
- Text contrast is at least `4.5:1`.
- All controls use semantic HTML buttons.
- Visible focus styles are required: a `3px` solid outline at a `3px` offset, drawn outside the control. The focus indicator must reach at least `3:1` contrast against **every** surface it can appear on, including the tile face.
- Status changes use an appropriate `aria-live` region.
- No horizontal scroll at `320px`.

**Motion**

- Motion is budgeted by frequency: what happens every round is fastest and quietest; what happens once a run may be theatrical.
- Permitted motion is the inventory below. Motion outside it is not permitted; extending it amends this section. There is no animation library.
- Motion is chalk: short, with no overshoot. Each keyframe lives in `src/styles/tokens/keyframes.css`, and its timing in `src/styles/tokens/motion.css`.

| Keyframe | Animates | Duration | Easing |
|---|---|---|---|
| `nd-bloom` | Answer tiles lift 4px and settle on a correct answer (`2a`) | 200 ms | ease-out |
| `nd-ring` | One to three chalk rings round the answer tiles by streak tier, drawn like a hand-drawn circle and 60 ms apart (`7a`–`7c`) | 240 ms each | ease-out |
| `nd-fan` | At the top tier, six chalk flecks fan out 12px and fade (`2d`) | 320 ms | ease-out |
| `nd-crack` | A pink chalk stroke drawn across the answer tiles on a wrong answer (`9f`) | 200 ms | ease-in |
| `nd-dust` | Dust-coloured specks fall 8px from the stroke and fade (`9f`) | 280 ms | ease-out |
| `nd-fire` | A paid tile's `+` badge fades in from 6px above; the tile does not move (`9i`) | 180 ms | ease-out |
| `nd-round-rise` | The next prompt rises 6px into place as it fades in (`10b`) | 180 ms | ease-out |
| `nd-counter-fall` | The streak counter drops 8px and fades when the streak breaks (`10e`) | 200 ms | ease-in |
| `nd-counter-zero` | The `0` fades in after the counter falls (`10e`) | 160 ms | ease-out |
| `nd-rim-reject` | The tile past capacity fades in on the rail from 6px above, with no tilt (`8a`) | 180 ms | ease-out |
| `nd-slide-off` | The discarded tile slides 24px down and fades (`8c`) | 200 ms | ease-in |
| `nd-perch-drop` | The perched tile drops into the freed socket from its measured offset (`8a·2`) | 200 ms | ease-out |
| `nd-slot-arrive` | A tile settles into its answer slot from 4px above (`9b`) | 120 ms | ease-out |

- A button's press moves it `1px` down as a `transform` over 80 ms ease-out, and its background changes over 120 ms ease-out.
- Respect `prefers-reduced-motion` by removing nonessential motion wholesale, including press offsets. Every animation still runs, clamped to 0.01 ms, because the round waits on `animationend` after a discard; no rule sets `animation: none`.
- No audio.

### 1.13 Language behavior

- Supported languages: `en` and `ko`.
- On first visit, choose Korean if `navigator.language` or the first matching `navigator.languages` entry begins with `ko`; otherwise choose English.
- Persist the manual selection under `localStorage["ndle.language"]`.
- A valid saved preference overrides browser detection.
- An invalid saved value is ignored.
- Language changes take effect immediately in every phase.
- Language changes do not reset the run.
- The language toggle shows `EN` and `한`, in both interface languages, and each half is at least `44 × 44 px`. Its accessible names stay `English` and `한국어`, so each visible label is part of its name.
- Only the language preference and today's daily persist across a refresh. A refresh returns to `title`; opening Daily that day resumes or shows its result.

### 1.14 Required copy

The implementation may improve punctuation but may not change rule meaning.
Every string lives in `src/i18n/messages.ts`, in both languages. This is the copy as the identity ships it.

| Key | English | Korean |
|---|---|---|
| `title.name` | `9dle` | `구들` |
| `title.more` | `More` | `더 보기` |
| `title.daily` | `Daily #{number}` | `오늘의 판 #{number}` |
| `title.dailyPlayed` | `Today's result #{number}` | `오늘의 결과 #{number}` |
| `title.dailyNone` | `No table today` | `오늘은 판이 없습니다` |
| `title.practice` | `Practice` | `연습` |
| `title.tagline` | `A daily multiplication puzzle` | `매일 한 판, 곱셈 퍼즐` |
| `title.how1` | `Spell each row's answer with tiles from your hand.` | `손에 든 숫자 타일로 각 줄의 답을 만드세요.` |
| `title.how2` | `A right answer pays the tiles printed on its row. Your hand holds five.` | `맞히면 그 줄에 적힌 타일을 받습니다. 손에는 다섯 개까지 들 수 있습니다.` |
| `title.how3` | `Par is the best score this table allows. Sometimes the way there is a miss.` | `목표는 이 판에서 낼 수 있는 최고 점수입니다. 때로는 일부러 틀려야 닿습니다.` |
| `title.note` | `One Daily a day. Practice deals a new table every time.` | `오늘의 판은 하루 한 번. 연습은 매번 새 판을 냅니다.` |
| `bar.daily` | `#{number}` | `#{number}` |
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
| `hud.round` | `Row` | `줄` |
| `hud.par` | `Par` | `목표` |
| `ledger.label` | `Table` | `판` |
| `ledger.row` | `Row {row}, {left} × {right}, pays {pay}` | `{row}번째 줄, {left} × {right}, 보상 {pay}` |
| `ledger.answered` | `answered` | `정답` |
| `ledger.missed` | `missed` | `오답` |
| `ledger.now` | `Now` | `지금` |
| `ledger.pays` | `pays` | `보상` |
| `result.correct` | `Correct` | `정답` |
| `result.incorrect` | `Missed` | `오답` |
| `result.rewards` | `Received {digits}` | `받은 타일 {digits}` |
| `result.played` | `You played {value}` | `제출한 답 {value}` |
| `result.handFull` | `hand full` | `손이 가득 참` |
| `overflow.instructionOne` | `Six tiles, five sockets. Choose a tile to discard.` | `타일 여섯 개, 칸 다섯 개. 버릴 타일 1개를 선택하세요.` |
| `rack.hand` | `Hand · {count} of 5` | `손 · 5칸 중 {count}개` |
| `rail.arriving` | `Arriving` | `들어오는 타일` |
| `gameOver.reason` | `Not enough tiles left to answer.` | `답을 만들 타일이 부족합니다.` |
| `gameOver.longestStreak` | `Longest streak` | `최장 연속 정답` |
| `gameOver.restartHint` | `Press R to play again` | `R 키를 눌러 다시 하기` |
| `gameOver.parTitle` | `Made par` | `목표 달성` |
| `gameOver.shortTitle` | `{short} short of par` | `목표까지 {short}점 부족` |
| `gameOver.tableReason` | `All eight rows played.` | `여덟 줄을 모두 풀었습니다.` |
| `gameOver.dailyNumber` | `Table #{number}` | `{number}번째 판` |
| `gameOver.rowsLabel` | `Rows` | `줄별 결과` |
| `gameOver.rowMark` | `Row {row}: {result}` | `{row}번째 줄: {result}` |
| `gameOver.unplayed` | `not played` | `풀지 않음` |
| `gameOver.shareText` | `Share text` | `공유 문구` |
| `gameOver.nextTable` | `The next table opens at midnight.` | `다음 판은 자정에 열립니다.` |
| `share.copied` | `Result copied.` | `결과를 복사했습니다.` |
| `share.failed` | `Could not share or copy the result.` | `결과를 공유하거나 복사하지 못했습니다.` |
| `share.puzzleAsk` | `Can you make par?` | `목표를 달성할 수 있나요?` |
| `share.par` | `par` | `목표` |
| `answerSlot.filled` | `Answer slot {position}: {digit}` | `정답 칸 {position}: {digit}` |
| `answerSlot.empty` | `Answer slot {position}: empty` | `정답 칸 {position}: 비어 있음` |
| `tile.digitLabel` | `Digit {digit}` | `숫자 {digit}` |
| `tile.discard` | `Discard {digit}` | `{digit} 버리기` |
| `tile.newLabel` | `new tile` | `새 타일` |
| `tile.discardLabel` | `Marked for discard` | `버릴 타일로 표시됨` |

The title's rule copy (`title.how1`–`3`, and under `title.more` the
`howToPlay.*` topics `selecting`, `slots`, `incorrect`, `overflow`, `progress`
and `keyboard`) states Puzzle's rules in both languages, and covers:

- selecting and returning tiles;
- ordered answer slots;
- the printed pay, and correct and incorrect outcomes;
- the five-tile capacity and overflow discarding;
- par, score, streak, round, and the end of a table;
- keyboard controls.

`title.more` labels the disclosure holding the rules the three steps do not
state.

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
`gameOver.shortTitle` in the same place. "par" / "목표" before the par figure
is `share.par`.

### 1.16 Persistence and reload

- Persist language on every valid language change.
- Read language once during i18n initialization.
- Storage holds the language and today's daily, and nothing else. A record from an earlier day is inert: it is never shown, and the next Daily overwrites it.
- The daily is one record under `localStorage["ndle.daily"]`, which each save overwrites:

  ```ts
  export interface DailyOutcome { score: number; par: number; longestStreak: number }
  export interface DailyRecord { version: 1; number: number; moves: PuzzleMove[]; outcome: DailyOutcome | null }
  ```

  Its table number, moves so far and outcome are the whole of it (`docs/spec/architecture.md` §2.4 gives the `DailyStore` that reads and writes it). A record that fails validation is ignored, and storage errors are swallowed.
- A Practice run writes no record.
- A reload constructs a fresh `title` state; the daily is restored only through Daily.
- No unload warning or recovery prompt.
