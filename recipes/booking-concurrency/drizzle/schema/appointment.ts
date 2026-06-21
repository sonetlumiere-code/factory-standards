import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Illustrative booking entity. Anti-double-booking is enforced by the Postgres
 * EXCLUDE constraint in `drizzle/migrations/0001_booking_exclude.sql` — drizzle-kit
 * can't express EXCLUDE, so it's a hand-written custom migration. Two concurrent
 * inserts for the same `staffMemberId` at overlapping times → exactly one commits,
 * the other fails with a `23P01` exclusion_violation (see `data/appointment.ts`).
 *
 * Adapt the columns to your domain. `staffMemberId` is the scarce-resource key (see
 * the migration's closing note). `bufferMin` is the service cool-down folded into
 * the unbookable window. In a multi-tenant app, also carry the tenant id
 * (`organizationId`) and scope every query by it (compose with the tenant guard).
 */
export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
])

export const appointments = pgTable(
  "appointment",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Carry your tenant id here too if multi-tenant, and scope reads by it.
    organizationId: text().notNull(),
    staffMemberId: uuid().notNull(), // the scarce resource the EXCLUDE keys on
    serviceId: uuid().notNull(),
    customerId: uuid().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    bufferMin: integer().notNull().default(0), // service cool-down, folded into the range
    status: appointmentStatus().notNull().default("pending"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointment_org_starts_idx").on(t.organizationId, t.startsAt),
    index("appointment_staff_starts_idx").on(t.staffMemberId, t.startsAt),
  ]
)
