import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@/drizzle/db"
import { outboxEvent } from "@/drizzle/schema"
import { drainOutbox } from "@/lib/events/dispatcher"
import { emit } from "@/lib/events/emit"

// Runs against a real Postgres (testcontainers). Adjust the import paths and the
// reset helper to your project; here we just clear the outbox table.
beforeEach(async () => {
  await db.delete(outboxEvent)
})

// Pins the outbox concurrency + idempotency contract: the dispatcher claims rows
// with FOR UPDATE SKIP LOCKED, so parallel drains never deliver the same event
// twice. The example `UserRegistered` consumer is a no-op side effect (it logs),
// so a claimed row completes to `done`.
describe("outbox dispatcher — concurrency + idempotency", () => {
  async function seed(n: number) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < n; i++) {
        await emit(tx, {
          type: "UserRegistered",
          payload: { userId: randomUUID() },
        })
      }
    })
  }

  it("two concurrent drains claim disjoint rows — each event processed once", async () => {
    const n = 20
    await seed(n)

    const [a, b] = await Promise.all([
      drainOutbox({ batch: n }),
      drainOutbox({ batch: n }),
    ])

    expect(a.processed + b.processed).toBe(n)

    const done = await db
      .select()
      .from(outboxEvent)
      .where(eq(outboxEvent.status, "done"))
    expect(done.length).toBe(n)

    const stuck = await db
      .select()
      .from(outboxEvent)
      .where(eq(outboxEvent.status, "processing"))
    expect(stuck.length).toBe(0)
  })

  it("dedup key collapses a double emit to a single row", async () => {
    const userId = randomUUID()
    await db.transaction(async (tx) => {
      await emit(tx, { type: "UserRegistered", payload: { userId } })
      await emit(tx, { type: "UserRegistered", payload: { userId } })
    })

    const rows = await db.select().from(outboxEvent)
    expect(rows.length).toBe(1)
    expect(rows[0]?.dedupKey).toBe(`welcome:${userId}`)
  })
})
