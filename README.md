# Factory Standards

The engineering baseline for every project built by the software factory. These
are **agent-facing** docs: at the start of a new project, point your coding agent
at the relevant file(s) and tell it to treat them as binding defaults.

> Usage with a coding agent: run `/bootstrap-app <description>` (or follow
> [bootstrap-interactive.md](./bootstrap-interactive.md)) in a fresh session to scaffold a
> new app from these standards. To audit an existing repo, run `/audit-app` (see
> [.claude/commands/audit-app.md](./.claude/commands/audit-app.md)) for a gap report by ID.

## Documents

| Doc | Status | Covers |
| --- | --- | --- |
| [stacks/](./stacks/) | ✅ ready | The canonical stacks, **keyed by archetype** — a shared spine (language, validation, tooling, data) plus per-archetype files for static-site (Astro), full-stack web (Next.js), API service (Hono), and desktop (Tauri). Start at [stacks/README.md](./stacks/README.md) |
| [bootstrap-interactive.md](./bootstrap-interactive.md) | ✅ ready | **The invocation** — an adaptive questionnaire (archetype, language, tenancy, auth, payments, SEO, background) that maps answers → pre-set factory decisions, prints a decision sheet, then scaffolds. Run via `/bootstrap-app` |
| [`/audit-app`](./.claude/commands/audit-app.md) | ✅ ready | Slash command to audit an existing app against all standards — gap report by ID + severity, uses `.factory-version` to separate gaps from drift; `--fix` applies safe in-repo gaps |
| [vercel-nextjs-production-baseline.md](./vercel-nextjs-production-baseline.md) | ✅ ready | Production checklist for any Next.js app deployed to Vercel — env, DB (incl. Neon pooled-vs-direct), security, observability, reliability, CI/CD, Vercel specifics |
| [tooling-config.md](./tooling-config.md) | ✅ ready | Exact Prettier / ESLint (flat + custom guards) / TypeScript / EditorConfig / scripts configs to start every project with |
| [seo.md](./seo.md) | ✅ ready | Conditional SEO guide (public pages only): metadata + OG, robots/sitemap + the DB-at-build `force-dynamic` gotcha, JSON-LD, canonical, hreflang. Next.js + Astro |
| [security.md](./security.md) | ✅ ready | The "how" behind the `SEC-*` baseline: rate limiting (auth→Postgres / custom→Upstash, fail-open, IP+identifier keying), CSP, webhooks, secret encryption, audit log |
| [agentic-coding.md](./agentic-coding.md) | ✅ ready | Docs-as-executable-guardrails: how to structure a codebase so an AI agent stays correct and can't drift — plus ideas to improve agentic coding |
| [anti-patterns.md](./anti-patterns.md) | ✅ ready | Wrong-but-plausible moves caught while dogfooding bootstraps, each with the right pattern — skim before a bootstrap, append after one |
| [VERSIONING.md](./VERSIONING.md) | ✅ ready | How the paved road is versioned (semver-ish tags) and how each app records the version it was built against (`.factory-version`) |
| [skeleton/](./skeleton/) | ✅ ready | Copy-paste starter for the agentic-docs system: agent door, `docs/spec/` layout + sample, and the guard tests (citation, catalog-integrity, scope-isolation [tenant or ownership]/authz) — verified green |
| [recipes/](./recipes/) | ✅ ready | Opt-in patterns to pull in when an app needs them (not in the core skeleton). First recipe: a drop-in transactional outbox (schema + dispatcher + cron + test) |

## Documents to add next (your knowledge base roadmap)

These are the natural companions — each one a standalone doc an agent can be pointed at.
Suggested order of authoring is roughly top-to-bottom (foundations first).

- **`coding-conventions.md`** — file naming, folder layout, the data-layer / server-action
  contract, validation-at-the-boundary rule, naming, comment style. (The skeleton's
  `CLAUDE.md` is the seed for this.)
- **`security-baseline.md`** — expand §Security below into its own doc: threat model,
  authn/authz, secrets, headers/CSP, dependency hygiene, OWASP Top 10 mapping, pentest
  cadence, responsible-disclosure (`security.txt`).
- **`observability-baseline.md`** — logging schema, error tracking, metrics, tracing,
  dashboards, SLOs, alert routing, on-call.
- **`testing-strategy.md`** — the test pyramid for the stack: unit (pure helpers),
  integration (real Postgres via testcontainers), architecture/guard tests, e2e
  (Playwright), what each layer is responsible for, coverage expectations.
- **`data-and-privacy.md`** — data classification, PII handling, retention/TTL, the
  data-protection law of your jurisdiction (e.g. GDPR), backups + restore drills, audit
  logs, data-subject requests.
- **`accessibility.md`** — WCAG 2.2 AA target, keyboard nav, focus management, semantic
  HTML, the skip-link pattern, automated a11y checks in CI.
- **`performance-budgets.md`** — Core Web Vitals targets, bundle-size budgets, image
  policy, caching/ISR strategy, when to use Edge vs Node runtime.
- **`ci-cd.md`** — pipeline stages, branch protection, preview/staging/prod promotion,
  release/versioning, rollback.
- **`incident-response.md`** — severity levels, runbooks, comms templates, postmortems.
- **`adr/`** — Architecture Decision Records template + index. One ADR per
  significant, hard-to-reverse choice.

## Conventions for these docs

- **Stable, citable IDs.** Give each requirement an ID (e.g. `SEC-3`, `OBS-1`) so code
  comments, PRs, and ADRs can reference it. Append-only; never renumber.
- **MUST / SHOULD / MAY** (RFC-2119 sense) on every item so an agent knows what's
  non-negotiable vs. recommended.
- **Conventional location per item.** Name the standard file/path a requirement lives in
  (e.g. `lib/env/server.ts`) so an agent knows where it goes — recipes drift, code doesn't.
- **Keep them agent-readable.** Short rationale, concrete pointer, no fluff.
