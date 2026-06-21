import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

// Your integration harness (testcontainers + migrate) and an account seeder.
import { seedAccount, startTestDb } from "./helpers"

let container: StartedPostgreSqlContainer
let db: typeof import("@/drizzle/db").db
let schema: typeof import("@/drizzle/schema")
let ent: typeof import("@/lib/entitlements")

beforeAll(async () => {
  container = await startTestDb()
  schema = await import("@/drizzle/schema")
  ;({ db } = await import("@/drizzle/db"))
  ent = await import("@/lib/entitlements")

  // Data-driven limits — a deliberately small free tier for the boundary test.
  const [free] = await db
    .insert(schema.plans)
    .values({ slug: "free", name: "Free", priceCents: 0 })
    .returning()
  const [pro] = await db
    .insert(schema.plans)
    .values({ slug: "pro", name: "Pro", priceCents: 999900 })
    .returning()
  if (!free || !pro) throw new Error("plan seed failed")

  await db.insert(schema.planEntitlements).values([
    { planId: free.id, feature: "max_projects", limitValue: 2 },
    { planId: free.id, feature: "advanced_analytics", limitValue: 0 }, // off
    { planId: pro.id, feature: "max_projects", limitValue: null }, // unlimited
    { planId: pro.id, feature: "advanced_analytics", limitValue: 1 }, // on
  ])

  await seedAccount(db, schema, { id: "acct-free", planId: free.id })
  await seedAccount(db, schema, { id: "acct-pro", planId: pro.id })
})

afterAll(async () => {
  const { closeDb } = await import("@/drizzle/db")
  await closeDb()
  await container?.stop()
})

describe("plan entitlements — free-tier limits from seed data", () => {
  it("allows creation up to the free limit, then blocks", async () => {
    // limit 2: current 0 → ok, 1 → ok, 2 → blocked.
    await expect(
      ent.assertWithinQuota("acct-free", "max_projects", 0)
    ).resolves.toBeUndefined()
    await expect(
      ent.assertWithinQuota("acct-free", "max_projects", 1)
    ).resolves.toBeUndefined()
    await expect(
      ent.assertWithinQuota("acct-free", "max_projects", 2)
    ).rejects.toBeInstanceOf(ent.EntitlementError)
  })

  it("blocks a feature that's off on the free plan", async () => {
    await expect(
      ent.assertHasFeature("acct-free", "advanced_analytics")
    ).rejects.toBeInstanceOf(ent.EntitlementError)
  })

  it("the paid plan lifts the limit and enables the feature", async () => {
    await expect(
      ent.assertWithinQuota("acct-pro", "max_projects", 9999)
    ).resolves.toBeUndefined()
    await expect(
      ent.assertHasFeature("acct-pro", "advanced_analytics")
    ).resolves.toBeUndefined()
  })
})
