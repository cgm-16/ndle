# Domain Docs

How the `mattpocock-skills` engineering skills should consume this repo's
domain documentation when exploring the codebase.

**Layout: single-context.** One `CONTEXT.md` and one `docs/adr/` at the repo
root. This is a single-package Vite app — no workspaces, no `packages/` — so
there is nothing to split into contexts.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/adr/`**: read ADRs that touch the area you are about to work in

Neither exists today. If they are absent, **proceed silently** — do not flag it,
and do not suggest creating them upfront. `/domain-modeling` creates them lazily
when terms or decisions actually get resolved.

## What already holds this repo's decisions

Decisions here are recorded outside the ADR convention:

| Kind | Where |
|---|---|
| Product and technical rules | `docs/spec/**` — **canonical**, per `AGENTS.md` §Document precedence |
| Decisions with their outcomes, and failed approaches | `docs/journal/journal-*.md` |
| Requirement → owning task → evidence | `docs/plan/traceability.md` |

An ADR that contradicts `docs/spec/**` loses. Report the conflict rather than
patching around it.

## Use the glossary's vocabulary

When your output names a domain concept — an issue title, a refactor proposal,
a hypothesis, a test name — use the term as the project defines it. Absent a
`CONTEXT.md`, `docs/spec/**` carries the vocabulary: *tile*, *socket*, *rack*,
*inventory*, *answer slot*, *streak*, *overflow*, *discard*. Do not drift to
synonyms.

If the concept you need is not there, that is a signal: either you are
inventing language the project does not use (reconsider), or there is a real
gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
