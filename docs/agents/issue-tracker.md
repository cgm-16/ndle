# Issue tracker: GitHub

Issues for this repo live as GitHub issues in `cgm-16/ndle`. Use the `gh`
CLI for all operations; it infers the repo from `git remote -v` when run inside
a clone.

**This file is an adapter, not a second rulebook.** `docs/plan/github.md` is
canonical for this repo's label vocabulary (§4.2), issue body schema (§4.3),
and what does and does not get a GitHub object (§4.5). Its own rule is *"One
copy, linked"* — so everything it already covers is linked here, not restated.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, following `docs/plan/github.md` §4.3's body schema. Link
the task file rather than copying it.

## When a skill says "fetch the relevant ticket"

`gh issue view <number> --comments`

## Pull requests as a request surface

**PRs as a request surface: no.**

Every PR here is opened by the maintainer against a milestone, so there are no
external contributions to triage. Set this to `yes` if that changes; `/triage`
reads this flag and would then run PRs through the same states as issues.

GitHub shares one number space across issues and PRs, so a bare `#42` may be
either. Resolve with `gh pr view 42`, falling back to `gh issue view 42`.

## Wayfinding operations

Used by `/wayfinder`, which has no precedent in this repo yet. The **map** is a
single issue labelled `wayfinder:map`; **tickets** are issues linked to it as
GitHub sub-issues, labelled `wayfinder:<type>` (`research` / `prototype` /
`grilling` / `task`).

Blocking uses GitHub's native issue dependencies:

```
gh api --method POST repos/cgm-16/ndle/issues/<child>/dependencies/blocked_by \
  -F issue_id=<blocker-database-id>
```

`<blocker-database-id>` is the numeric **database id** — `gh api
repos/cgm-16/ndle/issues/<n> --jq .id` — not the `#number` and not the
`node_id`. A ticket is unblocked when every blocker is closed
(`issue_dependencies_summary.blocked_by` counts open blockers only).

Note this overlaps `docs/plan/roadmap.md`'s wave/`depends_on` model, which is
what this repo actually uses to sequence work. Prefer the roadmap unless a
skill specifically asks for a wayfinder map.
