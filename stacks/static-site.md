# Stack — Static site / landing

Marketing sites, docs, content-driven pages — little or no per-user state. Optimize
for fast first paint, great SEO, and cheap hosting. **The moment a project needs
auth + a database for its own users, it's not this archetype** — graduate it to
[full-stack-web.md](./full-stack-web.md).

**Inherits:** the [universal core](./README.md#universal-core-every-archetype) only.
**Skips the data spine** — no Postgres/Drizzle by default.

## Core

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Framework | **Astro** | 5 | Ships zero JS by default; islands only where you need interactivity. Content collections + Markdown/MDX first-class. |
| Interactivity | **Astro islands** (React island if you must) | — | Reach for a React island only for a genuinely interactive widget; keep the rest static. |
| Styling | **Tailwind CSS v4** | — | Same utility vocabulary as the other archetypes. |
| Content | **Astro content collections** (Markdown/MDX, schema-validated with Zod) | — | Type-safe content; reuses the core's Zod. |
| Hosting | **Vercel** (static or hybrid) | — | Static output by default; opt into on-demand rendering only where needed. |

## SEO (first-class here)

Public pages are the whole point — treat SEO as a requirement, not a nicety:
metadata + Open Graph, `sitemap`/`robots`, canonical URLs, JSON-LD, Core Web Vitals
budget. See [seo.md](../seo.md) for the concrete patterns; pair it with the baseline's
web-vitals and headers items.

## Forms & dynamic bits (no DB)

| Need | Canonical choice | Why |
| ---- | ---------------- | --- |
| Contact / signup forms | **Astro Actions** or a posted endpoint → **Resend** (email) | No DB needed for a simple lead; validate with Zod (core). |
| Newsletter / CRM | the provider's API (e.g. Resend audiences) | Don't stand up a database for a mailing list. |
| Search | static index (e.g. Pagefind) | Build-time index, no backend. |

## Quality

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Error tracking | **Sentry** (browser SDK) | Only if there are islands worth tracking. |
| Analytics | **`@vercel/analytics`** + **`@vercel/speed-insights`** | Traffic + Core Web Vitals. |
| Testing | **Vitest** (unit, from core); **Playwright** for critical pages | E2E only if there's real interactivity. |

> Most of the production baseline still applies (security headers, dependency scanning,
> CI). The data/auth-heavy items (DB-*, most SEC auth items) don't — note them as
> not-applicable in the deferral table.
