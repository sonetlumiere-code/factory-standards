# The Canonical Stack

The default technology choices for every new app. When a project needs one of
the capabilities below, **reach for the canonical choice** — don't re-evaluate
per project. Deviating is allowed but must be justified (in the PR or an ADR):
the value of a factory is that "weird in a familiar way" beats "novel," for both
the team and the agents.

Versions are floors, not pins — track the latest stable within the listed major.
Pin exact versions in `package.json`/lockfile per project.

## Core

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Framework | **Next.js** (App Router) | 16 | Server Components, server actions, file-based routing, first-class on Vercel. |
| UI runtime | **React** | 19 | — |
| Language | **TypeScript** (`strict`) | 5.x | `strict` + `noUncheckedIndexedAccess` non-negotiable (see [tooling-config.md](./tooling-config.md)). |
| Package manager | **pnpm** | 10 | Fast, strict, content-addressed store. Pin via `packageManager`. |
| Hosting | **Vercel** | — | The whole [production baseline](./vercel-nextjs-production-baseline.md) targets it. |

## Data

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Database | **PostgreSQL on Neon** | 16 | Serverless Postgres, branch-per-environment, pooled + direct endpoints. |
| ORM | **Drizzle** | 0.4x | Typed, SQL-first, no codegen runtime. Migrations via `drizzle-kit generate` + `migrate`. |
| DB driver | **`@neondatabase/serverless`** (WebSocket) at runtime; **`pg`** (node-postgres) for tests | — | Neon driver for the serverless fleet; `pg` for testcontainers (can't reach `127.0.0.1`). Sniff the host and branch. See [baseline DB-1](./vercel-nextjs-production-baseline.md). |
| IDs | **`uuid` (`defaultRandom()`)** for app tables; text ids where an external system owns them | — | Opaque, non-enumerable, no sequence contention. |
| Money | **integer cents** (never floats) | — | Convert at the boundary with a `toCents()`/`fromCents()` helper; format for display only. Lint-guard the `Math.round(x*100)` pattern. |

## Auth & access

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Authentication | **Better Auth** | 1.4 | Sessions, OAuth, organizations/RBAC, DB-backed rate limiting. (Use ≥1.4.17 — earlier versions pull a vulnerable transitive `vitest`.) |
| Authorization | **server-authoritative permission checks** | — | `hasPermission(...)` on every mutation; client checks are UX only. Enforce with an architecture guard. |

## Validation & forms

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Schema validation | **Zod v4** | 4 | v4 API only (`z.uuid()`, `z.email()`, `z.strictObject`, `result.error.issues`, `z.enum([...])`). Never `z.string().uuid()`, `.flatten()`, `z.nativeEnum()`. |
| Schema location | **`lib/validations/<feature>.ts`** | — | Never inline in actions/components/pages — one home per feature. |
| Forms | **react-hook-form + `zodResolver`** | — | Paired with the UI kit's field components. |

## UI

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Styling | **Tailwind CSS v4** | Utility-first, no config sprawl. |
| Components | **shadcn/ui** | Copy-in components you own and theme; no black-box dependency. |
| Icons | a single **`@/components/icons`** wrapper | Never import the icon library directly — one swap point, consistent sizing. |
| Rich text | **Tiptap** | When you need a real editor. |
| Drag & drop | **dnd-kit** | Sortable lists, reordering. |
| Command palette / inputs | **cmdk**, **input-otp** | As needed. |

## Side effects & infra

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Transactional email | **Resend** | Simple API; wrap sends in the outbox so they can't be lost. |
| Image storage / CDN | **Cloudinary** | Uploads + transforms; allowlist its host in `next.config` and CSP. |
| Background work | **`@vercel/functions` `waitUntil`** | Survives the response on serverless; wrap transient ops in retry-with-backoff. |
| Reliable side effects | **transactional outbox** (`lib/events/*`) | Emit in the business transaction; a dispatcher delivers with retry/dead-letter. See [baseline REL-1](./vercel-nextjs-production-baseline.md). |
| Scheduled work | **Vercel Cron** (`vercel.json`) | Bearer-guarded route handlers; Pro plan for sub-daily. |
| Rate limiting | **Upstash Redis** or **Vercel KV** | Distributed — in-memory limiters are useless on a serverless fleet. |
| Dates / timezones | **date-fns** (+ **date-fns-tz**) | Explicit, tree-shakeable; no global mutable locale. |

## Env, observability, quality

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Env validation | **`@t3-oss/env-nextjs` + Zod** | Typed, fails the build on a missing/bad var. Split `client.ts` / `server.ts`. |
| Logging | a single **`lib/logger.ts`** abstraction | One swap point: console → Sentry/Datadog. |
| Error tracking | **Sentry** (`@sentry/nextjs`) | Needs `app/global-error.tsx`. |
| Analytics | **`@vercel/analytics`** + **`@vercel/speed-insights`** | Traffic + Core Web Vitals. |
| Lint / format | **ESLint** (flat config + custom guards) + **Prettier** | No-semi, double quotes. Full config in [tooling-config.md](./tooling-config.md). |
| Testing | **Vitest** (unit) + **testcontainers** (integration, real Postgres) + **Playwright** (e2e) | Unit profile runs without Docker; integration spins a real DB. |

## Project conventions (apply with the stack)

- **File names** kebab-case. **DB access only via `data/*`** (`import "server-only"`).
- **Types** from one `drizzle/types.ts` (never inline `$inferSelect`).
- **Server actions** return a uniform typed result (`ok()`/`fail()`), never raw `{ error }`.
- **`process.env`** only inside `lib/env/*` (lint-guarded); import the typed `env` elsewhere.
- **Public-row boundary**: client-bound code uses `Public*` view types / `*Safe` accessors,
  never raw DB rows.

> When a capability isn't covered here, that's a yellow flag: check what the incumbent
> products in the space do (Shopify / Stripe / Linear, etc.) before inventing, and add the
> resolved choice back to this file.
