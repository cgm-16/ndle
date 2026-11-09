# GitHub Planning Metadata

Branch, commit, and PR conventions (§4.4) live in `AGENTS.md`.

### 4.2 Labels

Create these labels before filing issues:

| Label | Color | Meaning |
|---|---:|---|
| `type:foundation` | `5319E7` | Tooling, repository, CI |
| `type:game-logic` | `1D76DB` | Domain rules, reducer, selectors |
| `type:ui` | `0E8A16` | React components and interaction |
| `type:i18n` | `006B75` | Language, copy, persistence |
| `type:release` | `B60205` | Deployment and release gates |
| `priority:P0` | `D93F0B` | Blocks playable core or correctness |
| `priority:P1` | `FBCA04` | Required PoC release quality |
| `parallel-safe` | `C2E0C6` | May run concurrently within its DAG wave |
| `needs-review` | `F9D0C4` | Implementation complete, review pending |
| `blocked` | `B60205` | Cannot progress without an external decision or prerequisite |

### 4.3 Issue body schema

Every GitHub issue created from a task below must begin with:

```yaml
task_id: T##
milestone: M#
priority: P0|P1
estimate: XS|S|M|L
wave: W#
depends_on: [T##]
parallel_safe: true|false
paths:
  - exact/path
acceptance_gate:
  - exact command or observable result
```

Then **link** to the task file rather than copying it:

```markdown
Full task definition: [`docs/tasks/T##-name.md`](../tasks/T##-name.md)
```

Never copy the task's Purpose, Interfaces, Steps, and Acceptance sections into
the issue body. Copying puts the same content in two places: the task file
gets edited, the issue does not, and the two silently disagree. One copy,
linked.

### 4.5 What gets a GitHub object

**The docs are the source of truth; GitHub is the work queue.** The test for
whether something belongs in the queue: *does it have a done state?*

| Artifact | Object | Reasoning |
|---|---|---|
| Task from `writing-plans` | **Issue** | Unit of work; closes when merged |
| A build not yet decomposed | **Milestone** + one **tracking issue** | Milestone groups future task issues and shows progress; the tracking issue carries the summary, links the plan doc, and gives a surface to argue about the design before tasks are written |
| Decision awaiting the user | **Issue**, label `blocked` | Genuinely closes once decided (precedent: cgm-16/ozterisk#30) |
| Journal entry | **None** | Append-only history with no done state. An issue for it either sits open forever as backlog noise or closes immediately and was pointless. Link it from the PR body, where it is actually read |
| Cut or rejected idea | **None** | Already-made decisions, recorded in the journal. In a backlog they get re-litigated at every triage |

A tracking issue closes when its build ships. It holds a task-list of its
child issues (`- [ ] #NN`) so GitHub renders progress, and it must **link**
its plan and design docs rather than restating them — same one-copy rule as
§4.3.
