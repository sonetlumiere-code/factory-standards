import "server-only"

import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres"
import { Pool as PgPool } from "pg"
import ws from "ws"

import { env } from "@/lib/env/server"
import { logger } from "@/lib/logger"

import * as schema from "./schema"

/**
 * Canonical DB client (DB-1). One file, two drivers, picked at runtime by host.
 *
 * Vercel + Neon → the **neon-serverless** (WebSocket) driver against the POOLED
 * endpoint: no per-invocation TCP setup / connection-pool exhaustion on the
 * serverless fleet, and it supports transactions (the HTTP driver doesn't).
 * Local Postgres / testcontainers (127.0.0.1) → **node-postgres**, because the
 * Neon driver can't reach a non-Neon host. We sniff the host and branch; the
 * drizzle query API is identical across both, so every consumer stays the same.
 *
 * `DATABASE_URL` MUST be the **pooled** connection string at runtime; migrations
 * use the **unpooled** `DATABASE_URL_UNPOOLED` (see `drizzle.config.ts`).
 *
 * ⚠️ The `ws` line is not optional: the Node runtime Vercel pins has no global
 * WebSocket, so the neon-serverless driver needs an explicit constructor. Omit it
 * and the Neon connection fails in production. (`neonConfig` is module-global, so
 * setting it once here is enough.)
 */

const url = env.DATABASE_URL
const isNeon = /\.neon\.tech/.test(url)

let pgPool: PgPool | null = null

function makeDb(): NodePgDatabase<typeof schema> {
  if (isNeon) {
    neonConfig.webSocketConstructor = ws
    const pool = new NeonPool({ connectionString: url })
    // Neon + node-postgres expose the same drizzle query API; the cast keeps a
    // single `DB` type at every call site. Runtime behavior is identical.
    return drizzleNeon(pool, {
      schema,
      casing: "snake_case",
    }) as unknown as NodePgDatabase<typeof schema>
  }
  pgPool = new PgPool({ connectionString: url })
  // Don't let an idle-client error (DB went away) crash the process.
  pgPool.on("error", (error) =>
    logger.error("pg pool error", { error: error.message })
  )
  return drizzlePg(pgPool, { schema, casing: "snake_case" })
}

export const db = makeDb()
export type DB = typeof db

/**
 * A transaction handle — what `db.transaction(async (tx) => …)` passes. Derived
 * once here so helpers that must run inside a transaction (outbox `emit(tx, …)`,
 * the booking insert, …) share one type instead of repeating the `Parameters<…>`
 * chain at every call site.
 */
export type Tx = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0]

/** Close the node-postgres pool (no-op on Neon). Used by integration teardown. */
export async function closeDb(): Promise<void> {
  await pgPool?.end()
  pgPool = null
}
