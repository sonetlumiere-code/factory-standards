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

2. **INTERVIEW** — follow `bootstrap-interactive.md`: ask the **adaptive questionnaire**
   (archetype, tenancy, auth, payments, public pages/SEO, background work) with the
   `AskUserQuestion` tool, skipping any question already implied by the description or an
   earlier answer. Map the answers to the pre-set factory decisions, then **print the
   decision sheet and STOP** for my go before writing code.

Then, after I confirm:

3. **TOOLING** — scaffold exactly per `tooling-config.md`: Prettier, ESLint flat
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
