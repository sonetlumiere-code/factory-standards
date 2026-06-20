/**
 * The typed domain-event catalog — the single source for every event name and its
 * payload shape. Payloads are JSON-serializable (ids and slugs, never entity
 * objects, never secrets) because they round-trip through the outbox `payload`
 * column; a consumer re-reads committed state via the data layer. Adding an event
 * here makes it emittable; wire a consumer in `consumers.ts` when one exists.
 *
 * Replace the example below with your real events.
 */
export type EventPayloads = {
  /**
   * Example: a user finished registration. Emitted inside the registration
   * transaction; the consumer sends a welcome email. `dedupKey` (`welcome:${userId}`)
   * makes it exactly-once even under at-least-once delivery.
   */
  UserRegistered: {
    userId: string
  }
}

export type EventName = keyof EventPayloads

/** A discriminated union over every catalog entry — what `emit` accepts. */
export type DomainEvent = {
  [K in EventName]: { type: K; payload: EventPayloads[K] }
}[EventName]

/**
 * Idempotency key for an event, or null when replays are allowed. Return a stable
 * key for any side effect that must happen at most once.
 */
export function dedupKeyFor(event: DomainEvent): string | null {
  switch (event.type) {
    case "UserRegistered":
      return `welcome:${event.payload.userId}`
    default:
      return null
  }
}
