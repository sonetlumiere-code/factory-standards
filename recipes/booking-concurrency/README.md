# Recipe — booking concurrency (no double-booking)

Prevent two appointments from overlapping on the same scarce resource (staff member,
room, chair, machine) — the central invariant of any scheduling product. Enforced by a
**Postgres `EXCLUDE` constraint**, not app code.

Proven in a real booking SaaS dogfood, then generalized.

## Why a DB constraint, not app code

The obvious approach — "query for a conflicting slot, if none, insert" — **races**: two
requests both read "free" before either writes. Locking the table kills throughput. A GiST
`EXCLUDE` constraint makes the database reject an overlapping insert **atomically**, so two
concurrent bookings resolve to exactly one winner with no app-level coordination.

## What's in the box

- [`drizzle/migrations/0001_booking_exclude.sql`](./drizzle/migrations/0001_booking_exclude.sql)
  — the `btree_gist` extension, an **IMMUTABLE** `appointment_slot_range()` wrapper (needed
  because `timestamptz + interval` is only STABLE), and the `EXCLUDE` constraint itself.
- [`drizzle/schema/appointment.ts`](./drizzle/schema/appointment.ts) — illustrative table.
- [`data/appointment.ts`](./data/appointment.ts) — `createAppointment` that just inserts and
  translates the `23P01` exclusion violation into a typed `DoubleBookingError`.
- [`tests/integration/booking-concurrency.test.ts`](./tests/integration/booking-concurrency.test.ts)
  — the proof: concurrent-insert (exactly one wins), buffer window, cancel-frees-slot.

## Wiring

1. Add the schema; `drizzle-kit generate` for the table, then **hand-write** the EXCLUDE
   migration (drizzle-kit can't express EXCLUDE) — keep it as a custom SQL migration that
   runs after the table exists.
2. Copy `data/appointment.ts`; adapt imports.
3. Insert **inside a transaction** and let the constraint do the work — never read-then-write.

## Key design points

- **The equality column is the scarce resource.** Staff member here; swap for room/equipment,
  or model a `resource_booking(resource_id, slot)` row per resource if one appointment occupies
  several at once (put the EXCLUDE there).
- **The buffer is folded into the range** `[start, end + bufferMin)`, so a service's cool-down
  is unbookable too.
- **Only live statuses participate** (`WHERE status IN ('pending','confirmed')`), so a
  cancelled/no-show row frees its slot.
- **The `23P01` code can be nested** in the driver's `cause` chain — walk it (the helper does).

## Compose with

- **tenant-isolation** (multi-tenant): verify client-supplied `staffMemberId`/`customerId`/
  `serviceId` belong to the tenant inside the transaction — an FK proves existence, not
  in-tenant membership; skipping it lets a booker block a competitor's calendar.
- **transactional-outbox**: `emit(tx, …)` the confirmation event in the same transaction.
