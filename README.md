# 9dle

**9dle** (Korean **구들**; the slug is `ndle`) is a daily multiplication puzzle
that runs entirely in the browser, with a Practice mode. It has no backend,
accounts or analytics.

A table is five distinct digit tiles and eight multiplication rows, dealt face
up. Each row pays new digits for a correct answer: two for a one-digit product
and three for a two-digit one. Answering spends the tiles that spell the
answer, the hand holds five, and a wrong answer is legal: it spends the tiles
and pays nothing, and a deliberate wrong answer is a sacrifice. The run ends after row
eight, or earlier when the hand holds fewer tiles than the next answer needs.
Par is the solver's best score for the table, shown before the first move, and
a score equal to par is Made par.

## Daily

One table a day, the same for everyone. "Today" is the player's local date, and
tables are numbered from the launch day, which is #1. The tables are chosen
ahead of time by a solver, so that every day's table needs a sacrifice, and
they ship with the game as a numbered list. There is one attempt a day. Each
move is saved as it is made, so reopening the game that day resumes the table,
or shows the result once it has ended. The share text gives the table number,
the score against par and the game's link, and never the rows.

## Practice

A fresh random table each time, dealt live. Play Again deals a new table. A
Practice table cannot be replayed or shared by number, and Practice stays open
after the Daily is played.

## Local commands

```bash
npm ci               # install exact dependency versions
npm run dev          # start the Vite dev server
npm run lint         # eslint and stylelint, zero warnings allowed
npm run typecheck    # tsc -b, no emit
npm test             # vitest run (single pass)
npm run test:watch   # vitest in watch mode
npm run test:e2e     # playwright, layout geometry only
npm run build        # tsc -b && vite build -> dist/
node scripts/run.mjs scripts/daily/generate.ts   # from T102: generate daily tables
```

## Deployment

The app is a static Vite build with no serverless function or backend. Work
merges to `main`, which Vercel builds as a preview. A release is a merge commit
from `main` to `prod`, which Vercel builds as production.

## Credits

Made by [`cgm-16`](https://github.com/cgm-16).
