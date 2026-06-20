import { env } from "@/lib/env/server"
import { countDeadLetters, drainOutbox } from "@/lib/events/dispatcher"
import { logger } from "@/lib/logger"

// The Postgres driver isn't Edge-compatible; the drain claims rows in a tx.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Cron-backed reliability drain (the post-commit kick is the fast path).
 * Bearer-guarded against `OUTBOX_DRAIN_SECRET`; disabled when the secret is unset.
 * Vercel injects `Authorization: Bearer $CRON_SECRET`, so set CRON_SECRET to the
 * same value. See this recipe's README.
 */
export async function GET(request: Request) {
  if (!env.OUTBOX_DRAIN_SECRET) {
    return Response.json({ error: "drain disabled" }, { status: 503 })
  }
  if (
    request.headers.get("authorization") !==
    `Bearer ${env.OUTBOX_DRAIN_SECRET}`
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const result = await drainOutbox({ batch: 50 })
    // Surface the dead-letter backlog so a monitor can alarm on it.
    const deadLetters = await countDeadLetters()
    if (deadLetters > 0) {
      logger.warn("Outbox has dead-lettered events", { deadLetters })
    }
    return Response.json({ ok: true, ...result, deadLetters })
  } catch (error) {
    logger.error("Outbox drain failed", error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
