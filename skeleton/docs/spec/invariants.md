# Invariants

Always-true conditions of the system. Each has a stable, append-only ID (`INV-<n>`),
a **confidence level**, an **evidence citation**, and its **enforcement mechanism**.

> Format reminder: real citations are `` `path` › `symbol` `` with a real file path
> (e.g. a path like `data/<feature>/users.ts` › `createUser`, but pointing at a file
> that exists). The examples below use `<placeholder>` paths on purpose so the citation
> guard skips them while you scaffold — replace them (and delete this reminder) with real
> citations as you fill the spec in.

---

### INV-1 — Scope isolation: every data-layer query filters by its scope id

**Confidence:** PROVEN · **Enforced:** static guard (`tests/spec/...`) + convention
**Evidence:** `` `data/<feature>.ts` › `getThings` ``

There is no database row-level security. Every read and write in the data layer scopes by
its **scope id**; the filter **is** the security boundary. The scope id is one of two,
depending on the app — keep the variant that fits:

- **Multi-tenant** — the tenant id (`storeId`/`orgId`). A data-layer function that takes a
  tenant id but doesn't use it in its `WHERE` is a **cross-tenant** leak.
- **Single-tenant / single-admin** — the owner id (`userId`/`ownerId`). A function that
  takes an owner id but doesn't use it is a **cross-owner** leak (one user reading
  another's rows).

Either way the missing filter is caught by the architecture guard. Pairs with
[INV-2](#inv-2--public-row-boundary-for-client-bound-data).

### INV-2 — Public-row boundary for client-bound data

**Confidence:** PROVEN · **Enforced:** types + static guard
**Evidence:** `` `lib/<entity>/public.ts` › `toPublicThing` ``

Client-bound code uses `Public*` view types / `*Safe` accessors, never the raw DB row —
so secret-bearing columns can't cross the server/client boundary. New columns must be
classified (public vs server-only) or the build fails. Convention-only parts are the
refactor hazard: they compile and pass tests but silently leak if violated.

<!-- Append new invariants below. Add the ID to tests/spec/snapshots/catalog-ids.json
     in the same change. Never renumber or reuse an ID. -->
