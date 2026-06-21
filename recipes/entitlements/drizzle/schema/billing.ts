import { sql } from "drizzle-orm"
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Billing & entitlements. A plan grants a set of entitlements/quotas; the limits
 * live in `plan_entitlement` **seed data** (data-driven, never hardcoded in app
 * logic) so the business can tune the free tier without a deploy.
 *
 * Adapt `planSlug` and the `feature` values to your product.
 */

export const planSlug = pgEnum("plan_slug", ["free", "pro"])

export const plans = pgTable("plan", {
  id: uuid().primaryKey().defaultRandom(),
  slug: planSlug().notNull().unique(),
  name: text().notNull(),
  priceCents: integer().notNull().default(0), // integer cents
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/**
 * One row per (plan, feature). `limitValue` semantics:
 *   null = unlimited · n = cap · 0 = feature off (for boolean "can use X" gates).
 */
export const planEntitlements = pgTable(
  "plan_entitlement",
  {
    id: uuid().primaryKey().defaultRandom(),
    planId: uuid()
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    feature: text().notNull(), // e.g. "max_members", "max_projects", "advanced_analytics"
    limitValue: integer(), // null = unlimited
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("plan_entitlement_plan_feature_uq").on(t.planId, t.feature),
  ]
)

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
])

/**
 * The account's paid subscription. `provider` + `externalId` tie it to the payment
 * processor (e.g. MercadoPago / Stripe). The webhook resolves account+plan from the
 * pending subscription keyed by the SIGNED `externalId` — never from the unsigned
 * webhook body (that's a privilege-escalation hole). `(provider, externalId)` is
 * unique → idempotent webhook handling (SEC-7).
 */
export const subscriptions = pgTable(
  "subscription",
  {
    id: uuid().primaryKey().defaultRandom(),
    // your tenant/account id (organization id, user id, …)
    accountId: text().notNull(),
    planId: uuid()
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus().notNull().default("active"),
    provider: text().notNull().default("mercadopago"),
    externalId: text(), // provider subscription/preapproval id (signed source of truth)
    currentPeriodEnd: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => [
    uniqueIndex("subscription_provider_external_uq").on(
      t.provider,
      t.externalId
    ),
  ]
)
