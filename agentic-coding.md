# Agentic Coding — Docs as Executable Guardrails

How to structure a codebase so an AI coding agent produces correct, consistent
work *by default* — and can't silently drift. This is the highest-leverage
standard in the factory: the difference between an agent that guesses and one
that is steered by machine-verified rules.

The core idea: **docs are not prose for humans to skim — they are the rule
surface the agent reads before every change, and automated guards fail the build
when code and docs diverge.** Code is ground truth; docs describe it; tests keep
them honest.

Two complementary patterns (below) have proven out in practice; this doc is the
**synthesis** — adopt all of it on new projects.

## Start here — copy the skeleton

Don't re-derive this per project. [`skeleton/`](./skeleton/) is the copy-paste
starting point — the canonical structure below, already wired and **verified
green**:

```
CLAUDE.md                       agent door (root)
docs/README.md, docs/roadmap.md
docs/spec/README.md             confidence legend + precedence
docs/spec/invariants.md         sample spec file (ID + confidence + citation format)
tests/spec/citation-lib.ts      citation-resolution machinery
tests/spec/citations.test.ts    every `path › symbol` resolves to real code
tests/spec/catalog-integrity.test.ts  stable IDs are append-only (locked snapshot)
tests/spec/snapshots/catalog-ids.json
tests/architecture/architecture-invariants.test.ts  scope-isolation (tenant or ownership) + authz guards
```

Copy it, replace the `<placeholders>`, wire `tests/**` into your test runner, and
you have the full system on day one. The rest of this doc explains *why* each piece
exists.

---

## Two patterns, one synthesis

Two complementary patterns make docs executable. Adopt **both** — neither alone is complete.

### Pattern A — the citation-verified spec (the base)

Treat the spec as a first-class, machine-verified artifact:

- A dedicated **`docs/spec/`** — one topic per file (system-overview, domain-model,
  business-rules, invariants, constraints, workflows, authorization-model, multi-tenancy,
  state-machines, events, integrations).
- **Confidence levels** on every statement — `PROVEN` / `LIKELY` / `UNKNOWN`. Behavior that
  can't be proven from code is marked `UNKNOWN`, **never invented**. This single convention
  is the biggest anti-hallucination lever there is.
- **Evidence citations** in the form `` `path` › `symbol` `` (not `file:line`, which rots on
  every refactor).
- **Citation tests** that fail the build when a cited symbol is renamed/removed — *and* when
  a new exported action has **no** spec reference, nudging new behavior into the spec.
- A **generated spec index** (`spec.json`) and a **generated schema doc**, each guarded by a
  staleness test.
- A clear **precedence rule**: Code → `docs/spec/` → agent door. "If code and the spec
  disagree, the spec is wrong — fix the spec."

### Pattern B — the stable-ID catalog + guards (the muscles)

Make the rules addressable and *prove they're held*:

- A **stable-ID catalog** across docs — e.g. `INV` (invariants), `C` (constraints/decisions),
  `R` (risks) — cited in commits, comments, PRs. IDs are **append-only, never renumbered**,
  enforced by a catalog-integrity test (a locked ID snapshot).
- A **`refactor-playbook.md`**: "if you're touching X, here are the pre-merge checks" — a
  per-change checklist indexed by what you're modifying.
- A **`risk-register.md`** ("if you change X, Y breaks") and **`anti-patterns.md`** (common
  agent mistakes, pre-empted).
- **Architecture-invariant guards**: scope-isolation (tenant or ownership), RBAC, action-result shape — failing
  the build on a violation, not just a doc cite.
- **Link-integrity** tests that fail when a doc references a path or anchor that no longer exists.

### The synthesis

Pattern A as the base, Pattern B layered on. In one line: *A tells you what's true and proves
the references resolve; B makes the rules addressable and proves they're actually enforced.*
Citations prove a reference *resolves*; stable IDs make rules *addressable*; architecture
guards prove the rule is actually *held*. The [`skeleton/`](./skeleton/) ships Pattern A + the
two core guard tests (citation + catalog); add the playbook, anti-patterns, and
architecture-invariant guards as the project grows.

---

## The layers (adopt all four)

### 1. The agent door — `AGENTS.md` / `CLAUDE.md` (root)

One file the agent reads first. Keep it short and high-signal:

- **The non-negotiable rules** (5–7 max), each linking to its full entry by stable ID.
- **Key paths** table (where auth lives, where the data layer is, where types come from).
- **Conventions** (file naming, imports, the action/result contract).
- **"After making changes" checklist** — update the matching doc, add a test, grep docs for
  renamed symbols, walk the refactor-playbook.
- A **reading-order table**: "if you want to do X, read Y."

### 2. The spec — `docs/spec/*.md` (one topic per file)

The describable truth of the system. Every statement carries:

- a **stable ID** (`INV-12`, `BR-CART-3`, `I7`, `B4`…), append-only;
- a **confidence level** (`PROVEN` / `LIKELY` / `UNKNOWN`);
- an **evidence citation** `` `path` › `symbol` ``;
- the **enforcement mechanism** ("DB constraint" / "Zod" / "guard test" / "convention-only").

"Convention-only" rules are the dangerous ones — they compile and pass tests but silently
break behavior when violated. Flag them explicitly so the agent treats them with care.

### 3. The guards — `tests/` that fail the build on drift

This is what makes docs *executable*. At minimum:

- **Citation integrity** — every `` `path` › `symbol` `` cite resolves to real code.
- **Catalog integrity** — IDs are append-only (a locked snapshot catches a renumber/delete).
- **Link integrity** — every doc path/anchor reference exists.
- **Architecture invariants** — the rules that *can* be statically checked (scope filter
  present — tenant or owner, RBAC gate present, return-type shape) are, and fail the build otherwise.
- **Generated-artifact staleness** — `spec.json` / `schema.generated.md` match their source.

> **What citation tests prove — and don't.** They are *referential-integrity* checks: the
> footnote points at code that still exists. They do **not** prove the surrounding sentence
> is still true (a symbol can keep its name while its behavior changes). So: when you touch
> cited code, re-read the *statement*, not just the citation. The human/agent semantic pass
> still matters.

### 4. The backlog — `docs/roadmap.md`

Forward-looking only: open features, deferred activations, pre-launch gaps — each with a
**sketch + status + trigger**. The spec describes the system *as it is*; the roadmap is what's
*not done yet*. Resolution history lives in git, not in a rotting changelog. When a roadmap
item ships, collapse it to a one-line pointer at the doc that now owns the rationale.

---

## Ideas to improve agentic coding with the factory standards

Concrete, high-leverage moves — roughly ordered by payoff:

1. **A `project-bootstrap` prompt/skill.** A canned instruction that tells the agent, at
   project start: "read `factory-standards/*`, scaffold to `tooling-config.md`, apply every
   `vercel-nextjs-production-baseline.md` **MUST**, set up the `docs/spec/` + guard-test
   skeleton from `agentic-coding.md`, and list anything you're deferring." One command →
   a project that already has the rails. Ship it as a Claude Code skill or a slash command.

2. **A `CLAUDE.md` template** in the factory repo that new projects copy and fill. Pre-wired
   with the reading-order table, the rules placeholders, and the "after making changes"
   checklist. The agent door shouldn't be re-invented per project.

3. **Encode every recurring review nit as a guard.** The moment you correct an agent twice
   for the same thing, it becomes a `no-restricted-syntax` rule, an architecture test, or a
   spec invariant. Feedback at lint/test time beats feedback in review — the agent self-corrects.

4. **Make "UNKNOWN" a first-class output.** Train the workflow so the agent marks anything it
   can't prove from code as `UNKNOWN` rather than guessing. The confidence-level convention
   is the single best hallucination guard you have; bake it into prompts and PR review.

5. **Stable IDs everywhere, cited in commits/PRs.** "Closes I42 / BR-CART-3." It makes the
   agent's reasoning auditable and lets you grep the impact of any rule across the codebase.

6. **Generated artifacts over hand-maintained ones.** Schema docs, env tables, route maps,
   the spec index — generate them from code and guard their freshness. Hand-maintained
   mirrors of code always rot; generated ones can't.

7. **A "docs follow code in the same change" gate (shipped).** A CI nudge that warns
   when behavior files (`actions/`, `data/`, `drizzle/schema/`) change without a matching
   `docs/spec/` update — `skeleton/scripts/spec-sync-nudge.mjs` (+ the example
   `.github/workflows/spec-sync.yml`), warn-only by default, `--strict` to block. Pair it
   with the migration-presence check (schema changed but no new migration file — baseline
   DB-3).

8. **An anti-patterns doc, fed by real mistakes (shipped).** Each time an agent makes a
   wrong-but-plausible move, add it to [anti-patterns.md](./anti-patterns.md) with the right
   pattern. The corpus of "things that look right but aren't" is gold for steering the next
   agent. (A per-project `docs/spec/anti-patterns.md` does the same at the app level.)

9. **Adversarial / multi-agent review on risky changes.** For migrations, auth, money, and
   scope-isolation (tenant or ownership) work, run a second agent prompted to *refute* the change against the
   invariants before merge. Cheap insurance on the high-blast-radius areas.

10. **Golden-path reference implementations.** For every "add a new X" (provider, plan,
    section, event), point at the most recent real example in code — "copy this." Recipes as
    prose drift; recipes as a cited file don't. A `workflows.md` that maps "add a new X" → the
    canonical example is the home for this.

11. **A house design-reference rule.** When designing new UX/schema, name the real-world
    product you're mirroring (e.g. Shopify / Stripe / Linear) in the commit/ADR. Stops the
    agent inventing novel patterns where an established one fits.

12. **ADRs once past pre-production.** A lightweight `docs/adr/` registry for significant,
    hard-to-reverse decisions, with a template. The agent reads them before re-litigating a
    settled choice.

---

## New-project checklist (agentic readiness)

- [ ] `CLAUDE.md`/`AGENTS.md` agent door with rules + key paths + reading order + "after changes" list.
- [ ] `docs/spec/` skeleton, one topic per file, stable IDs + confidence levels + citations.
- [ ] `docs/roadmap.md` (sketch + status + trigger per item).
- [ ] Guard tests: citation, catalog, link integrity + architecture invariants.
- [ ] Generated `spec.json` (or equivalent index) + schema doc, with staleness tests.
- [ ] CI nudge: behavior change without a spec update warns/blocks.
- [ ] `anti-patterns.md` + `refactor-playbook.md` seeded (grow them as you go).
- [ ] Precedence rule stated: Code → spec → agent door.
