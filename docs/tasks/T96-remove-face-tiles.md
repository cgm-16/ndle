---
reads:
  - src/game/types.ts
  - src/game/selectors.ts
  - src/game/generators.ts
  - src/game/factories.ts
  - src/components/Tile/tileFace.ts
  - src/hooks/useGameKeyboard.ts
  - src/test/fixtures.ts
---

# T96 — Remove face tiles

```yaml
task_id: T96
title: Remove face tiles
milestone: M12 — Puzzle Only
priority: P0
estimate: M
wave: W1
depends_on: [T95]
parallel_safe: false
paths:
  - src/game/types.ts
  - src/game/selectors.ts
  - src/game/generators.ts
  - src/game/factories.ts
  - src/game/gameReducer.ts
  - src/components/Tile/
  - src/components/AnswerSlots/
  - src/components/FeedbackPanel/
  - src/hooks/useGameKeyboard.ts
  - src/i18n/messages.ts
  - src/gallery/
  - src/test/fixtures.ts
  - e2e/viewport.spec.ts
```

## Why

Face tiles are Classic rewards, so Puzzle never sees one. They are removed
first because the search over face assignments sits under every selector
that Classic and Endless share.

## Interfaces

**Produces:**

```ts
// src/game/types.ts
export type Tile = { id: string; digit: Digit; isNew: boolean };
// RoundResult.submittedValue becomes `number` (a face can no longer make it null).
```

Deleted:
- `FaceKind`, `FaceSet`, `TileValue`;
- `FACE_SETS` and `tileDigits`;
- `drawFace` and the face table in `generators.ts`;
- `getClassicFaceRate`;
- `FACE_RATE_START` and `FACE_RATE_END`;
- `makeFaceTile` and `makeNbrTile`;
- every `tile.face.*` message key.

## Steps

- [ ] **Tests first.** Rewrite `answerMatches` and `constructAnswer`'s tests
      in `selectors.test.ts` to digit tiles only. Delete the face cases in:
  - `selectors.test.ts`, `generators.test.ts` and `factories.test.ts`;
  - `gameReducer.test.ts`, the describe blocks whose titles name a face;
  - `Tile.test.tsx`, `AnswerSlots.test.tsx` and `FeedbackPanel.test.tsx`;
  - `gallery/states.test.tsx`.

  Run `npx vitest run src/game` and record the expected failure: the types
  still allow faces, so `tsc` flags nothing yet, but the deleted describes
  are gone.
- [ ] **Code:**
  - In the types, use `Tile` as above.
  - In `constructAnswer` and `answerMatches`, compare `tile.digit`.
  - In the rack key in `factories.ts`, sort by digit, then by id.
  - In `tileFace.ts`, `Tile`, `AnswerSlots` and `FeedbackPanel`, use the
    digit only.
  - In `useGameKeyboard`, remove `narrowestFaceHolding` and the
    `"digit" in` guards.
  - In `generateRewardTiles`, draw digits only, so Classic still runs until
    T97.
- [ ] **Gallery:** delete the face states (`answering-classic-faces`,
      `feedback-*-face` and `interaction-face-tiles`) and `FaceBoard` in
      `harness.tsx`. In `e2e/viewport.spec.ts`, set `STATE_COUNT` to the new
      count, the number of entries `states.tsx` exports.
- [ ] **Check:**
      `grep -rnE "face|Face" src --include='*.ts' --include='*.tsx' | grep -v "interface\|surface\|typeface"`
      prints nothing about tiles.
- [ ] **Gates:** all five green.
- [ ] **Commit:** `refactor(tiles): remove face tiles`, with `Task: T96`.

## Acceptance gate

- `Tile` has no `face` member.
- `npm run test:e2e` is green with the new `STATE_COUNT`.
