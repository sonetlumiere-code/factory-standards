---
description: Scaffold a new app (static / full-stack / API) from factory-standards
argument-hint: <app description, including a name>
---

<!-- Portable template. To use it: copy this file to ~/.claude/commands/ (user-level,
     available everywhere) and replace <FACTORY_STANDARDS_PATH> with the absolute path
     to your factory-standards checkout, e.g. /Users/you/dev/factory-standards. -->

Bootstrap a new app from the description below. Derive a kebab-case folder name from
it and create the app at `./<that-name>` (a subdirectory of the current working
directory).

App: $ARGUMENTS

Treat `<FACTORY_STANDARDS_PATH>/` as binding defaults. Before writing any code:

1. **READ** every file under `<FACTORY_STANDARDS_PATH>/` — `README.md`, `stacks/`,
   `bootstrap-interactive.md`, `tooling-config.md`,
   `vercel-nextjs-production-baseline.md`, `agentic-coding.md`, `skeleton/`, `recipes/`.

2. **INTERVIEW** — follow `bootstrap-interactive.md`'s three-tier questionnaire with the
   `AskUserQuestion` tool:
   - **Tier 1 (always confirm):** project name, archetype (static-site / full-stack web /
     API service / desktop), **primary language/locale**
     (when there's a UI — don't default to English silently), **tenancy** (confirm even if
     implied — it picks the security guard), auth & roles.
   - **Tier 2 (adaptive — skip if implied, "no" prunes):** payments, transactional email
     (→ Resend), file/media uploads (→ Cloudinary), public pages/SEO (+ i18n), background
     work. Ask the **capability, not the provider** (the stack fixes the provider).
   - **Tier 3 (defaults, don't ask):** Sentry stub, Vercel Analytics, rate limiting —
     shown in the decision sheet as overridable.

   Map the answers to the pre-set factory decisions, then **print the decision sheet and
   STOP** for my go before writing code.

Then, after I confirm:

3. **SCAFFOLD BASE** — create the project with the framework's official CLI first
   (`pnpm create next-app@latest` / `create astro` / `create hono`), then layer the
   standards on top. Don't hand-write the base tree; set the primary locale here. Write
   `.factory-version` (from `git -C <FACTORY_STANDARDS_PATH> describe --tags --always` +
   date — see `VERSIONING.md`). Then, **TOOLING** — scaffold exactly per `tooling-config.md`:
   Prettier, ESLint flat
   config with the `process.env` guard (+ others that apply), `tsconfig` strict +
   `noUncheckedIndexedAccess`, `.editorconfig`, the standard scripts, engine +
   `packageManager` pins, `.nvmrc`.

4. **AGENTIC DOCS** — copy `skeleton/` into the project. Fill `CLAUDE.md` and
   `docs/spec/` for THIS app: real rules, real `path › symbol` citations (not the
   placeholders), confidence levels, append-only IDs. Keep only the **scope guard the
   tenancy answer selected** (tenant vs ownership) and adapt its token + the
   permission-check matcher. Wire `tests/**` into the runner and get every guard GREEN.

5. **BASELINE** — apply every MUST in `vercel-nextjs-production-baseline.md` that
   applies to this archetype. Then print a table: every MUST/SHOULD you are NOT doing
   yet, with a one-line reason (deferred / not-applicable / needs-a-decision).

6. **RECIPES & OPTIONAL DOCS** — pull in only what the answers selected (e.g. the
   transactional outbox for must-not-lose side effects, SEO guidance for public pages).
   Don't add one you don't need.

Scope discipline: match effort to the app — don't gold-plate a small project. Every "no"
in the interview prunes a branch; don't scaffold what wasn't asked for.

> Prefer this interactive flow. The static one-shot prompt in `bootstrap-prompt.md` is the
> fallback for when every choice is already known.
