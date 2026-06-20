import "server-only"

import { sql } from "drizzle-orm"

import type { Tx } from "@/drizzle/db"
import { outboxEvent } from "@/drizzle/schema"

import { dedupKeyFor, type DomainEvent } from "./catalog"

/**
 * Append a domain event to the outbox **inside the caller's transaction**. The
 * `Tx`-only signature is the guarantee: the event row commits iff the business
 * write commits and rolls back with it — no side effect runs here. The dispatcher
 * delivers it after commit. See this recipe's README.
 *
 * Needs a `Tx` type exported from your db module:
 *   export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
 */
export async function emit(tx: Tx, event: DomainEvent): Promise<void> {
  await tx
    .insert(outboxEvent)
    .values({
      eventType: event.type,
      payload: event.payload,
      dedupKey: dedupKeyFor(event),
    })
    .onConflictDoNothing({
      target: outboxEvent.dedupKey,
      where: sql`${outboxEvent.dedupKey} is not null`,
    })
}
