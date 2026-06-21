import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

// `startTestDb` / `seed*` are your integration harness (testcontainers + migrate).
// `seedBookingFixtures` inserts one staff/service/customer and returns their ids.
import { seedBookingFixtures, startTestDb } from "./helpers"

let container: StartedPostgreSqlContainer
let db: typeof import("@/drizzle/db").db
let schema: typeof import("@/drizzle/schema")
let appts: typeof import("@/data/appointment")

beforeAll(async () => {
  container = await startTestDb()
  schema = await import("@/drizzle/schema")
  ;({ db } = await import("@/drizzle/db"))
  appts = await import("@/data/appointment")
})

afterAll(async () => {
  const { closeDb } = await import("@/drizzle/db")
  await closeDb()
  await container?.stop()
})

describe("no double-booking — DB EXCLUDE constraint", () => {
  it("two concurrent overlapping bookings → exactly one wins", async () => {
    const f = await seedBookingFixtures(db, schema, "org-c", { durationMin: 30 })
    const slot = {
      organizationId: "org-c",
      staffMemberId: f.staffId,
      serviceId: f.serviceId,
      customerId: f.customerId,
      startsAt: new Date("2025-02-01T13:00:00Z"),
      endsAt: new Date("2025-02-01T13:30:00Z"),
      bufferMin: 0,
    }
    const results = await Promise.allSettled([
      appts.createAppointment(slot),
      appts.createAppointment(slot),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const rejected = results.filter((r) => r.status === "rejected")
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      appts.DoubleBookingError
    )
  })

  it("the service buffer extends the unbookable window", async () => {
    // 30-min service + 15-min buffer → blocks [13:00, 13:45).
    const f = await seedBookingFixtures(db, schema, "org-d", {
      durationMin: 30,
      bufferMin: 15,
    })
    const base = {
      organizationId: "org-d",
      staffMemberId: f.staffId,
      serviceId: f.serviceId,
      customerId: f.customerId,
      bufferMin: 15,
    }
    await appts.createAppointment({
      ...base,
      startsAt: new Date("2025-03-01T13:00:00Z"),
      endsAt: new Date("2025-03-01T13:30:00Z"),
    })
    // 13:40 falls inside the buffer → rejected.
    await expect(
      appts.createAppointment({
        ...base,
        startsAt: new Date("2025-03-01T13:40:00Z"),
        endsAt: new Date("2025-03-01T14:10:00Z"),
      })
    ).rejects.toBeInstanceOf(appts.DoubleBookingError)
    // 13:45 is exactly after the buffer → allowed.
    await expect(
      appts.createAppointment({
        ...base,
        startsAt: new Date("2025-03-01T13:45:00Z"),
        endsAt: new Date("2025-03-01T14:15:00Z"),
      })
    ).resolves.toBeDefined()
  })

  it("a cancelled appointment frees its slot", async () => {
    const f = await seedBookingFixtures(db, schema, "org-e", { durationMin: 30 })
    const slot = {
      organizationId: "org-e",
      staffMemberId: f.staffId,
      serviceId: f.serviceId,
      customerId: f.customerId,
      startsAt: new Date("2025-04-01T13:00:00Z"),
      endsAt: new Date("2025-04-01T13:30:00Z"),
      bufferMin: 0,
    }
    const first = await appts.createAppointment(slot)
    await db
      .update(schema.appointments)
      .set({ status: "cancelled" }) // leaves the partial-index predicate
      .where(eq(schema.appointments.id, first.id))
    await expect(appts.createAppointment(slot)).resolves.toBeDefined()
  })
})
