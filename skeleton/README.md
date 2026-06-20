# Skeleton — the agentic-docs starter

Copy this tree into a new project's root and adapt the placeholders. It gives you
the canonical agentic-docs system from
[../agentic-coding.md](../agentic-coding.md) on day one: an agent door, a
confidence-rated spec, and the guard tests that fail the build when code and docs
drift.

```
CLAUDE.md                       → the agent door (root). Also symlink/alias as AGENTS.md.
docs/
  README.md                     → precedence + structure
  roadmap.md                    → forward-looking backlog (sketch + status + trigger)
  spec/
    README.md                   → confidence legend + file list + maintenance rules
    invariants.md               → sample spec file showing ID + confidence + citation
tests/spec/
  citation-lib.ts               → citation-resolution machinery (reused by the guards)
  citations.test.ts             → every `path › symbol` citation resolves to real code
  catalog-integrity.test.ts     → stable IDs are append-only (locked snapshot)
  snapshots/catalog-ids.json    → the locked ID list (one append per new ID)
```

## How to use it

1. Copy the tree; replace `<Project>` / `<feature>` / placeholder citations.
2. Add the spec files you need (`domain-model.md`, `business-rules.md`,
   `constraints.md`, `workflows.md`, `events.md`, …) — one topic per file. Each new
   doc is picked up automatically by the citation guard.
3. Wire the guards into your test runner so they run in CI (they need no DB —
   pure file checks). With Vitest: include `tests/spec/**/*.test.ts` in the unit
   project.
4. Adopt the rule: **docs follow code in the same change.** When you touch cited
   code, update the statement and its citation; when you add a stable ID, append it
   to both the catalog file and `snapshots/catalog-ids.json`.

## The ID scheme (append-only, never renumber)

| Prefix | Catalog | Lives in |
| ------ | ------- | -------- |
| `INV-` / `I` | Invariants — always-true conditions | `docs/spec/invariants.md` |
| `BR-`  | Business rules | `docs/spec/business-rules.md` |
| `C-` / `B/O/T` | Constraints & baked-in decisions | `docs/spec/constraints.md` |
| `R-`   | Risks ("if you change X, Y breaks") | `docs/spec/risk-register.md` |

Pick one convention and keep it. The guards don't care which letters you use — they
care that IDs are append-only and citations resolve.
