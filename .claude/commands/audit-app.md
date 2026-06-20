---
description: Audit an existing app against factory-standards (gap report by ID)
argument-hint: [path to app, or blank for the current repo]
---

<!-- Portable template. Copy to ~/.claude/commands/ and replace <FACTORY_STANDARDS_PATH>
     with the absolute path to your factory-standards checkout. -->

Audit an app against the factory standards and report the gaps. **Don't fix anything** unless
I pass `--fix`. Target: `$ARGUMENTS` (a path), or the current working directory if blank.

Treat `<FACTORY_STANDARDS_PATH>/` as the source of truth. Steps:

1. **Version baseline.** Read the app's `.factory-version` if present. Run
   `git -C <FACTORY_STANDARDS_PATH> log <that-version>..HEAD -- .` to list standards added
   **since the app was generated** — those are drift, not the app's fault. If there's no
   `.factory-version`, note it (the app predates versioning) and audit against current `HEAD`.

2. **Determine the archetype** from the app (framework in `package.json`, presence of a UI /
   data layer) → which checklist applies: full-stack web, static site, or API service. Items
   that don't apply to the archetype are **N/A**, not gaps.

3. **Audit by ID** against the current standards:
   - `vercel-nextjs-production-baseline.md` — every `REPO/ENV/DB/SEC/OBS/REL/CRON/NEXT/CI/TEST/DOC-*`.
   - `security.md` — rate-limiting storage (auth=DB, custom=Upstash, fail-open), CSP, webhooks, secret encryption, audit log.
   - `seo.md` — if the app has public pages.
   - `agentic-coding.md` / `skeleton/` — agent door + `docs/spec/` present, citations resolve, the spec-sync nudge wired, ≥1 architecture guard, an integration test per critical invariant.
   - `tooling-config.md` — Prettier/ESLint/tsconfig strict/scripts/pins.

4. **Report a table:** `ID | level (MUST/SHOULD/MAY) | status (ok | gap | N/A) | file that would change | note`. Flag rows that are **new since `.factory-version`** (drift) separately from genuine gaps. Sort gaps by level then severity.

5. **Summarize:** counts (ok / gap / N-A), the top 3 MUST gaps, and whether the app is behind the current standards version.

With `--fix`: after the report, apply only the **safe, in-repo** gaps (config, headers, missing
guards, stale citations) — never deploy-time/operational items (DSNs, Neon roles, Vercel envs).
Re-run lint/typecheck/test and show the result. Without `--fix`, stop at the report.
