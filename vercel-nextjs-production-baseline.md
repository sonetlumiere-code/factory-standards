# Vercel + Next.js Production Baseline

The configuration every Next.js (App Router) app deployed to Vercel must have
before it serves real users. Stack assumed: **Next.js 16, React 19, TypeScript
strict, PostgreSQL (Neon), Drizzle, Better Auth, Tailwind, pnpm** — but most
items are stack-agnostic.

**How to read this:** each item has an ID, a level (**MUST** / **SHOULD** /
**MAY**, RFC-2119), a one-line rationale, and a *Reference* pointing at a real
file in `multi-ecommerce` or `gp-learning`. An agent starting a project should
apply every **MUST**, justify any deferral, and treat **SHOULD** as the default.

Legend: ✅ both reference projects do this · ⚠️ partial/asymmetric · ❌ neither does it yet (a real gap)

---

## 1. Repository & tooling

- **REPO-1 (MUST)** Pin the Node version with `.nvmrc` **and** `engines.node` in
  `package.json`. Vercel reads it; local dev matches prod. ⚠️ (gp-learning has both; ecommerce has neither — relies on the CI's hardcoded `node: 20`.)
- **REPO-2 (MUST)** Pin the package manager (`packageManager` field or `engines.pnpm`)
  and commit the lockfile. Reproducible installs across machines and CI. ⚠️
- **REPO-3 (MUST)** TypeScript `strict: true`. _Ref:_ `tsconfig.json`. ✅
- **REPO-4 (MUST)** Lint + format enforced (ESLint + Prettier) with a single command.
  Full configs (with snippets) in [tooling-config.md](./tooling-config.md). _Ref:_
  `eslint.config.mjs`, `pnpm lint`/`pnpm format`. ✅
- **REPO-5 (SHOULD)** Custom lint guards for project invariants (e.g. ban `process.env`
  outside the env module, ban float money math, enforce import sorting). Architecture
  rules the compiler can't express become lint/test guards. _Ref:_ `multi-ecommerce/eslint.config.mjs`
  (env + money rules), `multi-ecommerce/lib/architecture-invariants.test.ts`. ⚠️ (ecommerce strong, gp-learning lighter)
- **REPO-6 (SHOULD)** A `CLAUDE.md`/`AGENTS.md` at the root: the rules, key paths,
  conventions, and "after making changes" checklist. The agent's entry point. ✅

## 2. Environment & secrets

- **ENV-1 (MUST)** Validate env at boot with a typed schema (Zod via `@t3-oss/env-nextjs`
  or a hand-rolled `getEnvVar`). A missing/malformed var must fail the build, not surface
  as a runtime `undefined`. _Ref:_ `multi-ecommerce/lib/env/server.ts` (T3), `gp-learning/lib/env/server.ts`. ✅
- **ENV-2 (MUST)** Never read `process.env` outside the env module (one direct-access
  exception: `NODE_ENV`). Lint-enforced. _Ref:_ REPO-5. ⚠️
- **ENV-3 (MUST)** `.env` is gitignored and **never** committed. Real secrets live only in
  Vercel's env settings + local `.env`. ✅
- **ENV-4 (MUST)** Commit a `.env.example` with placeholders for every var. **Gotcha:** a
  blanket `.env*` in `.gitignore` also ignores `.env.example` — add a `!.env.example`
  negation. _Ref:_ both repos' `.gitignore` + `.env.example`. ✅ (after the negation fix)
- **ENV-5 (MUST)** Separate secrets per environment (prod / preview / staging) — distinct
  DB, OAuth client, signing secrets, email sender. Never share prod secrets with previews.
- **ENV-6 (SHOULD)** Split client vs server env modules; only `NEXT_PUBLIC_*` reaches the
  browser. _Ref:_ `lib/env/client.ts` vs `lib/env/server.ts`. ✅
- **ENV-7 (SHOULD)** Rotate any secret that ever sat in a shared/dev file before it
  becomes a production value.

## 3. Database

- **DB-1 (MUST)** Use **pooled** connections at runtime, a **direct (unpooled)** connection
  for migrations — two different URLs:
  - **Runtime → pooled.** The app client uses `DATABASE_URL`, the **`-pooler`** host (Neon's
    PgBouncer endpoint, e.g. `ep-xxx-pooler.region.aws.neon.tech`). Serverless spins up many
    short-lived function instances; without the pooler they exhaust Postgres's connection
    limit (or burn 100–300 ms/cold-start on TCP+TLS handshakes).
  - **Migrations → direct, NOT pooled.** `drizzle-kit migrate` uses `DATABASE_URL_UNPOOLED`,
    the **same URL with `-pooler` removed** from the host. **Never run migrations through the
    `-pooler` host:** PgBouncer in transaction-pooling mode rejects the session-level work
    and prepared statements that DDL migrations issue — you get intermittent, confusing
    migration failures. The Neon–Vercel integration provisions `DATABASE_URL_UNPOOLED`
    automatically; locally it falls back to `DATABASE_URL`.
  - In `drizzle.config.ts`: `url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL`.
  - The runtime driver should sniff the host and pick the right Neon vs node-postgres driver
    (Neon's WebSocket driver can't reach `127.0.0.1`/containers, so tests fall back to `pg`).
  _Ref:_ `drizzle.config.ts`, `drizzle/db.ts` (both repos). ✅
- **DB-2 (MUST)** Versioned migrations checked into git; applied via `drizzle-kit migrate`
  (never auto-`push` to prod). Run them as a deploy/build step against the unpooled URL.
  _Ref:_ `multi-ecommerce` `"build": "drizzle-kit migrate && next build"`. ⚠️ (ecommerce yes; gp-learning migrates out-of-band)
- **DB-3 (SHOULD)** CI guard: if the schema changed but no new migration file was added,
  fail. Catches "forgot to generate the migration." _Ref:_ `multi-ecommerce/.github/workflows/ci.yml`. ⚠️
- **DB-4 (MUST, pre-prod)** Role separation: app-runtime credentials ≠ developer
  credentials. Dev creds must not be able to touch the prod database. (Neon: two roles /
  branches.)
- **DB-5 (MUST)** All DB access through a data layer (`data/*`, `import "server-only"`);
  components/pages never import the ORM directly. Tenant/authz filters live there and are
  the security boundary. _Ref:_ both repos' `data/` + the tenant-isolation guard test. ✅
- **DB-6 (SHOULD)** Backups / point-in-time recovery enabled; restore tested at least once.
- **DB-7 (SHOULD)** Index the columns every tenant-scoped read filters on. _Ref:_ `order_store_created_at_idx`. ✅

## 4. Security

- **SEC-1 (MUST)** Set security response headers on every route — via `next.config.ts`
  `headers()` or middleware:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or a frame-ancestors CSP)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (lock down camera/mic/geo you don't use)
  - `Content-Security-Policy` (start report-only, then enforce; nonce-based for scripts)
  ✅ both repos now set the five static headers (enforced) + CSP in **report-only**
  mode in `next.config.ts` `headers()`. Promote CSP to enforcing after validating
  against real traffic.
- **SEC-2 (SHOULD)** `poweredByHeader: false` in `next.config.ts` (drop the `X-Powered-By`
  fingerprint). ✅ (both now set it)
- **SEC-3 (MUST)** Validate **all** external input with a schema (Zod) at the boundary —
  server actions, route handlers, webhooks. Schemas live in one place, never inline.
  _Ref:_ `lib/validations/*`. ✅
- **SEC-4 (MUST)** Server-authoritative authz on every mutation (RBAC/permission check);
  client-side checks are UX only. _Ref:_ `auth.api.hasPermission(...)` + the RBAC guard test. ✅
- **SEC-5 (MUST)** Auth hardening: httpOnly + Secure + SameSite cookies, CSRF protection,
  server-side session validation. (Better Auth handles most; verify the config.) ✅
- **SEC-6 (MUST, pre-prod)** Distributed rate limiting on abuse-prone public surfaces
  (login, signup, password reset, self-enroll/checkout, uploads, enumeration endpoints).
  In-memory limiters are useless on a serverless fleet — use Upstash Redis / Vercel KV.
  Better Auth's DB-backed limiter covers auth endpoints. ❌ (gp-learning removed its in-memory one; reintroduction deferred)
- **SEC-7 (MUST)** Webhooks: verify the provider signature **before** parsing the body,
  and dedupe deliveries with an idempotency table (`UNIQUE(provider, externalId)` +
  `ON CONFLICT DO NOTHING`). _Ref:_ `multi-ecommerce/app/api/webhooks/mercadopago/[storeId]/route.ts`. ✅
- **SEC-8 (SHOULD)** Encrypt third-party secrets at rest (payment tokens, API keys stored
  per-tenant) — app-level AES-GCM or DB column encryption. ⚠️ (ecommerce roadmap §2.1, deferred)
- **SEC-9 (SHOULD)** Dependency scanning: Dependabot or Renovate + `pnpm audit` (or
  Snyk/socket) gated in CI. Patch known CVEs on a cadence. ✅ both now have
  `.github/dependabot.yml` + a `pnpm audit --prod` CI step (informational until the
  transitive backlog clears, then flip to a hard gate).
- **SEC-10 (MAY)** `/.well-known/security.txt` with a disclosure contact once you have
  real users.
- **SEC-11 (MUST)** Never log secrets/PII. The logger's structured `context` is for IDs,
  not tokens or full payment objects.

## 5. Observability

- **OBS-1 (MUST)** A single structured-logging abstraction (`logger.info/warn/error`) that
  call sites use — so swapping the backend (console → Sentry/Datadog) touches one file.
  _Ref:_ `lib/logger.ts` in both repos. ✅
- **OBS-2 (MUST)** Error tracking wired in production (Sentry `@sentry/nextjs`): captures
  unhandled + handled errors, source maps, release tagging. Needs `app/global-error.tsx`.
  ⚠️ (logger is swap-ready in both; Sentry not yet installed — needs the account/DSN)
- **OBS-3 (SHOULD)** Product/web-vitals analytics (`@vercel/analytics`) and **Speed
  Insights** (`@vercel/speed-insights`) in the root layout. ⚠️ (analytics wired in gp-learning; ecommerce pending install; Speed Insights neither)
- **OBS-4 (SHOULD)** A health/liveness endpoint (`/api/health`) that checks DB
  connectivity — for uptime monitors and load balancers. Pin it to the Node runtime.
  _Ref:_ `gp-learning/app/api/health/route.ts`, `multi-ecommerce/app/api/health/route.ts`. ✅ (both now)
- **OBS-5 (SHOULD)** Alert on the things that silently rot: dead-lettered async events,
  stuck queues, webhook failures. Expose counts the monitor can alarm on. _Ref:_ the outbox
  drain returns `deadLetters` and `warn`s when non-zero. ✅
- **OBS-6 (MAY)** Uptime monitoring (Better Stack / Checkly / UptimeRobot) hitting the
  health endpoint.
- **OBS-7 (MAY)** Distributed tracing (OpenTelemetry) once you have multiple services.

## 6. Reliability & async work

- **REL-1 (MUST)** Side effects that must not be lost (emails, downstream calls) go through
  a **transactional outbox** — the event commits in the same DB transaction as the
  business write, a dispatcher delivers it after commit with retry/backoff/dead-letter.
  Fire-and-forget `waitUntil` can silently drop work. _Ref:_ `lib/events/{emit,dispatcher,consumers}.ts`
  in both repos. ✅
- **REL-2 (MUST)** Idempotency keys on create/charge operations so a client retry can't
  double-create. _Ref:_ `createOrder` idempotency-key path. ✅
- **REL-3 (SHOULD)** Background work that survives the response uses `waitUntil`
  (`@vercel/functions`); wrap transient ops in retry-with-backoff. _Ref:_ `lib/background.ts`. ✅
- **REL-4 (SHOULD)** At-least-once delivery → consumers are idempotent (dedup keys). ✅
- **REL-5 (SHOULD)** Set `maxDuration` (and memory) on long-running route handlers/actions;
  the serverless default cap will truncate them otherwise.

## 7. Scheduled work (cron)

- **CRON-1 (MUST, if any periodic work)** Declare crons in `vercel.json` `crons[]` pointing
  at bearer-guarded route handlers. _Ref:_ `vercel.json` in both repos. ✅
- **CRON-2 (MUST)** Authenticate cron endpoints. Vercel injects `Authorization: Bearer
  $CRON_SECRET` (only when `CRON_SECRET` is set); the handler must check a secret and
  503/401 otherwise. _Ref:_ `app/api/cron/*` + `app/api/outbox/drain`. ✅
- **CRON-3 (MUST)** Cron handlers pin `runtime = "nodejs"` (the DB driver isn't
  Edge-compatible) and `dynamic = "force-dynamic"`. ✅
- **CRON-4 (NOTE)** Sub-daily schedules require the **Vercel Pro** plan (Hobby = daily
  only). Budget for it if you rely on frequent drains/sweeps.
- **CRON-5 (SHOULD)** Every queue needs a **sweeper** for rows stranded mid-processing
  (a worker that died), plus a reliability **drain** separate from the post-commit kick.
  _Ref:_ `/api/cron/sweep-outbox` + `sweepStuck`. ✅

## 8. Next.js app conventions

- **NEXT-1 (MUST)** Error boundaries: `app/error.tsx` (route-level) **and**
  `app/global-error.tsx` (catches root-layout errors; Sentry hooks here) **and**
  `app/not-found.tsx`. ✅ (both now have all three)
- **NEXT-2 (SHOULD)** `loading.tsx` / Suspense boundaries on slow segments for streaming UX. ❌
- **NEXT-3 (MUST)** SEO surface: `app/robots.ts`, `app/sitemap.ts` (or per-segment
  sitemaps), `metadata` exports, Open Graph. _Ref:_ `app/robots.ts`, `app/(store)/[slug]/sitemap.ts`. ✅
- **NEXT-4 (MUST)** Respect the server/client boundary: `import "server-only"` on data and
  secret-bearing modules; client-bound code uses public/safe view types, never raw DB
  rows. _Ref:_ the `Public*`/`*Safe` boundary + guard test. ✅
- **NEXT-5 (SHOULD)** Configure `images.remotePatterns` for every external image host
  (allowlist, not wildcard). _Ref:_ `next.config.ts`. ✅
- **NEXT-6 (SHOULD)** Choose Edge vs Node runtime deliberately and document it. DB-backed
  middleware/routes run on Node (Neon driver + `ws` are Node-only). _Ref:_ `proxy.ts` note. ✅
- **NEXT-7 (MUST)** Auth/host-rewrite middleware lives in the project's middleware entry
  (`proxy.ts` here). _Ref:_ both `proxy.ts`. ✅

## 9. CI/CD

- **CI-1 (MUST)** On every PR: install → lint → typecheck → test. Block merge on red.
  _Ref:_ `.github/workflows/ci.yml`. ✅
- **CI-2 (SHOULD)** Build verification in CI (with dummy env if the env validates eagerly).
  _Ref:_ `gp-learning/.github/workflows/ci.yml`. ⚠️ (gp builds in CI; ecommerce skips it — needs a real DB)
- **CI-3 (MUST)** No real secrets in CI logs; CI uses dummy/placeholder env. ✅
- **CI-4 (SHOULD)** Branch protection on the default branch (required checks, no direct push).
- **CI-5 (SHOULD)** Enable **Vercel Deployment Protection** on preview deployments (don't
  expose unreleased work + preview env publicly).
- **CI-6 (MAY)** PR template + a "spec/docs updated?" nudge. _Ref:_ `gp-learning/.github/`. ⚠️

## 10. Testing

- **TEST-1 (MUST)** Unit tests for pure helpers (money math, backoff, label builders).
  _Ref:_ `lib/**/*.test.ts`. ✅
- **TEST-2 (SHOULD)** Integration tests against a real Postgres (testcontainers) for
  transactions, races, and cross-tenant scenarios the type system can't reach. _Ref:_
  `tests/integration/*`. ✅
- **TEST-3 (SHOULD)** Architecture/guard tests that fail the build when an invariant is
  violated (tenant isolation, RBAC, action-result shape, doc/link integrity). _Ref:_
  `lib/architecture-invariants.test.ts`. ⚠️
- **TEST-4 (MAY)** E2E (Playwright) on the critical happy paths (signup, checkout/enroll).

## 11. Docs & process

- **DOC-1 (MUST)** `README.md`: what it is, how to run, env setup, deploy.
- **DOC-2 (SHOULD)** Domain docs + an invariants/constraints catalog with stable IDs; docs
  updated in the same change as the code. The full system — confidence levels, citation
  tests, generated specs — is in [agentic-coding.md](./agentic-coding.md). _Ref:_ `docs/` in
  both repos.
- **DOC-3 (SHOULD)** ADRs for significant, hard-to-reverse decisions.
- **DOC-4 (MUST)** A pre-deploy checklist in the repo (env set, migrations run, secrets
  per-env, canonical domain + OAuth redirect, monitoring on). _Ref:_ `gp-learning/docs/deployment.md` §7.

---

## Quick pre-launch gate (the short list)

Copy this into each project's deploy doc and check it before go-live:

- [ ] Env validated at boot; `.env.example` committed; secrets per-environment.
- [ ] Migrations run against the unpooled URL; dev creds can't reach prod DB (DB-4).
- [ ] **Security headers set (SEC-1)** + `poweredByHeader:false`.
- [ ] Input validated at every boundary; authz server-authoritative; rate limiting on abuse surfaces.
- [ ] Webhooks: signature verified + idempotent.
- [ ] Error tracking live (Sentry + `global-error.tsx`); health endpoint; dead-letter alerting.
- [ ] Outbox for must-not-lose side effects; idempotency keys on creates.
- [ ] `vercel.json` crons authed; Pro plan if sub-daily; sweeper present.
- [ ] `error.tsx` + `global-error.tsx` + `not-found.tsx`; robots + sitemap + metadata.
- [ ] CI green (lint/typecheck/test); branch protection; preview deployment protection.
- [ ] Dependabot/Renovate + `pnpm audit` clean.
- [ ] README + deploy checklist current.

---

## Concepts worth adding to the factory knowledge base

Beyond this checklist, these deserve their own standards docs (see
[README.md](./README.md) for the list). High-leverage additions:

- **Feature flags / kill switches** — ship dark, roll out gradually, disable a broken
  feature without a redeploy.
- **Data privacy & compliance** — PII classification, retention/TTL, GDPR + AR Ley 25.326,
  data-subject requests, audit logs, cookie consent.
- **Accessibility (WCAG 2.2 AA)** — a legal and quality baseline, not a nice-to-have.
- **Internationalization** — even if AR-only now, decide the locale/timezone/currency
  strategy up front (you already use integer cents + `date-fns-tz` — codify it).
- **Performance budgets** — Core Web Vitals targets + bundle-size budgets enforced in CI.
- **Incident response & runbooks** — severity levels, on-call, postmortems.
- **Backup & disaster recovery** — RPO/RTO targets, tested restores.
- **Cost guardrails** — Vercel/Neon usage alerts so a runaway cron or query doesn't
  surprise you on the invoice.
- **Supply-chain security** — lockfile integrity, `pnpm` `onlyBuiltDependencies` allowlist,
  provenance/SBOM as you scale.
- **Secrets management** — a vault (Vercel env is fine early; Doppler/Infisical later),
  rotation policy.
- **Multi-tenancy patterns** — if tenancy is common in your products, codify the
  "filter-is-the-boundary" model as a reusable standard.
