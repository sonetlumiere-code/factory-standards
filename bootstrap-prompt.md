# Bootstrap Prompt

The invocation mechanism. The standards are inert until an agent reads them — this
is the one command that loads them. Copy the prompt, fill the two placeholders,
paste into a fresh session started from a directory that can read this repo.

---

## Filling in the two placeholders

Replace them inline before pasting (the `{{ }}` are not literal):

- `{{APP}}` → the new project folder name, e.g. `nueva-app`.
- `{{PATH}}` → the **absolute** path to the directory that *contains* this repo,
  **with no leading or trailing slash** — the template already adds them. Since the
  template reads `/{{PATH}}/factory-standards/`, use `Users/<you>/Desktop/dev`
  (so it resolves to `/Users/<you>/Desktop/dev/factory-standards`).
  Don't use a relative path like `Desktop/dev/` — the template's leading `/` would
  make it an absolute path from the disk root, not your home.

Start the fresh session from the directory where `{{APP}}` should be created (e.g.
`~/Desktop/dev`) so `./{{APP}}` lands there as a sibling of `factory-standards`.

## The prompt

```
Bootstrap a new Next.js app at ./{{APP}} — <one paragraph: what it does, the core
domain entity, and the 2–3 flows that matter>.

Treat /{{PATH}}/factory-standards/ as binding defaults. Before writing code:

1. READ every file in /{{PATH}}/factory-standards/ (README, stack.md,
   tooling-config.md, vercel-nextjs-production-baseline.md, agentic-coding.md,
   and skeleton/).

2. STACK — use stack.md's canonical choices. Don't substitute libraries; if a need
   isn't covered, say so and propose one rather than guessing.

3. TOOLING — scaffold exactly per tooling-config.md: Prettier, ESLint flat config
   with the process.env guard (+ any others that apply), tsconfig strict +
   noUncheckedIndexedAccess, .editorconfig, the standard scripts, engine + package
   manager pins, .nvmrc.

4. DOCS — copy factory-standards/skeleton into the project. Fill CLAUDE.md and
   docs/spec/ for THIS app: real rules, real `path › symbol` citations (not the
   placeholders), confidence levels, append-only IDs. Wire tests/** into the test
   runner and get every guard GREEN.

5. BASELINE — apply every MUST in vercel-nextjs-production-baseline.md that applies
   to this app. Then print a table: each MUST/SHOULD you are NOT doing yet, with a
   one-line reason (deferred / not-applicable / needs-a-decision).

6. MUSCLES — author at least one project-specific architecture guard beyond the
   skeleton's citation/catalog tests (e.g. the tenant-isolation or authz guard from
   skeleton/tests/architecture/, adapted to this app's data layer and auth).

Scope discipline: match effort to the app. Don't gold-plate a small project — apply
the MUSTs, defer the rest with reasons. STOP and show me the plan (scaffold layout +
which baseline items apply + what you're deferring) BEFORE writing code.
```

## Acceptance criteria (how to grade the result)

- Tooling matches `tooling-config.md` (run `pnpm lint && pnpm typecheck`).
- `skeleton/` copied; `CLAUDE.md` + `docs/spec/` filled with **real** citations; `pnpm test`
  guards green (citation + catalog + the architecture guard).
- A **deferral table** exists — every un-applied MUST/SHOULD named with a reason. (A MUST
  silently skipped means the standard didn't stick — tighten its wording.)
- At least one project-specific architecture guard authored (Pattern B, not just Pattern A).

## A lighter mode — audit an existing repo

To check a project (not scaffold one):

```
Audit this repo against /{{PATH}}/factory-standards/vercel-nextjs-production-baseline.md.
Report gaps as a table by ID (e.g. SEC-1, OBS-4) with severity and the file that would
change. Don't fix anything yet — just the gap report.
```

## Turning this into a reusable command

The prompt above is the MVP. To make it one keystroke:

- **Claude Code slash command / skill.** Put the prompt (with the `{{APP}}`/`{{PATH}}`
  placeholders) in a project or user skill so `/bootstrap-app <name>` runs it. The skill
  body is just "read factory-standards, then follow these steps."
- **A `degit`-able template.** Keep `skeleton/` copy-paste-able (it already is); a
  `degit your-org/factory-standards/skeleton my-app/` gets the docs + guards in one command,
  then the agent fills them in.
- **Pin the standards version.** Have the bootstrapped project record which
  factory-standards commit/tag it was built against, so you can tell when a project predates
  a standard you later added.

## Keeping the standards alive (so this stays worth running)

- **Dogfood.** Every project you bootstrap surfaces a gap or a better default — fold it back
  into the relevant standards doc in the same week, not "later."
- **One correction → one guard.** When you correct an agent twice for the same thing, encode
  it (a lint rule, an architecture test, a spec invariant, or a line in `anti-patterns.md`)
  so the next agent gets it for free.
- **Don't outpace your dogfooding.** Add a standards doc when a real project needs it, not
  speculatively — every doc you add is a doc that can rot.
