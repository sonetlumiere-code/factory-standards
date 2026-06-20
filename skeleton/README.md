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
tests/architecture/
  architecture-invariants.test.ts → scope-isolation (tenant or ownership) + authz guards (Pattern B)
scripts/
  spec-sync-nudge.mjs             → CI nudge: warn when behavior changes without a docs/spec/ update
.github/workflows/
  spec-sync.yml                   → example wiring for the nudge (warn-only; adapt to your CI)
```

## How to use it

1. Copy the tree; replace `<Project>` / `<feature>` / placeholder citations.
2. Add the spec files you need (`domain-model.md`, `business-rules.md`,
   `constraints.md`, `workflows.md`, `events.md`, …) — one topic per file. Each new
   doc is picked up automatically by the citation guard.
3. Wire the guards into your test runner so they run in CI (they need no DB —
   pure file checks). With Vitest: include `tests/**/*.test.ts` in the unit project.
   The architecture guards (`tests/architecture/`) are inert until you add a `data/`
   layer and action files. Keep the scope-isolation block that fits — tenant-id (multi-
   tenant) or owner-id (single-tenant) — and adapt its token and the permission-check
   matcher to your app.
4. Adopt the rule: **docs follow code in the same change.** When you touch cited
   code, update the statement and its citation; when you add a stable ID, append it
   to both the catalog file and `snapshots/catalog-ids.json`.
5. Wire the **spec-sync nudge** in CI: run `scripts/spec-sync-nudge.mjs` on every PR
   (see `.github/workflows/spec-sync.yml`). It warns when behavior files (`actions/`,
   `data/`, `drizzle/schema/`) change without a `docs/spec/` update. Warn-only by
   default; add `--strict` to make it a hard gate once the habit sticks. Adapt the
   `BEHAVIOR`/`SPEC_DIR` globs at the top of the script to your layout.

## The ID scheme (append-only, never renumber)

| Prefix | Catalog | Lives in |
| ------ | ------- | -------- |
| `INV-` / `I` | Invariants — always-true conditions | `docs/spec/invariants.md` |
| `BR-`  | Business rules | `docs/spec/business-rules.md` |
| `C-` / `B/O/T` | Constraints & baked-in decisions | `docs/spec/constraints.md` |
| `R-`   | Risks ("if you change X, Y breaks") | `docs/spec/risk-register.md` |

Pick one convention and keep it. The guards don't care which letters you use — they
care that IDs are append-only and citations resolve.
