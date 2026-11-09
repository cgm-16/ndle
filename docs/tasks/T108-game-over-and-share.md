---
reads:
  - src/components/GameOverScreen/GameOverScreen.tsx
  - src/services/sharing.ts
  - src/i18n/messages.ts
  - src/gallery/states.tsx
  - docs/superpowers/specs/2026-11-09-puzzle-spin-off-design.md  # §2.2, §2.4
---

# T108 — Game over and share for both modes

```yaml
task_id: T108
title: Game over and share for both modes
milestone: M15 — Daily and Practice
priority: P0
estimate: M
wave: W4
depends_on: [T107]
parallel_safe: false
paths:
  - src/components/GameOverScreen/
  - src/services/sharing.ts
  - src/services/sharing.test.ts
  - src/app/App.tsx
  - src/i18n/messages.ts
  - src/gallery/
  - e2e/viewport.spec.ts
```

## Why

- **A Daily game over** shows the table number, the result against par, when
  the next table arrives, Share, and a way into Practice.
- **A Practice game over** has none of the Daily-only parts, and adds Play
  Again.
- **The daily share text** never reveals the rows.

## Interfaces

**Produces:**

```ts
// src/components/GameOverScreen/GameOverScreen.tsx — new prop
variant: { kind: "daily"; number: number } | { kind: "practice" };
onPractice(): void;   // daily only

// src/services/sharing.ts
export type ShareStats = { score: number; rows: number; par: number; longestStreak: number; won: boolean }
  & ({ kind: "daily"; number: number } | { kind: "practice" });
```

- **Both variants show:**
  - Made par or `{n} short of par` (the existing keys);
  - the score as `7 / 8`;
  - Par;
  - Longest streak, which counts within the table;
  - Share and Copy.
- **Daily only:**
  - `gameOver.dailyNumber`, `Table #{number}` / `{number}번째 판`;
  - `gameOver.nextTable`, `The next table opens at midnight.` /
    `다음 판은 자정에 열립니다.`;
  - a Practice button, `title.practice`.
- **Practice only:** Play Again, with its `R` hint.

**Exact share texts.** `url` stands for the game's link.

| Case | Text |
|---|---|
| Daily en, made | `9dle #12 — Made par — 7/8 · par 7\n{url}` |
| Daily en, short | `9dle #12 — 1 short of par — 6/8 · par 7\n{url}` |
| Daily ko, made | `구들 #12 — 목표 달성 — 7/8 · 목표 7\n{url}` |
| Daily ko, short | `구들 #12 — 목표까지 1점 부족 — 6/8 · 목표 7\n{url}` |
| Practice en | `9dle Practice — Made par — Score: 7/8 · par 7\nLongest streak: 7\n\nCan you make par?\n{url}` |
| Practice ko | `구들 연습 — 목표 달성 — 점수: 7/8 · 목표 7\n최장 연속 정답: 7\n\n목표를 달성할 수 있나요?\n{url}` |

The name comes from `title.name`, and "Practice" / "연습" from
`title.practice`. The other words are the existing keys.

## Steps

- [ ] **Tests** in `sharing.test.ts`:
  - one `it` per row of the table, each asserting the string exactly;
  - `it("never puts a row in the daily text")`: for the first 10
    `DAILY_TABLES` played to game over through `replayMoves` and each one's
    `parLine`, the daily text contains no `×` and no `=`.
- [ ] **Tests** in `GameOverScreen.test.tsx`:
  - in en and ko, the Daily variant shows the number, the next-table line
    and Practice, and no Play Again;
  - the Practice variant shows Play Again and the `R` hint, and no number or
    next-table line.
- [ ] **Gallery:** add `game-over-daily-par` (the sample's par line),
      `game-over-daily-short` and `game-over-practice`. Raise `STATE_COUNT`
      by 3.
  - `game-over-daily-short` is built by replaying a real line that scores 6
    on the sample. Find it with `solvePuzzle`-style search in the test that
    builds it, and assert its score is 6.
- [ ] **Implement:** App passes `variant` from `play`, and `onPractice` starts
      Practice.
- [ ] **Gates,** including `npm run test:e2e`.
- [ ] **Commit:** `feat(game-over): Daily and Practice results and share texts`,
      with `Task: T108`.
- [ ] **Open the PR** `[M15] Play the Daily and Practice`, with a `Closes #`
      line for each of T106–T108.

## Acceptance gate

- The six share strings match exactly.
- Both variants are tested in both languages.
- The gallery holds both variants.
