import "server-only"

import { and, count, eq, inArray, lte, sql } from "drizzle-orm"

import { db } from "@/drizzle/db"
import { outboxEvent } from "@/drizzle/schema"
import type { OutboxEvent } from "@/drizzle/types"
import { logger } from "@/lib/logger"

import { backoffMs } from "./backoff"
import { CONSUMERS } from "./consumers"

// After this many failed attempts a row is dead-lettered (terminal `dead`).
const MAX_ATTEMPTS = 5
// A row claimed (set `processing`) but not resolved within this window means the
// dispatcher died mid-run; the sweeper resets it so a later drain re-claims it.
const STUCK_AFTER_MS = 5 * 60_000

/**
 * Claim a batch of due rows and run their consumers. Triggered post-commit by a
 * producer (`runInBackground(drainOutbox())`) and by the cron-backed drain
 * endpoint. Concurrency-safe: the claim uses `FOR UPDATE SKIP LOCKED`, so parallel
 * dispatchers grab disjoint rows.
 */
export async function drainOutbox({
  batch = 10,
}: { batch?: number } = {}): Promise<{ processed: number }> {
  const claimed = await claimBatch(batch)
  for (const row of claimed) {
    await runConsumers(row)
  }
  return { processed: claimed.length }
}

/**
 * Reset rows stuck in `processing` past `STUCK_AFTER_MS` back to `failed`, so a
 * later drain re-claims them (a dispatcher that died after the claim). The claim
 * stamps `nextAttemptAt` with the claim time, giving us the age signal. Idempotent.
 */
export async function sweepStuck(): Promise<{ swept: number }> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS)
  const reset = await db
    .update(outboxEvent)
    .set({ status: "failed", lastError: "swept: stuck in processing" })
    .where(
      and(
        eq(outboxEvent.status, "processing"),
        lte(outboxEvent.nextAttemptAt, cutoff)
      )
    )
    .returning({ id: outboxEvent.id })
  if (reset.length > 0) {
    logger.warn("Swept stuck outbox rows", { count: reset.length })
  }
  return { swept: reset.length }
}

/** Count terminally-failed (dead-lettered) events — the backlog needing a human. */
export async function countDeadLetters(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(outboxEvent)
    .where(eq(outboxEvent.status, "dead"))
  return Number(row?.value ?? 0)
}

// Flip a batch of pending/failed-and-due rows to `processing` atomically, so no
// two dispatchers deliver the same event.
async function claimBatch(batch: number): Promise<OutboxEvent[]> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(outboxEvent)
      .where(
        and(
          inArray(outboxEvent.status, ["pending", "failed"]),
          lte(outboxEvent.nextAttemptAt, new Date())
        )
      )
      .orderBy(outboxEvent.id)
      .limit(batch)
      .for("update", { skipLocked: true })

    if (due.length === 0) return []

    const ids = due.map((row) => row.id)
    // Stamp `nextAttemptAt` with the claim time: while a row sits in `processing`
    // this field is otherwise unused, so it doubles as the claim timestamp the
    // sweeper reads to detect a dispatcher that died mid-run.
    const claimedAt = new Date()
    await tx
      .update(outboxEvent)
      .set({
        status: "processing",
        attempts: sql`${outboxEvent.attempts} + 1`,
        nextAttemptAt: claimedAt,
      })
      .where(inArray(outboxEvent.id, ids))

    return due.map((row) => ({
      ...row,
      status: "processing" as const,
      attempts: row.attempts + 1,
      nextAttemptAt: claimedAt,
    }))
  })
}

async function runConsumers(row: OutboxEvent): Promise<void> {
  const consumers =
    (CONSUMERS as Record<string, Array<(payload: unknown) => Promise<void>>>)[
      row.eventType
    ] ?? []

  try {
    for (const consumer of consumers) {
      await consumer(row.payload)
    }
    await db
      .update(outboxEvent)
      .set({ status: "done", processedAt: new Date() })
      .where(eq(outboxEvent.id, row.id))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isDead = row.attempts >= MAX_ATTEMPTS
    await db
      .update(outboxEvent)
      .set({
        status: isDead ? "dead" : "failed",
        lastError: message.slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + backoffMs(row.attempts)),
      })
      .where(eq(outboxEvent.id, row.id))

    // A dead-lettered event is terminal and needs a human — report it at error
    // (alertable); a transient failure that will retry is a warning.
    if (isDead) {
      logger.error("Outbox event dead-lettered", error, {
        id: row.id,
        eventType: row.eventType,
        attempts: row.attempts,
      })
    } else {
      logger.warn("Outbox delivery failed; will retry", {
        id: row.id,
        eventType: row.eventType,
        attempts: row.attempts,
        error: message,
      })
    }
  }
}
