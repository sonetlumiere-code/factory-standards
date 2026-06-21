import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/drizzle/db"
import { accounts, planEntitlements, plans } from "@/drizzle/schema"

/**
 * Plan entitlements / quota gating. Limits are DATA, not code: every answer comes
 * from the `plan_entitlement` table (seeded, tunable by the business — see
 * `drizzle/seed.example.ts`), so nothing here hardcodes "free = 3 members". A gated
 * feature/mutation calls `assertWithinQuota` / `assertHasFeature` BEFORE it writes.
 *
 * `limitValue` semantics: null = unlimited · n = cap · 0 = feature off.
 *
 * `accounts` is your tenant/account table (organization, workspace, user…) with a
 * nullable `planId`. Adapt the import + the `Feature` union to your product.
 */
export type Feature = "max_members" | "max_projects" | "advanced_analytics"

export class EntitlementError extends Error {
  constructor(
    public feature: Feature,
    message: string
  ) {
    super(message)
    this.name = "EntitlementError"
  }
}

/** Pure quota check: unlimited (null) always passes; else the NEW count must fit. */
export function withinQuota(limit: number | null, nextCount: number): boolean {
  if (limit === null) return true
  return nextCount <= limit
}

/** Resolve an account's plan → its feature→limit map (falls back to the `free` plan). */
export async function resolvePlanFeatures(
  accountId: string
): Promise<Map<Feature, number | null>> {
  const [acct] = await db
    .select({ planId: accounts.planId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1)

  let planId = acct?.planId ?? null
  if (!planId) {
    const [free] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, "free"))
      .limit(1)
    planId = free?.id ?? null
  }

  const map = new Map<Feature, number | null>()
  if (!planId) return map

  const rows = await db
    .select({
      feature: planEntitlements.feature,
      limitValue: planEntitlements.limitValue,
    })
    .from(planEntitlements)
    .where(eq(planEntitlements.planId, planId))

  for (const r of rows) map.set(r.feature as Feature, r.limitValue)
  return map
}

/**
 * Assert that creating one more of `feature` keeps the account within its plan.
 * @param currentCount how many already exist; the check is `currentCount + 1 <= limit`.
 * A feature absent from the plan is treated as limit 0 (off).
 */
export async function assertWithinQuota(
  accountId: string,
  feature: Feature,
  currentCount: number
): Promise<void> {
  const features = await resolvePlanFeatures(accountId)
  const limit = features.has(feature) ? (features.get(feature) ?? null) : 0
  if (!withinQuota(limit, currentCount + 1)) {
    throw new EntitlementError(
      feature,
      `Plan limit reached for ${feature} (limit ${limit}). Upgrade to add more.`
    )
  }
}

/** Assert a boolean feature is enabled (present and limit !== 0). */
export async function assertHasFeature(
  accountId: string,
  feature: Feature
): Promise<void> {
  const features = await resolvePlanFeatures(accountId)
  const limit = features.get(feature)
  if (limit === 0 || limit === undefined) {
    throw new EntitlementError(
      feature,
      `Feature ${feature} is not included in this plan. Upgrade to enable it.`
    )
  }
}
