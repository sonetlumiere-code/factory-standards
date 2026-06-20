import "server-only"

import { logger } from "@/lib/logger"

import type { EventName, EventPayloads } from "./catalog"

/**
 * A consumer is a side effect for one event. Consumers run AFTER the producing
 * transaction commits, so they read committed state and must tolerate
 * at-least-once delivery (be idempotent). The dispatcher retries a throwing
 * consumer with backoff and dead-letters it after the cap.
 */
type Consumer<K extends EventName> = (
  payload: EventPayloads[K]
) => Promise<void>

type ConsumerRegistry = { [K in EventName]?: Consumer<K>[] }

/**
 * Event-name → consumers. Events without an entry are still emitted and drained
 * (the outbox doubles as an append-only audit log) but have no side effect yet.
 */
export const CONSUMERS: ConsumerRegistry = {
  UserRegistered: [
    async (p) => {
      // Replace this with your real side effect. The consumer runs after the
      // producing tx commits, so re-read committed state via your data layer and
      // call the integration (e.g. Resend — see stack.md). Keep it idempotent;
      // the catalog's dedup key bounds this to one delivery per user.
      logger.info("UserRegistered consumed", { userId: p.userId })
      // e.g.:
      //   const user = await getUserById(p.userId)
      //   if (user) await sendWelcomeEmail({ email: user.email, name: user.name })
    },
  ],
}
