# Recipe — Transactional Outbox

Deliver side effects **reliably**. A producer appends an event to an `outbox_event`
table **inside the same DB transaction** as the business write, so the event commits
iff the write commits. A dispatcher later claims pending rows and runs idempotent
consumers, with retry/backoff and a dead-letter terminal state. Implements baseline
**REL-1**.

## The problem it solves

The naive pattern — do the write, then fire the side effect after commit
(`runInBackground(sendEmail())` / `waitUntil`) — is **best-effort**: if the
serverless invocation is dropped after the row commits, the side effect is silently
lost. No error, no retry, no record. For a payment receipt or a provisioning call,
that's a real bug.

The outbox makes the side effect **part of the transaction**. It can't be lost,
because the intent to do it commits atomically with the data.

## When to use it

- Confirmation / receipt emails, welcome emails.
- Outgoing calls to a downstream service or an outbound webhook.
- In-app notifications that must appear.
- Anything where "the write happened but the side effect didn't" is a bug a user feels.

## When NOT to use it

- A pure CRUD app with no critical side effects → don't pull this in; it's dead weight.
- Side effects that are *fine to lose* (best-effort analytics ping) → plain `waitUntil`.
- A render-context API like `revalidatePath` → that throws from the background drain;
  call it inline in the producing action, not as a consumer.

## How it works

- **Emit** — `emit(tx, event)` inserts a row in the producing transaction. The
  `Tx`-only signature is the guarantee: no side effect runs at emit time, and the row
  rolls back with the write if the tx fails. Payloads are **ids only** (no entity
  objects, no secrets) — the consumer re-reads committed state via your data layer.
- **Dispatch** — `drainOutbox()` claims due rows with `FOR UPDATE SKIP LOCKED`
  (parallel drains never double-deliver), runs the consumers, marks `done`, or on a
  throw records `failed` with exponential backoff and finally `dead` after the attempt
  cap. A `dead` row is the durable "this never went out" record (log at error → alert).
- **Triggers** — two paths:
  1. **Fast path:** the producing action kicks `runInBackground(drainOutbox())` after
     commit, so the side effect usually fires within milliseconds.
  2. **Safety nets (cron):** `/api/outbox/drain` (claims due rows on a schedule) and
     `/api/cron/sweep-outbox` (`sweepStuck()` resets rows stranded in `processing` by a
     dispatcher that died mid-run, then drains).
- **Idempotency** — delivery is at-least-once, so consumers must be idempotent. The
  optional `dedupKey` bounds an event to one delivery (e.g. one welcome email per user).

## Files in this recipe

```
drizzle/schema/outbox.ts          the outbox_event table
lib/events/catalog.ts             typed event catalog + dedupKeyFor (example event)
lib/events/backoff.ts             pure backoff helper (unit-testable)
lib/events/emit.ts                emit(tx, event) — append inside the tx
lib/events/dispatcher.ts          drainOutbox / sweepStuck / countDeadLetters
lib/events/consumers.ts           event-name → side effects (example consumer)
app/api/outbox/drain/route.ts     cron-backed reliability drain (bearer-guarded)
app/api/cron/sweep-outbox/route.ts  cron-backed stuck-row sweeper
tests/integration/outbox.test.ts  claim-concurrency + dedup (testcontainers)
```

## Wiring it into a project

1. **Copy** the trees above into the matching paths. Adjust imports to your project:
   - `@/drizzle/db` — your Drizzle client. The dispatcher/emit also need a `Tx` type;
     export one from your db module: `export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]`.
   - `@/lib/logger` — your logger abstraction (baseline OBS-1).
   - `@/drizzle/schema` — re-export `outboxEvent` from your schema index.
2. **Migrate:** `pnpm db:generate && pnpm db:migrate` (the unpooled URL — baseline DB-1/DB-2).
3. **Env:** add `OUTBOX_DRAIN_SECRET` (and `CRON_SECRET` = same value, so Vercel's
   injected cron bearer matches). When unset, the cron endpoints 503 and only the
   post-commit kick delivers.
4. **`vercel.json`** crons (sub-daily needs Vercel Pro — baseline CRON-4):
   ```json
   {
     "crons": [
       { "path": "/api/outbox/drain", "schedule": "*/5 * * * *" },
       { "path": "/api/cron/sweep-outbox", "schedule": "*/15 * * * *" }
     ]
   }
   ```
5. **Emit + kick** in your producing action:
   ```ts
   await db.transaction(async (tx) => {
     // ...the business write...
     await emit(tx, { type: "UserRegistered", payload: { userId } })
   })
   runInBackground(drainOutbox()) // fast path; cron is the safety net
   ```
6. **Adapt** `catalog.ts` (your events) and `consumers.ts` (your real side effects).

## Invariants worth pinning in your spec

- The event is emitted **inside** the business transaction (the `Tx`-only `emit`
  signature enforces it).
- Payloads carry ids only — no entity rows, no secrets cross into the `payload` column.
- Consumers are idempotent (at-least-once delivery); a `dedupKey` bounds must-once events.
- The claim uses `FOR UPDATE SKIP LOCKED`; parallel drains never double-deliver.
