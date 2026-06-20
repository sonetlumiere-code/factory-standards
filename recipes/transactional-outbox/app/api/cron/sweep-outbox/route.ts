import { env } from "@/lib/env/server"
import { drainOutbox, sweepStuck } from "@/lib/events/dispatcher"
import { logger } from "@/lib/logger"

// The Postgres driver isn't Edge-compatible; the sweep/drain mutate rows in a tx.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Cron-backed reliability sweeper: resets outbox rows stranded in `processing`
 * (a dispatcher that died mid-run) back to `failed`, then drains so the recovered
 * rows deliver in the same pass. Bearer-guarded against `OUTBOX_DRAIN_SECRET`.
 * Schedule less frequently than the drain. See this recipe's README.
 */
export async function GET(request: Request) {
  if (!env.OUTBOX_DRAIN_SECRET) {
    return Response.json({ error: "sweep disabled" }, { status: 503 })
  }
  if (
    request.headers.get("authorization") !==
    `Bearer ${env.OUTBOX_DRAIN_SECRET}`
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const swept = await sweepStuck()
    const drained = await drainOutbox({ batch: 50 })
    return Response.json({ ok: true, ...swept, ...drained })
  } catch (error) {
    logger.error("Outbox sweep failed", error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
