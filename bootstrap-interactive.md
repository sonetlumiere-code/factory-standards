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
2. **Ask the questionnaire** (below) with the `AskUserQuestion` tool. It has three tiers:
   - **Tier 1 — always confirm.** Architecture/security decisions. Ask even if the
     description implies the answer — confirm it (don't silently infer the security model).
   - **Tier 2 — adaptive integrations.** Ask only if not already implied by the description
     or an earlier answer; each "no" prunes a branch. Ask the **capability, not the
     provider** — the stack already fixes the provider (email → Resend, uploads →
     Cloudinary; don't ask "Resend?").
   - **Tier 3 — defaults with a heads-up.** Don't ask; apply the default and show it in the
     decision sheet as overridable.
3. **Map answers → decisions** using the mapping table.
4. **Print the decision sheet** and STOP for confirmation.
5. **Scaffold** following the [scaffold steps](#scaffold-steps-after-confirmation).

> Golden rule: match effort to the app. Every "no" prunes a branch — don't scaffold
> auth, payments, email, uploads, SEO, or an outbox the app didn't ask for. Keep it to a
> handful of questions; lean on defaults for the rest (the way create-t3-app / create-next-app do).

---

## The questionnaire

### Tier 1 — always confirm (architecture & security)

**Q0 — Project name.** Derive a kebab-case folder name from the description and **confirm
it** (`./<name>`). The name is the user's call, not inferable — propose your best guess but
let them override before anything else. Use it for the folder and the `<Project>`
placeholders.

**Q1 — Archetype.** Static site / landing · Full-stack web app · API-only / backend service.
- Picks the stack file in `stacks/` and which baseline items apply.
- **Prunes:** `static-site` → skip tenancy, payments, email, uploads unless the user adds an
  authenticated area (then it's really full-stack — say so and switch); `api-service` →
  skip SEO (N/A — no public HTML).

**Q1b — Primary language / locale.** *(ask whenever there's a UI: static or full-stack)*
Confirm the language the UI and content ship in (e.g. `en-US`, `es-AR`). **Don't default to
English silently** — it's the user's call and it shapes every string. Then ask **multilingual?**
(see Q7): single-language → just set the locale + write copy in it; multilingual → i18n routing
+ hreflang + `next-intl`. Skip for `api-service` (no UI).

**Q2 — Tenancy / data isolation.** Single-admin · Single-tenant · Multi-tenant.
- **Always confirm** when there's a DB (full-stack or API) — even if the description says
  "not multi-tenant," confirm the exact mode. This is *the* security decision: it selects
  the scope guard in `skeleton/tests/architecture/` (IDEA #2) and the wording of
  CLAUDE.md Rule 1 / INV-1. An inferred-but-unconfirmed tenancy is a mis-placed guard.
- **Skip only when:** static site with no DB → N/A.

**Q3 — Auth & roles.** None · Yes (+ which roles).
- Full-stack "Yes" → Better Auth + the server-action authorization guard; capture the role
  set (e.g. `admin`, `member`).
- API "Yes" → machine auth (hashed API keys or OAuth/JWT) + the same authz guard.
- **Skip when:** static site (a static site that needs login is full-stack — graduate it).

### Tier 2 — adaptive integrations (ask if not implied; "no" prunes)

**Q4 — Payments.** None · Simulated · Real gateway.
- **Skip when:** no auth and nothing transactional.

**Q5 — Transactional email.** None · Yes (→ Resend).
- "Yes" → Resend. If a message must not be lost (receipts, account actions), wrap the send
  in the outbox (this can flip Q7 "Background" toward must-not-lose).
- **Skip when:** static site with no server runtime (use a posted endpoint / provider form
  instead — see [stacks/static-site.md](./stacks/static-site.md)).

**Q6 — File / media uploads.** None · Yes (→ Cloudinary).
- "Yes" → Cloudinary; allowlist its host in `next.config` `remotePatterns` (NEXT-5) and the
  CSP (SEC-1).
- **Skip when:** no user-supplied media.

**Q7 — Public pages / SEO** *(+ i18n)*. Yes · No · (multilingual?).
- "Yes" → follow [seo.md](./seo.md). Also ask **multilingual?** — if yes, add i18n routing +
  hreflang/`x-default` (see seo.md §5) and `next-intl`.
- Static site → always Yes (it's the point). API → always No (N/A).

**Q8 — Background / scheduled work.** None · Fire-and-forget · Scheduled (cron) · Must-not-lose.
- **Skip when:** static site with no server runtime.

### Tier 3 — defaults with a heads-up (don't ask; show in the sheet, overridable)

- **Error tracking → Sentry (OBS-2).** Add the `app/global-error.tsx` stub now; wire the DSN
  at deploy. Override to skip if the user objects.
- **Analytics → Vercel Analytics + Speed Insights (OBS-3).** On by default; deploy-time, no code.
- **Rate limiting → Upstash (SEC-6).** Derived from abuse-prone surfaces (login/checkout/
  self-enroll); apply pre-prod. Surface it as derived, not as a question.

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
| | Real gateway | **MercadoPago** (LATAM default) / **Stripe** (international) behind a `PaymentProvider` interface; money in cents; **transactional outbox** ([recipes/transactional-outbox](./recipes/transactional-outbox/)); webhook signature verify + idempotency (SEC-7); secret encryption (SEC-8); rate-limit checkout (SEC-6). |
| **Email** | None | Nothing. |
| | Yes | **Resend** wrapper in `lib/`. Wrap must-not-lose sends (receipts, account actions) in the outbox → may flip Background to must-not-lose. |
| **Uploads** | None | Nothing. |
| | Yes | **Cloudinary**; `next.config` `remotePatterns` host (NEXT-5) + CSP host (SEC-1). |
| **SEO** | Yes | Follow [seo.md](./seo.md): metadata + OG, `robots.ts`/`sitemap.ts` (+ the DB-at-build `force-dynamic` gotcha), JSON-LD, canonical URLs, Core Web Vitals budget. |
| | + multilingual | i18n routing + hreflang/`x-default` (seo.md §5) + `next-intl`. |
| | No / N/A | Skip SEO entirely. |
| **Background** | None | Nothing. |
| | Fire-and-forget | `@vercel/functions` `waitUntil` + retry-with-backoff. |
| | Scheduled | Vercel Cron (`vercel.json`) → bearer-guarded route handlers. |
| | Must-not-lose | The **transactional outbox** recipe (emit in-transaction; dispatcher with retry/dead-letter) + cron sweep. |
| **Defaults (Tier 3)** | applied unless overridden | Sentry stub now / DSN at deploy (OBS-2); Vercel Analytics + Speed Insights on (OBS-3); rate limiting on abuse-prone surfaces — auth→Postgres, custom→Upstash, pre-prod (SEC-6, [security.md](./security.md)). |

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
Language          <e.g. es-AR | en-US>   <single-language | multilingual → i18n>
Tenancy           <single-admin | single-tenant | multi-tenant | N/A>  → <ownership|tenant> guard
Auth & roles      <none | Better Auth (roles: …) | API keys/JWT>
Payments          <none | simulated | real gateway>  → <outbox? webhooks? cents>
Email             <none | Resend>   <→ outbox if must-not-lose>
Uploads           <none | Cloudinary>
Public pages/SEO  <yes → seo.md | no | N/A>   <i18n? hreflang>
Background work   <none | waitUntil | cron | outbox>
Defaults (Tier 3) Sentry stub (OBS-2) · Analytics on (OBS-3) · rate limiting (SEC-6)  [override?]
Recipes pulled    <none | transactional-outbox | …>
Baseline: NOT doing yet → <table of deferred/N-A MUST/SHOULDs with reasons>
```

Wait for a "go" before scaffolding. If the user corrects a row, update it and re-print.

---

## Scaffold steps (after confirmation)

Run the same disciplined scaffold the static prompt describes — now parameterized by the
decisions above:

0. **Scaffold with the framework's official CLI first**, then layer the standards on top —
   don't hand-write the base tree. Use `pnpm create next-app@latest <name>` (full-stack),
   `pnpm create astro@latest <name>` (static site), or `pnpm create hono@latest <name>`
   (API). This keeps the base structure and versions current with the framework; then pin
   exact versions and apply the steps below. Set the primary locale (Q1b) in the framework's
   i18n config as part of this step. Then **record the standards version** — write
   `.factory-version` at the app root from
   `git -C <factory-standards> describe --tags --always` + the date (see
   [VERSIONING.md](./VERSIONING.md)).
1. **Tooling** — exactly per [tooling-config.md](./tooling-config.md): Prettier, ESLint
   flat config with the `process.env` guard, `tsconfig` strict + `noUncheckedIndexedAccess`,
   `.editorconfig`, standard scripts, engine + `packageManager` pins, `.nvmrc`.
2. **Agentic docs** — copy `skeleton/` in. Fill `CLAUDE.md` + `docs/spec/` for THIS app
   with real `path › symbol` citations (not placeholders). **Keep only the scope guard the
   tenancy answer selected**; adapt its token + the permission-check matcher. **Compose the
   other guards from `tests/architecture/CATALOG.md`** that the answers call for (server-only
   for any data layer, action-result for the typed-result convention, etc.). Wire `tests/**`
   into the runner; get every guard GREEN.
3. **Baseline** — apply every applicable MUST in
   [vercel-nextjs-production-baseline.md](./vercel-nextjs-production-baseline.md). Then print
   the deferral table: each MUST/SHOULD not done yet, with a one-line reason
   (deferred / not-applicable-for-this-archetype / needs-a-decision).
4. **Recipes & optional docs** — pull in only what the answers selected (outbox, SEO, …).
5. **Verify the rules actually hold (not just that guards are green).** Static guards prove a
   rule's *shape*, not its *correctness* ([anti-patterns.md](./anti-patterns.md) AP-1). So:
   - For **every critical invariant** (access resolution, authorization, money), write an
     **integration test** (testcontainers) asserting the **negative** case — user B can't
     reach user A's / unpublished / unpaid data — across *every* branch of the rule.
   - Run an **adversarial review pass** ([agentic-coding.md](./agentic-coding.md) #9): a second
     agent prompted to *refute* the access/authz/money invariants against the code before
     declaring done.

Acceptance criteria (superset of [bootstrap-prompt.md](./bootstrap-prompt.md)):
tooling matches, guards green with real citations, a deferral table names every un-applied
MUST/SHOULD, at least one project-specific architecture guard is authored, **an integration
test exists for each critical invariant**, and the **adversarial review pass** ran clean.

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
