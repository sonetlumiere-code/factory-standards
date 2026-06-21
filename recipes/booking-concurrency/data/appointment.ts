import "server-only"

import { db } from "@/drizzle/db"
import { appointments } from "@/drizzle/schema"

/**
 * Anti-double-booking, the safe way. We do NOT read-then-check-then-insert (that
 * races between the read and the write). We just insert; the Postgres EXCLUDE
 * constraint (see `drizzle/migrations/0001_booking_exclude.sql`) is the atomic
 * arbiter — if the slot (incl. the service buffer) overlaps a live appointment for
 * the same staff member, Postgres raises `23P01` and we surface a typed error.
 */

export class DoubleBookingError extends Error {
  constructor() {
    super("slot_unavailable")
    this.name = "DoubleBookingError"
  }
}

const PG_EXCLUSION_VIOLATION = "23P01"

/** The pg driver code can sit on the error or anywhere down its `cause` chain. */
function isExclusionViolation(error: unknown): boolean {
  let e: unknown = error
  for (let i = 0; i < 5 && e; i++) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: unknown }).code === PG_EXCLUSION_VIOLATION
    ) {
      return true
    }
    e = (e as { cause?: unknown }).cause
  }
  return false
}

export type CreateAppointmentInput = {
  organizationId: string
  staffMemberId: string
  serviceId: string
  customerId: string
  startsAt: Date
  endsAt: Date
  bufferMin: number
}

/**
 * Book a slot. Throws `DoubleBookingError` if it overlaps a live one.
 *
 * Compose, don't copy blindly:
 *  - Multi-tenant? Verify each client-supplied id (`staffMemberId`, `customerId`,
 *    `serviceId`) belongs to `organizationId` INSIDE this transaction first — an FK
 *    only proves the row exists, not that it's in-tenant; skipping this lets a
 *    booker block a competitor's calendar. (See the tenant-isolation guard.)
 *  - Must-not-lose side effect on book (confirmation email)? `emit(tx, …)` in the
 *    same transaction (compose with recipes/transactional-outbox).
 */
export async function createAppointment(input: CreateAppointmentInput) {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(appointments)
        .values({ ...input, status: "confirmed" })
        .returning()
      if (!row) throw new Error("insert returned no row")
      return row
    })
  } catch (error) {
    if (isExclusionViolation(error)) throw new DoubleBookingError()
    throw error
  }
}
