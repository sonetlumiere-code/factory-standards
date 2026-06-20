# <Project> — Documentation

> **Source-of-truth precedence:** Code → `docs/spec/` → `CLAUDE.md`/`AGENTS.md`.
> If code and the spec disagree, **the spec is wrong** — fix the spec.

One living specification plus a forward-looking roadmap. The spec describes the
system *as it is*; the roadmap is what's *not done yet*. Resolution history lives in
git, not in a rotting changelog.

## Structure

| Path | What it is | Lifecycle |
| ---- | ---------- | --------- |
| [`spec/`](./spec/) | **The source of truth.** Confidence-rated, evidence-cited specification, one topic per file. | Living — update in the same change as any behavior change. |
| [`roadmap.md`](./roadmap.md) | Forward-looking backlog: open features, deferred activations, pre-launch gaps. Each item = sketch + status + trigger. | Living — prune as items ship. |

**Start here:** [`spec/README.md`](./spec/README.md).

## Keeping this from rotting

- Cite **files and symbols** (`` `path` › `symbol` ``), never `file:line` — line numbers drift.
- One topic = one file in `spec/`. Don't reintroduce a parallel layer.
- Open issues go in the roadmap; settled history goes to git.
- Stable IDs are **append-only** — never renumber or reuse.
