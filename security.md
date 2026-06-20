# Security Guide

The **how** behind the baseline's `SEC-*` items — concrete patterns for the cross-cutting
security behavior that doesn't live in any single domain doc. The baseline is the checklist;
this is the implementation guide. Applies to anything with a server runtime (full-stack web,
API service); a static site uses the headers/deps subset only.

> Provider note: the canonical stack is named (Better Auth, Upstash, Neon/Postgres). The
> patterns are what matter — swap providers only with a justified deviation.

---

## 1. Rate limiting & abuse protection (SEC-6)

Throttle abuse-prone surfaces. The trap on a serverless fleet: **an in-memory limiter is a
`Map` in one ephemeral lambda** — counters are per-instance and reset on every cold start,
so an attacker who lands on different instances (or waits out a recycle) sails past a
"3 per 60s" limit. The real ceiling is far higher than it looks. Two surfaces reach the
server by different paths, so they get two limiters:

| Surface | Path | Limiter | Store |
| ------- | ---- | ------- | ----- |
| Login / signup / OTP / password reset | Better Auth handler (`/api/auth/*`) | Better Auth built-in | **Postgres** (`rate_limit` table) |
| Checkout, self-enroll, lead capture, public API routes | server actions / route handlers | a sliding-window limiter (`@upstash/ratelimit`) | **Upstash Redis** (REST) |

### Auth endpoints → Postgres, not Upstash
Better Auth ships a limiter **enabled by default in production** that already covers the
sensitive auth paths. The gap is **storage**: it defaults to **in-memory**. Set it to the
database so counters hold across every instance:

```ts
// lib/auth/auth.ts
betterAuth({
  rateLimit: { storage: "database" }, // counters in the `rate_limit` table (Postgres)
  // do NOT use secondary-storage here — that also relocates sessions out of Postgres,
  // which breaks DB-backed sessions / session hooks / cookie-cache.
})
```
Why Postgres and not Upstash for this half: auth requests already hit Postgres (no new hot
path), and it keeps auth's abuse protection from depending on a second vendor being
reachable. This rides on the default `x-forwarded-for` IP, which is what Vercel sets. It's
**production-only** (inert in dev/tests).

### Custom surfaces → Upstash, keyed by IP **and** identifier
Server actions POST to the page route, not `/api/auth/*`, so Better Auth's limiter never
sees them — public ones (lead/contact forms, checkout) are spam magnets. Gate them with a
sliding window over **Upstash Redis (REST)** — HTTP-based (serverless can't pool sockets),
and it can key by an arbitrary identifier (email/phone/user id) that a coarse IP-only edge
firewall can't. **Key on both IP and identifier** and trip if either exceeds its window: one
abusive IP can't lock out honest buyers behind a NAT, and one identifier can't fan out
across IPs.

### Fail-open, by design
The custom limiter **allows** the request when Upstash is unconfigured (dev/CI) or a Redis
call throws — log it and continue. A limiter that hard-blocks paying customers on an infra
hiccup is worse than the abuse it prevents, and the action still runs its full validation.
(The auth half is independent — it rides on Postgres.)

### Operational notes
- Set `UPSTASH_REDIS_REST_URL` / `_TOKEN` in the host before live traffic; until then the
  custom limiter is a silent no-op.
- The `rate_limit` table accumulates one row per key and never deletes — revisit with a
  cleanup job if distinct keys grow unbounded.
- A WAF / edge firewall IP rule is a reasonable **complementary** coarse shield, but it
  can't replace per-identifier limits.

---

## 2. The rest of the SEC-* surface (pointers)

These are pinned in the [baseline](./vercel-nextjs-production-baseline.md); the one-liners
here are the intent.

- **Security headers (SEC-1):** HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and a **nonce-based CSP** (start report-only,
  then enforce). For an API service set these per-route + a CORS allowlist.
- **Validate all input (SEC-3):** Zod at every boundary (actions, route handlers, webhooks),
  schemas in `lib/validations/*`, never inline.
- **Server-authoritative authz (SEC-4):** `hasPermission(...)` on every mutation; client
  checks are UX only. Enforced by an architecture guard.
- **Auth hardening (SEC-5):** httpOnly + Secure + SameSite cookies, CSRF protection,
  server-side session validation.
- **Webhooks (SEC-7):** verify the provider signature **before** parsing the body; dedupe
  with an idempotency table (`UNIQUE(provider, external_id)` + `ON CONFLICT DO NOTHING`).
- **Encrypt third-party secrets at rest (SEC-8):** payment tokens, per-user/tenant API keys
  — app-level AES-GCM or DB column encryption. Rotate secrets (ENV-7).
- **Dependency scanning (SEC-9):** Dependabot/Renovate + `pnpm audit` gated in CI.
- **Never log secrets/PII (SEC-11):** structured context is for IDs, not bodies/tokens.
- **Uploads:** when media is enabled (Cloudinary), validate type/size at the boundary and
  allowlist the host in `next.config` `remotePatterns` + the CSP.
- **Audit log:** record sensitive admin actions (who unlocked/granted/refunded what, when) —
  cheap insurance for a single-admin or high-trust surface.

---

## Checklist

- [ ] Better Auth `rateLimit.storage = "database"` (not the in-memory default).
- [ ] Custom public surfaces gated by an Upstash sliding window, keyed IP **+** identifier.
- [ ] Rate limiter **fails open** (allow + log) when the store is unreachable/unconfigured.
- [ ] Security headers + nonce CSP on every route (or per-route + CORS for an API).
- [ ] Zod at every boundary; authz on every mutation; webhooks verified + idempotent.
- [ ] Third-party secrets encrypted at rest; no secrets/PII in logs.
- [ ] Uploads validated + host allowlisted; sensitive admin actions audit-logged.
