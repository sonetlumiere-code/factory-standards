# Factory Standards

The engineering baseline for every project built by the software factory. These
are **agent-facing** docs: at the start of a new project, point your coding agent
at the relevant file(s) and tell it to treat them as binding defaults.

> Usage with a coding agent:
> _"Before scaffolding, read `factory-standards/vercel-nextjs-production-baseline.md`
> and apply every item marked **MUST** for this stack. List any you're deferring and why."_

## Documents

| Doc | Status | Covers |
| --- | --- | --- |
| [vercel-nextjs-production-baseline.md](./vercel-nextjs-production-baseline.md) | ✅ ready | Production checklist for any Next.js app deployed to Vercel — env, DB (incl. Neon pooled-vs-direct), security, observability, reliability, CI/CD, Vercel specifics |
| [tooling-config.md](./tooling-config.md) | ✅ ready | Exact Prettier / ESLint (flat + custom guards) / TypeScript / EditorConfig / scripts configs to start every project with |
| [agentic-coding.md](./agentic-coding.md) | ✅ ready | Docs-as-executable-guardrails: how to structure a codebase so an AI agent stays correct and can't drift — plus ideas to improve agentic coding |

## Documents to add next (your knowledge base roadmap)

These are the natural companions — each one a standalone doc an agent can be pointed at.
Suggested order of authoring is roughly top-to-bottom (foundations first).

- **`stack.md`** — your canonical stack and *why* (Next.js App Router, React, TS strict,
  Postgres/Neon, Drizzle, Better Auth, Tailwind, shadcn, Resend, Cloudinary, pnpm). Pin
  versions or version ranges. The "we always reach for X" doc.
- **`coding-conventions.md`** — file naming, folder layout, the data-layer / server-action
  contract, validation-at-the-boundary rule, naming, comment style. (Your two projects'
  `CLAUDE.md` / `AGENTS.md` are the seed for this.)
- **`security-baseline.md`** — expand §Security below into its own doc: threat model,
  authn/authz, secrets, headers/CSP, dependency hygiene, OWASP Top 10 mapping, pentest
  cadence, responsible-disclosure (`security.txt`).
- **`observability-baseline.md`** — logging schema, error tracking, metrics, tracing,
  dashboards, SLOs, alert routing, on-call.
- **`testing-strategy.md`** — the test pyramid for the stack: unit (pure helpers),
  integration (real Postgres via testcontainers), architecture/guard tests, e2e
  (Playwright), what each layer is responsible for, coverage expectations.
- **`data-and-privacy.md`** — data classification, PII handling, retention/TTL, GDPR/AR
  (Ley 25.326) basics, backups + restore drills, audit logs, data-subject requests.
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
- **Reference implementation per item.** Point at a real file in a real project — recipes
  drift, code doesn't. (`multi-ecommerce` and `gp-learning` are the current references.)
- **Keep them agent-readable.** Short rationale, concrete pointer, no fluff.
