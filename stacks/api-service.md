# Stack — API-only / backend service

A headless service: REST/RPC endpoints, webhooks, scheduled jobs — **no UI**.
Consumed by other apps, mobile clients, or third parties.

**Inherits:** the [universal core](./README.md#universal-core-every-archetype) **and**
the [data spine](./README.md#data-spine-full-stack-web--api-service). This file lists
only what's specific to a headless service. Skips everything UI (React, Tailwind,
shadcn, forms).

## Core

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Framework | **Hono** | 4 | Tiny, fast, Web-standard `Request`/`Response`. Runs on Vercel, Cloudflare, Node, Bun, Deno — portable if hosting changes. |
| Routing & validation | Hono routers + **`@hono/zod-validator`** | — | Validate every input with the core's Zod at the boundary; share schemas from `lib/validations/*`. |
| Hosting | **Vercel** (default) | — | Same fleet/baseline as the other archetypes. Hono's portability is the escape hatch if a workload wants Cloudflare/Node. |
| Runtime types | OpenAPI via **`@hono/zod-openapi`** (when you publish a contract) | — | Generate the spec from the same Zod schemas; one source of truth for the API contract. |

## Auth & access

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Service / machine auth | **API keys** (hashed at rest) or **OAuth client-credentials / JWT** | Pick per consumer: keys for first-party/server-to-server, JWT/OAuth for third parties. |
| User-context auth (if any) | **Better Auth** (verify its session/JWT) | When the API acts on behalf of an end user; otherwise skip the UI-oriented parts. |
| Authorization | **server-authoritative checks on every mutation** | Same rule as full-stack — `hasPermission(...)`; enforce with an architecture guard. |
| Webhooks (inbound) | verify provider signature **before** parsing; dedupe with an idempotency table | See [baseline SEC-7](../vercel-nextjs-production-baseline.md). |

## Side effects & infra

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Reliable side effects | **transactional outbox** (`lib/events/*`) | From the data spine — emit in the business transaction; a dispatcher delivers. |
| Scheduled work | **Vercel Cron** (`vercel.json`) → bearer-guarded routes | Same as full-stack; the routes are just Hono handlers. |
| Background work | **`@vercel/functions` `waitUntil`** | Survive the response on serverless; retry-with-backoff for transient ops. |
| Distributed KV | **Upstash Redis** (REST) or **Vercel KV** | Rate limiting (public API surfaces need it), locks, idempotency stores, shared cache. HTTP-based — serverless can't pool sockets; in-memory is useless on a fleet. See [security.md](../security.md). |
| Transactional email | **Resend** | Wrapped in the outbox. |

## Security & quality

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Response headers / CORS | set per route (Hono `secureHeaders()` + explicit CORS allowlist) | No `next.config` here — apply the baseline's [SEC-1](../vercel-nextjs-production-baseline.md) headers in middleware; lock CORS to known origins. |
| Env validation | **`@t3-oss/env-core` + Zod** | The non-Next binding of the core's env validation. |
| Error tracking | **Sentry** (`@sentry/node` / runtime SDK) | No `global-error.tsx`; wire the runtime SDK. |
| Testing | **Vitest** (unit) + **testcontainers** (integration) | E2E is contract tests against the running service (e.g. Hono's `app.request()` or Supertest-style), not Playwright. |

## Conventions specific to this archetype

- **Uniform typed responses** — a consistent success/error envelope (mirror full-stack's
  `ok()`/`fail()`), with proper HTTP status codes. Never leak raw errors.
- All the data spine's [data-layer conventions](./README.md#data-layer-conventions-apply-wherever-the-data-spine-does) apply.
- No public HTML pages → **SEO does not apply** (the interactive bootstrap won't include `seo.md`).
