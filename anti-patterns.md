# Anti-patterns

Wrong-but-plausible moves agents (and humans) make when building with this factory. Each is a
real one caught while dogfooding a bootstrap. The rule: **one correction → one entry** (and a
guard, when it can be automated). Keep these generalized — no project names.

> How to use: skim this before a bootstrap, and add to it after one. An entry earns its place
> by having burned someone.

---

### AP-1 — A green scope guard treated as "access is correct"
**Wrong:** the ownership/tenant guard passes (every `data/*` fn references its scope id), so
the access rule is assumed correct and shipped.
**Why it's plausible:** the guard is the loudest signal, and it *is* green.
**Reality:** the guard proves the filter's *shape* (a scope id is referenced), not its
*logic*. A real bug shipped this way — a subscription branch granted access to **unpublished**
content because it returned early before checking course state. Static guards can't see that.
**Right pattern:** for every access/authorization invariant, write an **integration test**
(testcontainers) that asserts the negative case — user B cannot reach user A's / unpublished /
unpaid content — across *every* branch of the rule. The guard is necessary, not sufficient.

### AP-2 — Hand-writing the framework's base tree
**Wrong:** the agent writes `package.json`, config, and the app skeleton by hand instead of
running the framework's official CLI.
**Why it's plausible:** it feels faster and the result compiles.
**Reality:** you silently drift from the framework's current defaults and structure, and miss
changes between majors — debt that surfaces at the next upgrade.
**Right pattern:** scaffold with the official CLI first (`create-next-app` / `create-astro` /
`create-hono`), pin versions, *then* layer the standards on top. See the scaffold steps in
[bootstrap-interactive.md](./bootstrap-interactive.md).

### AP-3 — Defaulting the UI language to English silently
**Wrong:** the app ships in English because no one asked; the user wanted another locale.
**Why it's plausible:** English is the library/default assumption everywhere.
**Reality:** language shapes every string; retrofitting copy + locale later is tedious.
**Right pattern:** confirm the **primary locale** whenever there's a UI (Tier-1 question), and
ask "multilingual?" separately. Never assume English.

### AP-4 — Deriving the project name without confirming it
**Wrong:** the bootstrap derives a folder name from the description and scaffolds with it.
**Why it's plausible:** a kebab-case name is trivially derivable.
**Reality:** the name is the user's call, not inferable; renaming a scaffolded tree is friction.
**Right pattern:** propose, then **confirm** (Q0) before writing anything.

### AP-5 — Leaving Better Auth's rate limiter at its in-memory default
**Wrong:** auth rate limiting is "on" (Better Auth's built-in), so it's considered handled.
**Why it's plausible:** the limiter *is* enabled in production by default.
**Reality:** it defaults to an **in-memory** store — a per-instance `Map` on a serverless
fleet, reset on cold start. The real ceiling is far above the configured limit.
**Right pattern:** set `rateLimit.storage = "database"` (counters in Postgres); use Upstash for
custom surfaces, fail-open. See [security.md](./security.md).

### AP-6 — Silently capping scope (top-N, "applied the rest")
**Wrong:** the bootstrap applies "everything else" or defers items without naming them.
**Why it's plausible:** the deferral table is long and boring.
**Reality:** a MUST skipped in silence reads as "covered" — the standard didn't stick.
**Right pattern:** the deferral table names **every** un-applied MUST/SHOULD with a one-line
reason (deferred / not-applicable / needs-a-decision). Silence is a smell.

### AP-7 — Auditing by inference instead of inspection
**Wrong:** an audit marks an item GAP because it wasn't seen in a directory listing or a quick
scan — without opening the file to confirm.
**Why it's plausible:** a fast pass over a big repo, and "absent" is the default assumption.
**Reality:** false GAPs are worse than misses — they send someone to "fix" what already works.
A real audit of art-lms wrongly flagged CLAUDE.md, `lib/validations/`, idempotency keys, and
ownership indexes as missing; all four existed.
**Right pattern:** open the file/dir and confirm before calling GAP; if you couldn't verify,
mark **unknown**, never gap. Same rule as the spec's "mark UNKNOWN, never invent"
([audit-app](./.claude/commands/audit-app.md)).

### AP-8 — Using the deprecated `middleware.ts` on Next 16
**Wrong:** a Next 16 app puts auth/request interception in `middleware.ts` with an exported
`middleware()` function.
**Why it's plausible:** `middleware.ts` was the convention for years and most examples/snippets
still show it.
**Reality:** Next.js **v16.0.0 deprecated and renamed `middleware` → `proxy`**. On Next ≥16 the
file is `proxy.ts` and the function is `proxy()`. (Caught in a real bootstrap — the app used
`middleware.ts` because the baseline's NEXT-7 still said so; both are fixed now.)
**Right pattern:** use `proxy.ts` (NEXT-7). Migrate with `npx @next/codemod@canary
middleware-to-proxy .`. And prefer auth inside Server Actions/route handlers over proxy.

### AP-9 — Modeling only the infra invariants, missing the domain ones
**Wrong:** the bootstrap nails tenant/owner isolation, authz, and money (the invariants the
factory's guards/baseline cover) and ships — with no guard or test for the domain's *own*
critical rules.
**Why it's plausible:** every checklist the factory ships is infra-level; domain invariants
aren't in any of them, so nothing prompts for them.
**Reality:** a booking app with no anti-double-booking rule, paid tiers with no entitlement
gating (only charging), or scheduling with no timezone discipline is broken regardless of green
infra guards. Real case: the turnos-app decision sheet had tenant/authz/money but no
double-booking, no entitlement gating, and no timezone invariant — none were prompted.
**Right pattern:** in the scaffold's "verify the rules" step, explicitly enumerate the DOMAIN
invariants — **concurrency** (e.g. `EXCLUDE` constraint for overlapping slots), **uniqueness**,
**state-machine transitions**, **time/timezone**, **plan entitlements/quotas** — each with an
integration test. Ask: "what must always hold in THIS domain that a generic guard can't see?"

### AP-10 — Hand-rolling the DB client (and forgetting `ws`)
**Wrong:** each app writes its own `drizzle/db.ts` from scratch.
**Why it's plausible:** it's a small file — "just wire drizzle to the URL."
**Reality:** four real apps drifted four ways — one shipped **without
`neonConfig.webSocketConstructor = ws`** (Neon fails on Vercel's Node runtime, which has no
global WebSocket), one **inverted the host sniff**, one **didn't pass `schema`** (no typed
`db.query`); location and `DB`/`Tx` types diverged too. A subtly-wrong client is a production
outage or a silent type regression.
**Right pattern:** copy [recipes/neon-drizzle-client](./recipes/neon-drizzle-client/) (DB-1) —
the merge of the best of all four, with the mandatory `ws` line. Keep `ws` in `dependencies`.

### AP-11 — Building forms without shadcn's `Field`
**Wrong:** forms hand-roll `label` + input + error markup, or use the older `Form`/`FormField`
wrappers, instead of shadcn's `Field` family.
**Why it's plausible:** the older `Form` pattern was the shadcn convention for years and most
tutorials still show it; hand-rolling "just works."
**Reality:** inconsistent spacing/accessibility across forms, and you re-implement what `Field`
gives free (label association, description, error wiring). Caught in a real app whose forms
skipped `Field`.
**Right pattern:** `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup`
wired to react-hook-form + `zodResolver` (`FieldError` accepts RHF errors); schemas in
`lib/validations/*`. See [stacks/full-stack-web.md](./stacks/full-stack-web.md).

### AP-12 — A build-time route that queries the DB without opting out
**Wrong:** `app/sitemap.ts` (or `robots.ts`) calls the data layer; Next pre-renders it at
build, runs the query against CI's dummy `DATABASE_URL`, and the build exits 1.
**Why it's plausible:** it works locally (you have a real DB on `DATABASE_URL`), the fix is one
line, and every other page is already dynamic — so the sitemap is the *only* build-time DB hit.
**Reality:** green build locally, red in CI **every time** (CI's build runs with a dummy DB on
purpose — testcontainers are already torn down). Caught in two real repos at the `pnpm build` step.
**Right pattern:** `export const dynamic = "force-dynamic"` (always fresh — best for a catalog
sitemap) or `export const revalidate = N` (ISR). [seo.md](./seo.md) §2; enforced by the
**build-time DB safety** guard in [CATALOG.md](./skeleton/tests/architecture/CATALOG.md).

### AP-13 — Node pin out of sync with pnpm (CI-only failure)
**Wrong:** `engines.node: ">=20"` / `.nvmrc 20` alongside `packageManager: pnpm@10.x`.
**Why it's plausible:** it works locally (you have a newer Node installed), and `20` was the
default Node pin for years.
**Reality:** pnpm **≥10.13 requires Node ≥22.13**. CI reads `.nvmrc`, installs Node 20, and
`pnpm install` aborts with `This version of pnpm requires at least Node.js v22.13` — green
locally, red in CI, every time. Hit a real repo.
**Right pattern:** pin Node to the **22** LTS line (`engines.node: ">=22.13"`, `.nvmrc 22`);
when you bump pnpm, re-check its Node floor and move both together. (REPO-2 / TOOL-6.)

<!-- Append new anti-patterns below as dogfooding surfaces them. -->
