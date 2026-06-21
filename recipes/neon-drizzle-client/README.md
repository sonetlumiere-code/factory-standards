# Recipe — canonical Neon + Drizzle client (`drizzle/db.ts`)

The one correct way to wire the database client for a Vercel + Neon app. Copy
[`drizzle/db.ts`](./drizzle/db.ts) to your project's `drizzle/db.ts` and adapt the imports
(`@/lib/env/server`, `@/lib/logger`, `./schema`).

This exists because four real apps each hand-rolled this file and drifted — one shipped
**without `ws`/`neonConfig`** (Neon fails on Vercel's Node runtime), one **inverted the
host sniff**, one **didn't pass `schema`** (no typed `db.query`). This recipe is the merge of
the best of all of them.

## What it does

- **Two drivers, one API.** Neon **neon-serverless** (WebSocket) at runtime against the
  **pooled** endpoint; **node-postgres** for local/testcontainers (the Neon driver can't reach
  `127.0.0.1`). Sniffs the host (`/\.neon\.tech/`) and branches — **positive-Neon**, so an
  unknown host falls back to `pg` rather than being misrouted to Neon.
- **`neonConfig.webSocketConstructor = ws`** — required: Vercel's pinned Node runtime has no
  global WebSocket. This is the line apps forget; without it Neon won't connect in production.
- **Passes `schema`** → typed `db.query` with relations.
- **`casing: "snake_case"`** → write columns in `camelCase` in TS, get `snake_case` in SQL (see
  the casing note below).
- **`closeDb()`** → clean pool teardown for integration tests.
- **Pool error handler** → an idle-client error logs instead of crashing the process.
- **`DB` and `Tx` types** → one shared transaction-handle type for `emit(tx, …)` and friends.

## Non-negotiables (DB-1)

- `DATABASE_URL` = the **pooled** connection string at runtime.
- `DATABASE_URL_UNPOOLED` = the **direct** string, used by `drizzle.config.ts` for migrations.
- Keep `ws` in `dependencies` (not dev) — it ships to the serverless runtime.
- Location: `drizzle/db.ts` (3 of 4 apps; standardize here). The data layer (`data/*`) imports
  `db`/`Tx` from it.

## The casing decision (pick one, don't mix)

Either define columns with explicit snake names (`text("user_id")`) **or** use
`casing: "snake_case"` globally and write `userId` in the schema. This recipe does the latter.
Don't do both halfway — inconsistent casing is a silent migration-diff hazard.

## Testing note

This recipe assumes **testcontainers** (real Postgres) for integration — the `pg` branch + the
host sniff cover it, and `closeDb()` handles teardown. If you instead use **PGlite** (in-memory,
no Docker — faster), type your data-layer helpers on a driver-agnostic
`PgDatabase<…> | PgTransaction<…>` union and migrate the schema into PGlite in the harness;
the runtime `db` export stays the same.
