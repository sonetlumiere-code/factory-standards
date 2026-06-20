# Stack — Full-stack web app

An authenticated product with its own UI and database. This is the original
canonical stack and the one the [production baseline](../vercel-nextjs-production-baseline.md)
targets end-to-end.

**Inherits:** the [universal core](./README.md#universal-core-every-archetype) **and**
the [data spine](./README.md#data-spine-full-stack-web--api-service). This file lists
only what's specific to a full-stack web app.

## Core

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Framework | **Next.js** (App Router) | 16 | Server Components, server actions, file-based routing, first-class on Vercel. |
| UI runtime | **React** | 19 | — |
| Hosting | **Vercel** | — | The whole [production baseline](../vercel-nextjs-production-baseline.md) targets it. |

## Auth & access

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Authentication | **Better Auth** | 1.4 | Sessions, OAuth, organizations/RBAC, DB-backed rate limiting. (Use ≥1.4.17 — earlier versions pull a vulnerable transitive `vitest`.) |
| Authorization | **server-authoritative permission checks** | — | `hasPermission(...)` on every mutation; client checks are UX only. Enforce with an architecture guard. |

## Forms

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Forms | **react-hook-form + `zodResolver`** | Paired with the UI kit's field components. Schemas stay in `lib/validations/*` (universal core). |

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
| Scheduled work | **Vercel Cron** (`vercel.json`) | Bearer-guarded route handlers; Pro plan for sub-daily. |
| Rate limiting | **Upstash Redis** or **Vercel KV** | Distributed — in-memory limiters are useless on a serverless fleet. |
| Dates / timezones | **date-fns** (+ **date-fns-tz**) | Explicit, tree-shakeable; no global mutable locale. |

## Observability & quality (beyond the universal core)

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Env validation | **`@t3-oss/env-nextjs` + Zod** | The Next-specific binding of the core's env validation. Split `client.ts` / `server.ts`. |
| Error tracking | **Sentry** (`@sentry/nextjs`) | Needs `app/global-error.tsx`. |
| Analytics | **`@vercel/analytics`** + **`@vercel/speed-insights`** | Traffic + Core Web Vitals. |
| Testing (beyond unit) | **Playwright** (e2e) | On the critical happy paths (signup, checkout/enroll). Integration via testcontainers (data spine). |

## Conventions specific to this archetype

- **Server actions** return a uniform typed result (`ok()`/`fail()`), never raw `{ error }`.
- Everything in the data spine's [data-layer conventions](./README.md#data-layer-conventions-apply-wherever-the-data-spine-does) applies.
- Public pages? Follow [seo.md](../seo.md) (metadata, robots/sitemap, JSON-LD, canonical).
