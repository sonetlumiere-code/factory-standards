# Canonical Specification — Source of Truth

> **This is the authoritative specification of <Project>.** AI agents and engineers
> MUST consult these files before changing the system. Every statement carries a
> **confidence level** and **evidence**, cited as `` `path` › `symbol` `` (or a bare
> `` `path` `` when no single symbol fits) so citations survive refactors that line
> numbers would not. Behavior that cannot be proven from code is marked **UNKNOWN** —
> never invented.

## Confidence levels

| Level | Meaning | Action for agents |
| ----- | ------- | ----------------- |
| **PROVEN** | Demonstrable from a cited line of code. | Rely on it. |
| **LIKELY** | Strongly implied; depends on runtime/config not fully traced. | Verify before relying in edge cases. |
| **UNKNOWN** | Not establishable from code. | Do not assume; ask or investigate. |

## Files

| File | Scope |
| ---- | ----- |
| [system-overview.md](./system-overview.md) | Architecture, bounded contexts, layering |
| [domain-model.md](./domain-model.md) | Entities, relationships, ownership, deletion |
| [business-rules.md](./business-rules.md) | Enforced & unenforced rules (`BR-*`) |
| [invariants.md](./invariants.md) | Always-true conditions (`INV-*`) |
| [constraints.md](./constraints.md) | DB / app / workflow / permission / scope — tenant or ownership (`C-*`) |
| [risk-register.md](./risk-register.md) | "If you change X, Y breaks" (`R-*`) |
| [workflows.md](./workflows.md) | Canonical end-to-end flows |
| [authorization-model.md](./authorization-model.md) | Roles, permissions, matrices |
| [events.md](./events.md) | Side effects, event catalog & transactional outbox |
| [integrations.md](./integrations.md) | Third-party contracts |

> Add only the files you need. The guards scan whatever `.md` files exist here.

## Precedence & maintenance

1. **Code is ground truth.** If code and this spec disagree, **the spec is wrong** — fix the spec.
2. When you change behavior, update the matching spec file **in the same change**, keeping
   the confidence/evidence tags accurate. Every `` `path` › `symbol` `` citation is verified
   against source by `tests/spec/citations.test.ts` (part of `pnpm test`) — a renamed/removed
   symbol or moved file fails the build.

   > **What the check proves — and doesn't.** It's a *referential-integrity* check: each
   > citation points at code that still exists, **not** that the surrounding statement is
   > still true (a symbol can keep its name while its behavior changes). When you touch cited
   > code, re-read the statement, not just the citation.

3. **Stable IDs are append-only.** Adding a new `INV-<n>` appends to `invariants.md` **and**
   `tests/spec/snapshots/catalog-ids.json` in the same change;
   `tests/spec/catalog-integrity.test.ts` fails if an ID disappears or moves.
4. **Mark UNKNOWN, never invent.** A gap you can't prove from code is `UNKNOWN`, not a guess.
