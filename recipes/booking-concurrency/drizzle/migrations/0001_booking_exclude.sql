-- Anti-double-booking, enforced by the DATABASE, not app code. A read-then-check-
-- then-insert in app code races; a Postgres EXCLUDE constraint is atomic.
--
-- btree_gist lets a GiST exclusion constraint mix equality (resource_id, here the
-- staff member) with range overlap (&&). The booked range folds the service buffer
-- into the upper bound: [starts_at, ends_at + buffer_min minutes). Only LIVE
-- statuses (pending/confirmed) participate via the WHERE predicate, so a
-- cancelled/no-show row frees its slot.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- `timestamptz + interval` is only STABLE (Postgres can't assume tz-independence in
-- general), so it can't go directly in an index/constraint expression. A MINUTE
-- interval IS genuinely timezone-independent, so wrap the range construction in an
-- IMMUTABLE SQL function — the standard, safe technique for exactly this case.
CREATE OR REPLACE FUNCTION appointment_slot_range(
  starts_at timestamptz,
  ends_at timestamptz,
  buffer_min integer
) RETURNS tstzrange
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT tstzrange(starts_at, ends_at + make_interval(mins => buffer_min), '[)')
$$;

ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (
    "staff_member_id" WITH =,
    appointment_slot_range("starts_at", "ends_at", "buffer_min") WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed'));

-- Generalizing: the equality column is the SCARCE RESOURCE. Here it's the staff
-- member. If appointments instead consume a room/chair/machine, make it the
-- resource id; if one appointment occupies several resources at once, model a
-- `resource_booking(resource_id, slot)` row per resource and put the EXCLUDE there.
