# The Canonical Stacks

The default technology choices for every new app — now **keyed by archetype**.
A landing page, a full product, and a headless API don't want the same framework,
but they share a spine (language, validation, tooling, data). This file is that
shared spine plus the chooser; each archetype file lists only its **deltas**.

When a project needs a capability, **reach for the canonical choice** — don't
re-evaluate per project. Deviating is allowed but must be justified (PR or ADR):
the value of a factory is that "weird in a familiar way" beats "novel," for both
the team and the agents.

Versions are floors, not pins — track the latest stable within the listed major.
Pin exact versions in `package.json`/lockfile per project.

## Pick the archetype first

The archetype picks the framework, the UI story, and which spine sections apply.
The interactive bootstrap asks for this; if you scaffold by hand, choose here.

| Archetype | When | Entry file | Framework | UI |
| --------- | ---- | ---------- | --------- | -- |
| **Static site / landing** | Marketing, docs, content; little/no per-user state | [static-site.md](./static-site.md) | **Astro** | Astro components + Tailwind |
| **Full-stack web app** | Auth'd product with its own UI and DB | [full-stack-web.md](./full-stack-web.md) | **Next.js** (App Router) | React + Tailwind + shadcn/ui |
| **API-only / backend service** | Headless API, webhooks, jobs; no UI | [api-service.md](./api-service.md) | **Hono** | none |
| **Desktop app** | Native macOS/Windows/Linux app | [desktop.md](./desktop.md) | **Tauri** v2 | React + Vite + Tailwind + shadcn |
| _mobile, CLI, …_ | later | — | (add when a real project needs one) | — |

> **Spine applicability.** Static sites use the **universal core** only. Full-stack
> and API services add the **data spine**. Each archetype file says what it inherits.

## Universal core (every archetype)

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Language | **TypeScript** (`strict`) | 5.x | `strict` + `noUncheckedIndexedAccess` non-negotiable (see [tooling-config.md](../tooling-config.md)). |
| Package manager | **pnpm** | 10 | Fast, strict, content-addressed store. Pin via `packageManager`. Needs **Node ≥22.13** (the 22 LTS line) — keep `engines.node`/`.nvmrc` aligned with pnpm ([tooling-config.md](../tooling-config.md)). |
| Runtime | **Node.js** | 22 (LTS) | Pin via `.nvmrc` + `engines.node`. Floor tracks pnpm's requirement (≥22.13 for pnpm 10.13+). |
| Schema validation | **Zod v4** | 4 | Validate all external input at the boundary. v4 API only (`z.uuid()`, `z.email()`, `z.strictObject`, `result.error.issues`, `z.enum([...])`). Never `z.string().uuid()`, `.flatten()`, `z.nativeEnum()`. |
| Schema location | **`lib/validations/<feature>.ts`** | — | Never inline in handlers/actions/components — one home per feature. |
| Env validation | **`@t3-oss/env` + Zod** | — | Typed, fails the build on a missing/bad var. `@t3-oss/env-nextjs` for Next, `@t3-oss/env-core` elsewhere. Split client/server. |
| Logging | a single **`lib/logger.ts`** abstraction | — | One swap point: console → Sentry/Datadog. Never log secrets/PII. |
| Lint / format | **ESLint** (flat config + custom guards) + **Prettier** | — | No-semi, double quotes. Full config in [tooling-config.md](../tooling-config.md). |
| Testing | **Vitest** (unit) | — | Unit profile runs without Docker. Integration/e2e are archetype-specific. |

## Data spine (full-stack web + API service)

Skip entirely for a static site that has no database.

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Database | **PostgreSQL on Neon** | 16 | Serverless Postgres, branch-per-environment, pooled + direct endpoints. |
| ORM | **Drizzle** | 0.4x | Typed, SQL-first, no codegen runtime. Migrations via `drizzle-kit generate` + `migrate`. |
| DB driver | **`@neondatabase/serverless`** (WebSocket) at runtime; **`pg`** for tests | — | Neon driver for the serverless fleet; `pg` for testcontainers (can't reach `127.0.0.1`). Sniff the host and branch. **Drop-in canonical client: [recipes/neon-drizzle-client](../recipes/neon-drizzle-client/)** (don't hand-roll it — it has the `ws` line apps forget). See [baseline DB-1](../vercel-nextjs-production-baseline.md). |
| IDs | **`uuid` (`defaultRandom()`)** for app tables; text ids where an external system owns them | — | Opaque, non-enumerable, no sequence contention. |
| Money | **integer cents** (never floats) | — | Convert at the boundary with `toCents()`/`fromCents()`; format for display only. Lint-guard the `Math.round(x*100)` pattern. |
| Reliable side effects | **transactional outbox** (`lib/events/*`) | — | Emit in the business transaction; a dispatcher delivers with retry/dead-letter. Drop-in: [recipes/transactional-outbox](../recipes/transactional-outbox/). |
| Integration tests | **testcontainers** (real Postgres) | — | Transactions, races, and cross-scope (tenant/owner) scenarios the type system can't reach. |

### Data-layer conventions (apply wherever the data spine does)

- **DB access only via `data/*`** (`import "server-only"`); handlers/components/pages never import the ORM directly.
- **Scope isolation** — every `data/*` query filters by its scope id: the **tenant id**
  (multi-tenant) or the **owner id** (single-tenant). The filter IS the security boundary.
- **Types** from one `drizzle/types.ts` (never inline `$inferSelect`).
- **Public-row boundary**: client/response-bound code uses `Public*` view types / `*Safe`
  accessors, never raw DB rows.
- **`process.env`** only inside `lib/env/*` (lint-guarded); import the typed `env` elsewhere.
- **File names** kebab-case. **Authorization is server-authoritative** — `hasPermission(...)`
  on every mutation; client checks are UX only. Enforce with an architecture guard.

---

> When a capability isn't covered for your archetype, that's a yellow flag: check what the
> incumbent products in the space do (Shopify / Stripe / Linear, etc.) before inventing, and
> add the resolved choice back to the relevant stack file.
