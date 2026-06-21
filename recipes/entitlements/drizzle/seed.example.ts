/**
 * Entitlement seed — the free tier is DATA, tunable here without a deploy. Run as
 * part of `drizzle/seed.ts`. Numbers are illustrative; set them with the business.
 *
 * limitValue: null = unlimited · n = cap · 0 = feature off.
 */
import { db } from "@/drizzle/db"
import { planEntitlements, plans } from "@/drizzle/schema"

export async function seedPlans() {
  const [free] = await db
    .insert(plans)
    .values({ slug: "free", name: "Free", priceCents: 0 })
    .returning()
  const [pro] = await db
    .insert(plans)
    .values({ slug: "pro", name: "Pro", priceCents: 999900 })
    .returning()
  if (!free || !pro) throw new Error("plan seed failed")

  await db.insert(planEntitlements).values([
    // Generous free tier; the paid plan lifts the caps / turns features on.
    { planId: free.id, feature: "max_members", limitValue: 3 },
    { planId: free.id, feature: "max_projects", limitValue: 10 },
    { planId: free.id, feature: "advanced_analytics", limitValue: 0 }, // off on free
    { planId: pro.id, feature: "max_members", limitValue: null }, // unlimited
    { planId: pro.id, feature: "max_projects", limitValue: null },
    { planId: pro.id, feature: "advanced_analytics", limitValue: 1 }, // on
  ])
}
