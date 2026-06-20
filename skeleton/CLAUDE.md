# <Project> — the agent door

Read this first. It's the shortest path to making a correct change. The full rules
live in `docs/spec/`; this file is the index and the non-negotiables.

> **Source-of-truth precedence:** Code → `docs/spec/` → this file.
> If code and the spec disagree, **the spec is wrong** — fix the spec.

> ⚠️ **Non-negotiable: a change isn't done until its docs and tests match the real
> code — in the same commit.** Update the matching `docs/spec/*.md` and its tests
> whenever you change behavior; leave **no stale references** (renamed symbols, dead
> paths, outdated rules). The citation/catalog guards in `tests/spec/` fail the build
> on broken references, but the *semantic* pass — "does the sentence still describe the
> code?" — is on you. See the checklist below.

## What this is

<One paragraph: what the product is, the stack, and the single most important
domain concept — including how rows are *scoped* (the security boundary). Stack
e.g. "Next.js 16 / React 19 / TS strict / Postgres (Neon) / Drizzle / Better Auth
/ Tailwind." Then state the scope, picking the variant that fits:
- multi-tenant — "Org = tenant; the tenant-id filter IS the security boundary."
- single-tenant / single-admin — "Each user owns their rows; the owner-id filter
  IS the security boundary." (no tenant concept)>

## Rules every change must respect

<5–7 max. Each links to its full entry by stable ID. Examples — replace with yours:>

1. **Scope isolation.** Every `data/*` query filters by its scope id — the **tenant
   id** (multi-tenant) or the **owner id** (single-tenant: a user reads only their own
   rows). There is no row-level security; the filter IS the boundary.
   ([INV-1](./docs/spec/invariants.md))
2. **Validated env only.** Never read `process.env` outside `lib/env/*` (NODE_ENV
   excepted). Import typed `env`. ([C-6](./docs/spec/constraints.md))
3. **Server actions return a typed result** via `ok()`/`fail()` — never raw
   `{ error }`. Authz is server-authoritative. ([INV-4](./docs/spec/invariants.md))
4. **Money is integer cents.** Convert at the boundary with `toCents()`; no floats.
   ([INV-14](./docs/spec/invariants.md))
5. **Side effects that must not be lost go through the outbox**, emitted in the same
   transaction as the write. ([INV-?](./docs/spec/events.md))

Static guards fail the build on violations — see `tests/spec/` and the lint config.

## After making changes (docs + tests follow code in the same change)

1. Update the matching `docs/spec/*.md` file — keep its confidence/citation tags accurate.
2. Append (never renumber) any new stable ID to its catalog **and** to
   `tests/spec/snapshots/catalog-ids.json`.
3. `grep -rn '<symbol>' docs/` before declaring done — fix any stale citation you renamed.
4. Add a test for any new pure helper; an integration test for invariants the static
   guards can't reach (transactions, races, cross-scope — cross-tenant or cross-owner).
5. Run `pnpm lint && pnpm typecheck && pnpm test`. (CI also runs the **spec-sync nudge**
   — `scripts/spec-sync-nudge.mjs` — which warns if you changed behavior without touching
   `docs/spec/`. Heed it: update the spec rather than silencing it.)

## Key paths

| What | Where |
| ---- | ----- |
| Auth middleware | `proxy.ts` (NOT `middleware.ts`) |
| RBAC / permissions | `lib/auth/permissions.ts` |
| Data layer (DB only here) | `data/*` — `import "server-only"` |
| Inferred DB types | `drizzle/types.ts` |
| Typed env | `lib/env/{client,server}.ts` |
| Domain events / outbox | `lib/events/*` |

## Reading order

| If you want to… | Read |
| --------------- | ---- |
| Know the rules that must hold | `docs/spec/invariants.md`, `constraints.md` |
| Understand a domain area | the matching `docs/spec/*.md` |
| Avoid a refactor footgun | `docs/spec/risk-register.md` |
| Pick up deferred work | `docs/roadmap.md` |
| Add a new X (provider/plan/…) | the most recent real example in code (copy it) |

## Conventions (short list)

- File names kebab-case. Types from `@/drizzle/types`, never inline `$inferSelect`.
- Schemas in `lib/validations/<feature>.ts` — never inline in actions/components.
- DB calls only via `data/<feature>/`. Forms: react-hook-form + zodResolver.
- Mark anything you can't prove from code as **UNKNOWN** in the spec — never invent.
