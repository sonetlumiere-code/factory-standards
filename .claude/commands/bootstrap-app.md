---
description: Scaffold a new Next.js app from factory-standards
argument-hint: <app description, including a name>
---

<!-- Portable template. To use it: copy this file to ~/.claude/commands/ (user-level,
     available everywhere) and replace <FACTORY_STANDARDS_PATH> with the absolute path
     to your factory-standards checkout, e.g. /Users/you/dev/factory-standards. -->

Bootstrap a new Next.js (App Router) app from the description below. Derive a
kebab-case folder name from it and create the app at `./<that-name>` (a subdirectory
of the current working directory).

App: $ARGUMENTS

Treat `<FACTORY_STANDARDS_PATH>/` as binding defaults. Before writing any code:

1. **READ** every file under `<FACTORY_STANDARDS_PATH>/` — `README.md`, `stack.md`,
   `tooling-config.md`, `vercel-nextjs-production-baseline.md`, `agentic-coding.md`,
   `skeleton/`, and `recipes/`.

2. **STACK** — use `stack.md`'s canonical choices. Don't substitute libraries; if a
   need isn't covered, say so and propose one rather than guessing.

3. **TOOLING** — scaffold exactly per `tooling-config.md`: Prettier, ESLint flat
   config with the `process.env` guard (+ others that apply), `tsconfig` strict +
   `noUncheckedIndexedAccess`, `.editorconfig`, the standard scripts, engine +
   `packageManager` pins, `.nvmrc`.

4. **AGENTIC DOCS** — copy `skeleton/` into the project. Fill `CLAUDE.md` and
   `docs/spec/` for THIS app: real rules, real `path › symbol` citations (not the
   placeholders), confidence levels, append-only IDs. Adapt the architecture guards
   (`tests/architecture/`) to this app's data layer + auth. Wire `tests/**` into the
   runner and get every guard GREEN.

5. **BASELINE** — apply every MUST in `vercel-nextjs-production-baseline.md` that
   applies. Then print a table: every MUST/SHOULD you are NOT doing yet, with a
   one-line reason (deferred / not-applicable / needs-a-decision).

6. **RECIPES** — pull in a recipe from `recipes/` only if this app needs it (e.g. the
   transactional outbox for must-not-lose side effects). Don't add one you don't need.

Scope discipline: match effort to the app — don't gold-plate a small project. **STOP
and show me the plan** (scaffold layout + which baseline items apply + what you're
deferring) BEFORE writing code.
