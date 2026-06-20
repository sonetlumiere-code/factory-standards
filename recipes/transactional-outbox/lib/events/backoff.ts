// Exponential backoff for outbox redelivery. Kept in its own pure module (no
// `server-only` / db imports) so it's unit-testable. Attempt N waits
// BASE * 2^(N-1), capped at MAX. See dispatcher.ts.

export const BASE_BACKOFF_MS = 60_000
export const MAX_BACKOFF_MS = 60 * 60_000

export function backoffMs(attempts: number): number {
  return Math.min(
    BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1),
    MAX_BACKOFF_MS
  )
}
