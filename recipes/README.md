# Recipes — opt-in patterns

Patterns that are **not** in the core [`skeleton/`](../skeleton/) because not every
app needs them — but when an app does, it should pull in the *proven* version
instead of re-implementing a subtly-wrong one.

Each recipe is a self-contained, project-agnostic, drag-and-drop tree: the folder
layout mirrors where the files land in a real project (`drizzle/`, `lib/`, `app/`,
`tests/`), plus a `README.md` with the design, the **when-to-use / when-not**, and
the wiring steps.

| Recipe | Use it when… |
| ------ | ------------ |
| [neon-drizzle-client](./neon-drizzle-client/) | **Any app with a database** (full-stack web / API service) — the canonical `drizzle/db.ts` (Neon serverless + `ws`, pg fallback for tests, `DB`/`Tx` types). Not optional; this is *the* client. (Baseline DB-1.) |
| [transactional-outbox](./transactional-outbox/) | You have side effects that **must not be lost** — confirmation emails, downstream API calls, outgoing webhooks, notifications. (Baseline REL-1.) |

## How to use a recipe

1. Read the recipe's `README.md` — confirm you actually need it (the "when not to
   use" section matters; pulling in a recipe you don't need is dead weight).
2. Copy its `drizzle/` + `lib/` + `app/` + `tests/` files into the matching paths
   in your project. Adjust the import paths (`@/drizzle/db`, `@/lib/logger`) to yours.
3. Generate the migration, wire any `vercel.json` entries, set the env vars the
   README lists.
4. Adapt the placeholder example (event, consumer) to your real side effect.

## Adding a new recipe

A pattern earns a recipe when it's: **(a)** non-trivial to implement correctly,
**(b)** reused across projects, and **(c)** easy to get subtly wrong. Good
candidates to add next: distributed rate limiting (Upstash/KV), idempotent inbound
webhooks, Better Auth org/RBAC setup, ADR registry, feature flags.

Keep recipes self-contained and project-agnostic (no app names, no domain entities
beyond an illustrative placeholder).
