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

<!-- Append new anti-patterns below as dogfooding surfaces them. -->
