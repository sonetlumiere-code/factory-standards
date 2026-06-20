# Interactive Bootstrap

The real invocation. Instead of asking you to fill placeholders in a static prompt,
the agent **asks a short, adaptive questionnaire first**, maps each answer to
pre-established factory decisions, prints a **decision sheet**, and only then scaffolds.
The static [bootstrap-prompt.md](./bootstrap-prompt.md) stays as the fallback (use it
when you already know every choice and want to paste one block).

This file is written **for the agent** running a bootstrap. If you're a human, just run
`/bootstrap-app <description>` (or paste the [activation block](#activation-block) below)
and answer the questions.

---

## How the agent runs this

1. **Read the standards first** — `README.md`, `stacks/`, `tooling-config.md`,
   `vercel-nextjs-production-baseline.md`, `agentic-coding.md`, `skeleton/`, `recipes/`.
2. **Ask the questionnaire** (below) with the `AskUserQuestion` tool — **adaptively**:
   skip any question whose answer is already implied by the app description or by an
   earlier answer (see the *Skip when* notes). Never ask something you can already infer;
   state the inferred value in the decision sheet instead.
3. **Map answers → decisions** using the mapping table.
4. **Print the decision sheet** and STOP for confirmation.
5. **Scaffold** following the [scaffold steps](#scaffold-steps-after-confirmation).

> Golden rule: match effort to the app. Every "no" prunes a branch — don't scaffold
> auth, payments, SEO, or an outbox the app didn't ask for.

---

## The questionnaire (adaptive)

Ask in this order. Each question lists its options and when to **skip** it.

### Q0 — Project name *(always confirm — never assume)*
Derive a kebab-case folder name from the description and **confirm it** with the user
(`./<name>`). The name is the user's call, not inferable from the description — propose
your best guess but let them override before anything else. Use the confirmed name for the
folder and the `<Project>` placeholders in the skeleton.

### Q1 — Archetype *(always ask, unless the description names it)*
Static site / landing · Full-stack web app · API-only / backend service.
- Picks the stack file in `stacks/` and which baseline items apply.
- **Prunes:** `static-site` → skip Q2 (tenancy) and Q4 (payments) unless the user adds
  an authenticated area (then it's really full-stack — say so and switch); `api-service`
  → skip Q5 (SEO, N/A — no public HTML).

### Q2 — Tenancy *(ask when there's a DB: full-stack or API)*
Single-admin · Single-tenant · Multi-tenant.
- Selects the scope guard from `skeleton/tests/architecture/` (IDEA #2) and the wording
  of CLAUDE.md Rule 1 / INV-1.
- **Skip when:** static site with no DB → N/A.

### Q3 — Auth *(ask for full-stack or API)*
None · Yes.
- Full-stack "Yes" → Better Auth + the server-action authorization guard.
- API "Yes" → machine auth (hashed API keys or OAuth/JWT) + the same authz guard.
- **Skip when:** static site (a static site that needs login is full-stack — graduate it).

### Q4 — Payments *(ask only if Q3 = Yes, or the app clearly sells something)*
None · Simulated · Real gateway.
- **Skip when:** no auth and nothing transactional.

### Q5 — Public-facing pages / SEO *(ask for full-stack)*
Yes · No.
- Static site → always Yes (skip the question, it's the point). API → always No (N/A).

### Q6 — Background / scheduled work *(ask for full-stack or API)*
None · Fire-and-forget · Scheduled (cron) · Must-not-lose side effects.
- **Skip when:** static site with no server runtime.

---

## Mapping: answer → pre-set factory decisions

| Question | Answer | Pre-set decisions |
| -------- | ------ | ----------------- |
| **Archetype** | Static site | Stack: [stacks/static-site.md](./stacks/static-site.md) (Astro). Baseline: headers/deps/CI apply; DB-* and auth SEC-* → N/A. SEO is in-scope. |
| | Full-stack web | Stack: [stacks/full-stack-web.md](./stacks/full-stack-web.md) (Next.js). Full data spine + baseline apply. |
| | API service | Stack: [stacks/api-service.md](./stacks/api-service.md) (Hono). Data spine applies; UI/SEO out. Per-route headers + CORS allowlist. |
| **Tenancy** | Single-admin / Single-tenant | Keep the **ownership-isolation** guard block (`OWNER_ID`); delete the tenant block. CLAUDE.md Rule 1 / INV-1 use the ownership variant. No `tenantId` column. |
| | Multi-tenant | Keep the **tenant-isolation** guard block (`TENANT_ID`); delete the ownership block. Scope every `data/*` query by tenant id; index `(tenant_id, …)` (DB-7). |
| **Auth** | None | No Better Auth; the authorization guard stays inert. Document why in the deferral table. |
| | Yes (full-stack) | Better Auth (≥1.4.17); `hasPermission(...)` on every mutation; the authz guard activates; SEC-5 auth hardening. |
| | Yes (API) | Hashed API keys or OAuth/JWT; verify on every route; authz guard activates. |
| **Payments** | None | Nothing. |
| | Simulated | Integer-cents money helpers (`toCents`/`fromCents`); a fake provider behind the same interface; no real webhooks. |
| | Real gateway | Money in cents; **transactional outbox** ([recipes/transactional-outbox](./recipes/transactional-outbox/)); webhook signature verify + idempotency (SEC-7); secret encryption (SEC-8); rate-limit checkout (SEC-6). |
| **SEO** | Yes | Follow [seo.md](./seo.md): metadata + OG, `robots.ts`/`sitemap.ts` (+ the DB-at-build `force-dynamic` gotcha), JSON-LD, canonical URLs, Core Web Vitals budget. |
| | No / N/A | Skip SEO entirely. |
| **Background** | None | Nothing. |
| | Fire-and-forget | `@vercel/functions` `waitUntil` + retry-with-backoff. |
| | Scheduled | Vercel Cron (`vercel.json`) → bearer-guarded route handlers. |
| | Must-not-lose | The **transactional outbox** recipe (emit in-transaction; dispatcher with retry/dead-letter) + cron sweep. |

> Recipes and optional docs are **pulled in only when an answer selects them**. A "None"
> answer means that surface does not appear in the scaffold.

---

## Decision sheet (print this, then STOP)

Render the resolved choices as a table before writing any code, e.g.:

```
Bootstrap plan for <app-name>  (archetype: <…>)
─────────────────────────────────────────────
Project / folder  ./<app-name>   (confirmed with the user — Q0)
Stack file        stacks/<archetype>.md
Tenancy           <single-admin | single-tenant | multi-tenant | N/A>  → <ownership|tenant> guard
Auth              <none | Better Auth | API keys/JWT>
Payments          <none | simulated | real gateway>  → <outbox? webhooks? cents>
Public pages/SEO  <yes → seo.md | no | N/A>
Background work   <none | waitUntil | cron | outbox>
Recipes pulled    <none | transactional-outbox | …>
Baseline: NOT doing yet → <table of deferred/N-A MUST/SHOULDs with reasons>
```

Wait for a "go" before scaffolding. If the user corrects a row, update it and re-print.

---

## Scaffold steps (after confirmation)

Run the same disciplined scaffold the static prompt describes — now parameterized by the
decisions above:

1. **Tooling** — exactly per [tooling-config.md](./tooling-config.md): Prettier, ESLint
   flat config with the `process.env` guard, `tsconfig` strict + `noUncheckedIndexedAccess`,
   `.editorconfig`, standard scripts, engine + `packageManager` pins, `.nvmrc`.
2. **Agentic docs** — copy `skeleton/` in. Fill `CLAUDE.md` + `docs/spec/` for THIS app
   with real `path › symbol` citations (not placeholders). **Keep only the scope guard the
   tenancy answer selected**; adapt its token + the permission-check matcher. Wire `tests/**`
   into the runner; get every guard GREEN.
3. **Baseline** — apply every applicable MUST in
   [vercel-nextjs-production-baseline.md](./vercel-nextjs-production-baseline.md). Then print
   the deferral table: each MUST/SHOULD not done yet, with a one-line reason
   (deferred / not-applicable-for-this-archetype / needs-a-decision).
4. **Recipes & optional docs** — pull in only what the answers selected (outbox, SEO, …).

Acceptance criteria are the same as in [bootstrap-prompt.md](./bootstrap-prompt.md):
tooling matches, guards green with real citations, a deferral table exists, and at least
one project-specific architecture guard is authored.

---

## Activation block

Paste this into a fresh session (started from where the new app should be created) if you
don't have the slash command installed:

```
Bootstrap a new app here. Description: <one paragraph: what it does, the core domain
entity, the 2–3 flows that matter>.

Treat /<absolute-path>/factory-standards/ as binding defaults. Follow its
bootstrap-interactive.md: read the standards, ask me the adaptive questionnaire, map my
answers to the pre-set decisions, print the decision sheet, and STOP for my go before
scaffolding.
```
