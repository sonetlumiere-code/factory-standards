import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Architecture-invariant guards — the "muscles" (Pattern B in agentic-coding.md).
 * Unlike the citation/catalog guards (which prove docs *reference* real code),
 * these prove a rule is actually *held* in code, failing the build on a violation.
 *
 * Three guards ship here as working templates. **Adapt the tokens/globs to your app**
 * (your scope-id column name, your permission-check call, your mutation dirs).
 * All are inert until the relevant directories exist, so a freshly-scaffolded
 * project stays green and the guards activate as you add the data/action layers.
 *
 * SCOPE ISOLATION comes in two modes — keep the one that matches your app, delete
 * the other. They are mutually-exclusive framings of the same rule ("a data-layer
 * function that accepts a scope id MUST filter by it"), and each is inert until its
 * tokens appear, so leaving both in place is harmless on a fresh scaffold:
 *   - Guard 1a — TENANT isolation (multi-tenant apps): rows belong to an org/store;
 *     the tenant-id filter is the security boundary between tenants.
 *   - Guard 1b — OWNERSHIP isolation (single-tenant / single-admin apps): there is
 *     no tenant, so the boundary is per-user — a user reads only their own rows.
 * The interactive bootstrap picks the mode; if you scaffold by hand, pick one here.
 */

const ROOT = process.cwd()

function walkTs(dir: string): string[] {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  const out: string[] = []
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walkTs(rel))
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
      out.push(rel)
  }
  return out
}

type Fn = { name: string; params: string; body: string }

// Parses `export [async] function NAME(...)` — the data-layer / action convention.
// Arrow-function exports aren't covered; if you use them, extend this matcher.
function parseExportedFunctions(src: string): Fn[] {
  const out: Fn[] = []
  const re = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let i = re.lastIndex
    let depth = 1
    const pStart = i
    while (i < src.length && depth > 0) {
      const c = src[i++]
      if (c === "(") depth++
      else if (c === ")") depth--
    }
    const params = src.slice(pStart, i - 1)
    const rest = src.slice(i)
    const next = rest.search(/\nexport\s/)
    const body = next === -1 ? rest : rest.slice(0, next)
    out.push({ name: m[1], params, body })
  }
  return out
}

// ── Guard 1a: tenant isolation (multi-tenant apps) ──────────────────────────
// Every data-layer function that ACCEPTS a tenant id must USE it in its body.
// A function that takes `storeId` but never references it is a cross-tenant leak:
// the filter is the security boundary, so a missing filter is a vulnerability.
// Delete this block if your app is single-tenant — use Guard 1b instead.
const TENANT_ID = /\b(storeId|orgId|organizationId|tenantId)\b/

describe("tenant isolation (data layer)", () => {
  const files = walkTs("data")

  if (files.length === 0) {
    it("no data/ layer yet — guard activates once you add one", () => {
      expect(files.length).toBe(0)
    })
  }

  for (const file of files) {
    const fns = parseExportedFunctions(fs.readFileSync(path.join(ROOT, file), "utf8"))
    for (const fn of fns) {
      if (!TENANT_ID.test(fn.params)) continue
      it(`${file} → ${fn.name}() uses its tenant id`, () => {
        expect(
          TENANT_ID.test(fn.body),
          `${fn.name}() in ${file} accepts a tenant id but never references it ` +
            `in its body. A data-layer function that takes a tenant id MUST scope ` +
            `its query by it — a missing filter is a cross-tenant leak.`
        ).toBe(true)
      })
    }
  }
})

// ── Guard 1b: ownership isolation (single-tenant / single-admin apps) ────────
// The single-tenant counterpart of Guard 1a: with no tenant, the boundary is the
// owner. Every data-layer function that ACCEPTS an owner id must USE it in its
// body — a function that takes `userId` but never references it lets one user read
// another's rows (a cross-owner leak). Delete this block if your app is multi-tenant.
//
// NOTE: `userId` is broad — a function may legitimately take it for a non-scoping
// reason (e.g. `createUser(... userId)` writing an audit column). Trim OWNER_ID to
// the column names that actually scope ownership in YOUR data layer, the same way
// you'd adapt TENANT_ID above.
const OWNER_ID = /\b(userId|ownerId|accountId|customerId)\b/

describe("ownership isolation (data layer)", () => {
  const files = walkTs("data")

  if (files.length === 0) {
    it("no data/ layer yet — guard activates once you add one", () => {
      expect(files.length).toBe(0)
    })
  }

  for (const file of files) {
    const fns = parseExportedFunctions(fs.readFileSync(path.join(ROOT, file), "utf8"))
    for (const fn of fns) {
      if (!OWNER_ID.test(fn.params)) continue
      it(`${file} → ${fn.name}() uses its owner id`, () => {
        expect(
          OWNER_ID.test(fn.body),
          `${fn.name}() in ${file} accepts an owner id but never references it ` +
            `in its body. A data-layer function that takes an owner id MUST scope ` +
            `its query by it — a missing filter is a cross-owner leak (one user ` +
            `reading another's rows).`
        ).toBe(true)
      })
    }
  }
})

// ── Guard 2: mutations are authorized ───────────────────────────────────────
// Every exported server action in a mutation surface must gate on a server-side
// permission check. Client checks are UX only. ADAPT: set MUTATION_DIRS to where
// your authored actions live, PERMISSION_CALL to your check, and add deliberate
// exemptions (public/session-optional actions) to EXEMPT with a reason.
const MUTATION_DIRS = ["actions", "app"] // scanned for files named *actions.ts
const PERMISSION_CALL = /hasPermission\s*\(/
const EXEMPT: Record<string, string> = {
  // "app/(store)/checkout/actions.ts": "storefront — session-optional, not RBAC-gated",
}

describe("server-action authorization", () => {
  const files = MUTATION_DIRS.flatMap(walkTs).filter((f) =>
    /actions\.tsx?$/.test(path.basename(f))
  )

  if (files.length === 0) {
    it("no action files yet — guard activates once you add them", () => {
      expect(files.length).toBe(0)
    })
  }

  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
    it(`${file} gates its mutations on a permission check`, () => {
      if (EXEMPT[file]) return // deliberately un-gated, documented above
      const hasExportedAction = /export\s+(?:async\s+)?function\s/.test(src)
      if (!hasExportedAction) return
      expect(
        PERMISSION_CALL.test(src),
        `${file} exports a server action but never calls the permission check. ` +
          `Mutations must be server-authoritative; add the check, or add ${file} ` +
          `to EXEMPT with a reason.`
      ).toBe(true)
    })
  }
})
