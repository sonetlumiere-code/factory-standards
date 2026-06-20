# Ideas in flight — factory-standards evolution

Backlog for the next work session. Goal: make factory-standards **maximally flexible**
— a bootstrap base for *any* app type the software factory builds, not just
multi-tenant Next.js apps.

## 1. Multi-stack by app type

`stack.md` currently assumes one stack (Next.js full-stack). Make it **stack-per-archetype**:

- **Static site / landing** → **Astro** (default).
- **Full-stack web app** → the current stack (Next.js / Neon / Drizzle / Better Auth / Tailwind).
- **API-only / backend service** → define one (e.g. Hono or Next route handlers + Drizzle, no UI).
- (later) mobile, CLI, etc.

Restructure: either one `stack.md` with a section per archetype, or `stacks/<archetype>.md`.
The bootstrap picks the stack from the chosen archetype.

## 2. Audit + remove the multi-tenant bias

Verify the repo isn't over-oriented to multi-tenant apps. Review:

- The baseline (DB-5 "tenant filter", etc.), the skeleton `CLAUDE.md` example rules, and
  especially the **tenant-isolation guard** in `skeleton/tests/architecture/`.
- Make **single-tenant / single-admin a first-class case**: when there's no tenant, the
  tenant-isolation guard becomes an **ownership** guard (a user reads only their own rows).
  The guard template should support both modes (configurable), not assume `tenantId`.
- Generally: anywhere "tenant" is assumed, make it conditional on the app's answers.

## 3. Interactive bootstrap (questionnaire → pre-set decisions)

Replace/extend the fixed `bootstrap-prompt.md` so the agent **asks questions first** and
maps answers → pre-established factory decisions. Questions like:

- App type / archetype (→ picks the stack, #1).
- Tenancy: single-admin / single-tenant / multi-tenant (→ which guards, #2).
- Auth needed? Payments? (real gateway / simulated / none) Public-facing pages? (→ SEO, #4)
- Background/scheduled work? (→ outbox recipe, cron)

Each answer flips pre-set choices (the way the AskUserQuestion flow worked in the design
session). This becomes the real invocation; the static prompt stays as a fallback.

## 4. SEO guide (conditional)

New doc `seo.md`: metadata + Open Graph, `robots.ts` + `sitemap.ts` (and the
DB-at-build gotcha → `force-dynamic`), structured data (JSON-LD), canonical URLs,
Core Web Vitals budget, hreflang/i18n. **Applies to web/apps with public pages; NOT to
API-only projects** — the interactive bootstrap (#3) decides whether to include it.

## 5. Make "docs + tests follow code" an explicit first-class rule

After any task, docs and tests must reflect the **real** code — no stale references. This
already exists in spirit (`agentic-coding.md` idea #7; gp-learning's precedence + citation
tests + spec-sync CI). Elevate it:

- ✅ Prominent rule added to the skeleton `CLAUDE.md` (a ⚠️ callout under the precedence
  block + the "after making changes" checklist).
- TODO: optionally its own short doc, and wire the spec-sync CI nudge (warn when
  `actions/`/`drizzle/schema/` change without `docs/spec/`) as active enforcement.
- Reference: gp-learning's `docs/spec/README.md` precedence section + `tests/spec/citations.test.ts`.

## Suggested order

2 (audit bias) → 1 (multi-stack) → 3 (interactive bootstrap, depends on 1+2) → 4 (SEO) → 5 (rule).
Dogfood each against the LMS test app (`/bootstrap-app academia …`) as you go.
