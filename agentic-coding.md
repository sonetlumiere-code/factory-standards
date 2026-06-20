# Agentic Coding — Docs as Executable Guardrails

How to structure a codebase so an AI coding agent produces correct, consistent
work *by default* — and can't silently drift. This is the highest-leverage
standard in the factory: the difference between an agent that guesses and one
that is steered by machine-verified rules.

The core idea: **docs are not prose for humans to skim — they are the rule
surface the agent reads before every change, and automated guards fail the build
when code and docs diverge.** Code is ground truth; docs describe it; tests keep
them honest.

Both reference projects implement versions of this. They're complementary, and
this doc is the **synthesis of the best of each** — adopt all of it on new projects.

---

## Which reference repo is more optimized? (you asked)

**`gp-learning` has the more advanced agentic docs system.** It treats the spec
as a first-class, machine-verified artifact:

- A dedicated **`docs/spec/`** — one topic per file (system-overview, domain-model,
  business-rules, invariants, constraints, workflows, authorization-model,
  multi-tenancy, state-machines, events, integrations).
- **Confidence levels** on every statement — `PROVEN` / `LIKELY` / `UNKNOWN`. Behavior
  that can't be proven from code is marked `UNKNOWN`, **never invented**. This single
  convention is the biggest anti-hallucination lever there is.
- **Evidence citations** in the form `` `path` › `symbol` `` (not `file:line`, which rots
  on every refactor).
- **Citation tests** (`tests/spec/citations.test.ts`) that fail the build when a cited
  symbol is renamed/removed — *and* when a new exported server action has **no** spec
  reference, nudging new behavior into the spec.
- A **generated `spec.json`** index (`pnpm spec:json`) and a **generated
  `schema.generated.md`** (`pnpm spec:schema`), each guarded by a staleness test.
- A clear **precedence rule**: Code → `docs/spec/` → `AGENTS.md`. "If code and the spec
  disagree, the spec is wrong — fix the spec."

**`multi-ecommerce` is stronger on a few complementary things** worth keeping:

- A **stable-ID catalog** across docs — `I` (invariants), `B/O/T/OR` (constraints/decisions),
  `R` (risk register) — cited in commits, comments, PRs. IDs are **append-only, never
  renumbered**, enforced by `docs-catalog-integrity.test.ts` (a locked ID snapshot).
- A **`refactor-playbook.md`**: "if you're touching X, here are the pre-merge checks" — a
  per-change checklist indexed by what you're modifying.
- A **`risk-register.md`** ("if you change X, Y breaks") and **`anti-patterns.md`**
  (common agent mistakes, pre-empted).
- **Architecture-invariant guards** (`architecture-invariants.test.ts`): tenant-isolation,
  RBAC, action-result shape — failing the build on a violation, not just a doc cite.
- **Link-integrity** + **rationale-anchor** tests that fail when a doc references a path or
  anchor that no longer exists.

**Recommended baseline = both.** Use gp-learning's confidence-rated, citation-verified
`docs/spec/` *and* multi-ecommerce's stable-ID catalog + refactor-playbook + architecture
guards. Neither alone is complete: citations prove a reference *resolves*; stable IDs make
rules *addressable*; architecture guards prove the rule is actually *held* in code.

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
- **Architecture invariants** — the rules that *can* be statically checked (tenant filter
  present, RBAC gate present, return-type shape) are, and fail the build otherwise.
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

7. **A "docs follow code in the same change" gate.** A CI nudge (warn, or block) when
   behavior files (`actions/`, `drizzle/schema/`) change without a matching `docs/spec/`
   update. _Ref:_ gp-learning's `spec-sync` job + multi-ecommerce's migration-presence check.

8. **An anti-patterns doc, fed by real mistakes.** Each time an agent makes a wrong-but-
   plausible move, add it to `anti-patterns.md` with the right pattern. The corpus of
   "things that look right but aren't" is gold for steering the next agent.

9. **Adversarial / multi-agent review on risky changes.** For migrations, auth, money, and
   tenant-isolation work, run a second agent prompted to *refute* the change against the
   invariants before merge. Cheap insurance on the high-blast-radius areas.

10. **Golden-path reference implementations.** For every "add a new X" (provider, carrier,
    plan, section, event), point at the most recent real example in code — "copy this." Recipes
    as prose drift; recipes as a cited file don't. _Ref:_ `workflows.md` in both repos.

11. **A house design-reference rule.** When designing new UX/schema, name the real-world
    product you're mirroring (Shopify / Stripe / TiendaNube / Linear…) in the commit/ADR.
    Stops the agent inventing novel patterns where an established one fits.

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
