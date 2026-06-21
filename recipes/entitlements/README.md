# Recipe — plan entitlements (free vs paid feature-gating)

Gate features and quotas by subscription plan. The factory already has RBAC
(`hasPermission` = *who* can act); this is the orthogonal axis — *what the account's plan
allows*. Charging is not gating: a payment integration tells you money moved; entitlements
decide what the account can do.

Proven in a real multi-tenant booking SaaS dogfood, then generalized.

## The shape

- **Limits are DATA, not code.** `plan` + `plan_entitlement` tables, seeded; tune the free
  tier without a deploy. `limitValue`: `null` = unlimited · `n` = cap · `0` = feature off.
- **One server-side check before every gated write:** `assertWithinQuota(account, feature,
  currentCount)` for caps, `assertHasFeature(account, feature)` for boolean gates. Both throw
  a typed `EntitlementError`.
- **Resolve from the signed source on upgrade.** The subscription webhook maps account+plan
  from the pending `subscription` row keyed by the **signed** `externalId` — never from the
  unsigned webhook body (privilege-escalation hole). `(provider, externalId)` unique →
  idempotent (SEC-7). Compose with the payment processor in the stack (MercadoPago/Stripe).

## What's in the box

- [`drizzle/schema/billing.ts`](./drizzle/schema/billing.ts) — `plan`, `plan_entitlement`,
  `subscription`.
- [`lib/entitlements.ts`](./lib/entitlements.ts) — `withinQuota` (pure), `resolvePlanFeatures`,
  `assertWithinQuota`, `assertHasFeature`, `EntitlementError`.
- [`drizzle/seed.example.ts`](./drizzle/seed.example.ts) — the data-driven free/paid tiers.
- [`tests/integration/entitlements.test.ts`](./tests/integration/entitlements.test.ts) — the
  free-tier boundary (border passes, over-border rejected), feature-off, paid lifts.

## Wiring

1. Add the schema; point `lib/entitlements.ts` at your tenant/account table (it expects an
   `accounts` row with a nullable `planId`).
2. Seed plans + entitlements (`seed.example.ts`).
3. In **every gated mutation**, call the check **before** writing, right after the authz check:

```ts
export async function createProjectAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requirePermission("project:create")       // RBAC — who
  const input = createProjectSchema.parse(raw)
  const current = await countProjectsByAccount(me.accountId)
  await assertWithinQuota(me.accountId, "max_projects", current) // plan — what
  const project = await createProject({ accountId: me.accountId, ...input })
  return ok({ id: project.id })
}
```

## Enforce it (don't rely on memory)

Add an architecture guard listing the quota-bearing mutations and asserting each calls an
`assert*` from `lib/entitlements` — the same Pattern B as the authz guard
([CATALOG.md](../../skeleton/tests/architecture/CATALOG.md)). A gated action that forgets the
check is a silent free-tier bypass; the guard turns that into a build failure.

## Known sharp edge

`assertWithinQuota` reads the current count then the caller inserts — a **quota race** under
concurrency (two parallel creates both see count = limit − 1). For hard caps, enforce in the
DB too (a partial unique index or a count check in the same transaction). Documented so you
choose deliberately; for most "generous free tier" limits the app-level check is enough.
