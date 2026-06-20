# Ideas in flight — factory-standards evolution

Backlog for the next work session. Goal: make factory-standards **maximally flexible**
— a bootstrap base for *any* app type the software factory builds, not just
multi-tenant Next.js apps.

## 1. Multi-stack by app type ✅ DONE

`stack.md` assumed one stack (Next.js full-stack). Now **stack-per-archetype** under
`stacks/`:

- **Static site / landing** → **Astro** (default). `stacks/static-site.md`.
- **Full-stack web app** → Next.js / Neon / Drizzle / Better Auth / Tailwind. `stacks/full-stack-web.md`.
- **API-only / backend service** → **Hono** + Drizzle/Neon, no UI. `stacks/api-service.md`.
- (later) mobile, CLI, etc.

Resolved to `stacks/<archetype>.md` (over one sectioned file), with `stacks/README.md`
as the chooser + shared spine (universal core + data spine). `stack.md` removed; the
bootstrap prompt + slash command now pick the archetype first.

## 2. Audit + remove the multi-tenant bias ✅ DONE

Done: the architecture guard now ships **two blocks** — tenant-isolation **and**
ownership-isolation (single-tenant: a user reads only their own rows), each inert
until its tokens appear. Teaching examples (CLAUDE.md Rule 1 → "Scope isolation",
INV-1) and the baseline/cross-refs reframed to "scope (tenant or ownership)", showing
both variants. Single-tenant / single-admin is now a first-class case.

Original notes — verify the repo isn't over-oriented to multi-tenant apps. Review:

- The baseline (DB-5 "tenant filter", etc.), the skeleton `CLAUDE.md` example rules, and
  especially the **tenant-isolation guard** in `skeleton/tests/architecture/`.
- Make **single-tenant / single-admin a first-class case**: when there's no tenant, the
  tenant-isolation guard becomes an **ownership** guard (a user reads only their own rows).
  The guard template should support both modes (configurable), not assume `tenantId`.
- Generally: anywhere "tenant" is assumed, make it conditional on the app's answers.

## 3. Interactive bootstrap (questionnaire → pre-set decisions) ✅ DONE

Done: [bootstrap-interactive.md](./bootstrap-interactive.md) is the primary invocation —
an **adaptive** questionnaire (each "no" prunes a branch) that maps answers → pre-set
factory decisions (archetype→stack #1, tenancy→guard #2, payments→outbox/webhooks,
SEO→#4, background→outbox/cron), prints a decision sheet, and stops for confirmation
before scaffolding. The slash command runs it; `bootstrap-prompt.md` is the static
fallback.

Original notes — replace/extend the fixed `bootstrap-prompt.md` so the agent **asks
questions first** and maps answers → pre-established factory decisions. Questions like:

- App type / archetype (→ picks the stack, #1).
- Tenancy: single-admin / single-tenant / multi-tenant (→ which guards, #2).
- Auth needed? Payments? (real gateway / simulated / none) Public-facing pages? (→ SEO, #4)
- Background/scheduled work? (→ outbox recipe, cron)

Each answer flips pre-set choices (the way the AskUserQuestion flow worked in the design
session). This becomes the real invocation; the static prompt stays as a fallback.

## 4. SEO guide (conditional) ✅ DONE

Done: [seo.md](./seo.md) — metadata + Open Graph, `robots.ts`/`sitemap.ts` (incl. the
DB-at-build gotcha → `force-dynamic`), JSON-LD, canonical URLs, hreflang/i18n, plus a
ready-to-index checklist. Covers both Next.js and Astro; Core Web Vitals hands off to
OBS-3 / `performance-budgets.md` rather than duplicating. Linked from baseline NEXT-3,
both public-page stacks, and the interactive bootstrap (Q5 decides inclusion; N/A for
API-only).

## 5. Make "docs + tests follow code" an explicit first-class rule ✅ DONE

After any task, docs and tests must reflect the **real** code — no stale references.

- ✅ Prominent rule in the skeleton `CLAUDE.md` (a ⚠️ callout under the precedence block +
  the "after making changes" checklist).
- ✅ Active enforcement: the **spec-sync CI nudge** —
  [skeleton/scripts/spec-sync-nudge.mjs](./skeleton/scripts/spec-sync-nudge.mjs) +
  example [workflow](./skeleton/.github/workflows/spec-sync.yml) — warns when behavior
  files (`actions/`, `data/`, `drizzle/schema/`) change without a `docs/spec/` update.
  Warn-only by default; `--strict` to block. `agentic-coding.md` idea #7 updated to shipped.
- Not done (deliberately): a separate dedicated doc — the rule lives where it's enforced
  (CLAUDE.md + the nudge), so a standalone doc would just be one more thing to keep in sync.

## Suggested order

2 (audit bias) → 1 (multi-stack) → 3 (interactive bootstrap, depends on 1+2) → 4 (SEO) → 5 (rule).
Dogfood each against the LMS test app (`/bootstrap-app academia …`) as you go.
