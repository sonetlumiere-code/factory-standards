import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

/**
 * Transactional outbox. A producer `emit`s a row inside the same transaction as
 * the business write, so the event commits iff the write commits. A dispatcher
 * later claims pending rows and runs the registered consumers, with retry/backoff
 * and a dead-letter terminal state. See this recipe's README.
 *
 * System-scoped, not tenant-scoped: rows carry their tenant id in the JSON payload
 * (so a consumer re-reads tenant-isolated state via the data layer), but the table
 * has no tenant column — the dispatcher is a platform process draining every tenant.
 * (Single-tenant app? There's no tenant id to carry — the consumer re-reads
 * owner-scoped state instead; the system-scoped dispatcher note still holds.)
 *
 * `eventType` is the typed catalog key (`lib/events/catalog.ts`); it carries no DB
 * CHECK on purpose — the catalog grows in TypeScript, and a CHECK would force a
 * migration per new event. `status` is a closed set, so it does get a CHECK.
 *
 * Remember to re-export this table from your schema index (`drizzle/schema/index.ts`).
 */
export const outboxEvent = pgTable(
  "outbox_event",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    /**
     * Idempotency key. When set, a partial-unique index blocks a duplicate emit
     * (e.g. `welcome:${userId}`); null means replays are allowed.
     */
    dedupKey: text("dedup_key"),
    status: text("status", {
      enum: ["pending", "processing", "done", "failed", "dead"],
    })
      .default("pending")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    // When the dispatcher may next claim this row — bumped on failure for backoff,
    // and stamped at claim time so a stalled `processing` row exposes its age.
    nextAttemptAt: timestamp("next_attempt_at").defaultNow().notNull(),
  },
  (table) => [
    index("outbox_event_claim_idx").on(table.status, table.nextAttemptAt),
    uniqueIndex("outbox_event_dedup_key_uidx")
      .on(table.dedupKey)
      .where(sql`${table.dedupKey} is not null`),
    check(
      "outbox_event_status_valid",
      sql`${table.status} in ('pending', 'processing', 'done', 'failed', 'dead')`
    ),
  ]
)
