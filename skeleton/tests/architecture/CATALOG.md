# Architecture-guard catalog

The reusable "muscles" (Pattern B in [agentic-coding.md](../../../agentic-coding.md)) — the
factory's most valuable, most copied asset. Instead of reinventing a guard per project, **the
bootstrap composes from this menu**: pick the rows that match the app's answers, paste the
snippet into `architecture-invariants.test.ts`, and adapt the tokens/globs.

All guards are **pure file checks** (no DB, no runtime) and reuse two helpers already in
`architecture-invariants.test.ts` — `walkTs(dir)` and `parseExportedFunctions(src)`. Add a new
guard by appending a `describe()` block; keep them inert until their directory exists so a fresh
scaffold stays green.

> ⚠️ A green guard proves a rule's **shape**, not its **correctness** — see
> [anti-patterns.md](../../../anti-patterns.md) AP-1. Pair every critical-invariant guard with
> an integration test of the negative case.

## The menu

| Guard | Proves | Apply when | Where it lives |
| ----- | ------ | ---------- | -------------- |
| **scope-isolation (tenant)** | a `data/*` fn that takes a tenant id uses it | multi-tenant | template (keep this block) |
| **scope-isolation (ownership)** | a `data/*` fn that takes an owner id uses it | single-tenant / single-admin | template (keep this block) |
| **server-action authorization** | every `*actions.ts` gates on `hasPermission()` | any app with mutations + auth | template |
| **data-layer server-only** | every `data/*` file imports `"server-only"` | any app with a data layer | snippet below |
| **action-result shape** | actions return `ok()`/`fail()`, never raw `{ error }` | apps using the typed action-result convention | snippet below |
| **money integer cents** | `Math.round(x*100)` banned outside `lib/money.ts` | apps handling money | **lint**, not a test — see [tooling-config.md](../../../tooling-config.md) `MONEY_RULE` |
| **public-row boundary** | client-bound code uses `Public*`/`*Safe`, never raw rows | apps sending DB rows to the client | convention + types (no simple static guard — assert in review / types) |
| **no deprecated middleware** | no `middleware.ts` at root on Next ≥16 (use `proxy.ts`) | Next 16 apps | snippet below (AP-8 / NEXT-7) |

Keep **one** scope-isolation block (tenant **or** ownership), per the tenancy answer. Delete
the other — see [bootstrap-interactive.md](../../../bootstrap-interactive.md) Q2.

## Snippets (paste + adapt)

### data-layer server-only (DB-5)
```ts
describe("data layer is server-only — DB-5", () => {
  for (const file of walkTs("data")) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
    it(`${file} imports "server-only"`, () => {
      expect(
        /import\s+["']server-only["']/.test(src),
        `${file} is in the data layer but doesn't import "server-only" — it could ` +
          `leak into a client bundle. Add \`import "server-only"\` at the top.`
      ).toBe(true)
    })
  }
})
```

### action-result shape (INV-4)
```ts
describe("server actions return a typed result — INV-4", () => {
  const files = ["actions", "app"]
    .flatMap(walkTs)
    .filter((f) => /actions\.tsx?$/.test(path.basename(f)))
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
    it(`${file} returns ok()/fail(), not a raw { error }`, () => {
      expect(
        /return\s*\{\s*error\b/.test(src) === false,
        `${file} returns a raw { error } — use the typed ok()/fail() helpers instead.`
      ).toBe(true)
    })
  }
})
```

### no deprecated middleware (NEXT-7 / AP-8)
```ts
import fs from "node:fs"
describe("no deprecated middleware.ts (Next 16 → proxy.ts)", () => {
  it("uses proxy.ts, not the deprecated middleware.ts", () => {
    const has = (f: string) => fs.existsSync(path.join(ROOT, f)) || fs.existsSync(path.join(ROOT, "src", f))
    expect(
      has("middleware.ts") === false && has("middleware.js") === false,
      `Next 16 renamed middleware → proxy. Rename to proxy.ts (function proxy()) — ` +
        `codemod: npx @next/codemod@canary middleware-to-proxy .`
    ).toBe(true)
  })
})
```

> These are heuristics, not proofs — they catch the common slip, not every variant. When a
> guard can't express a rule (public-row boundary, money math edge cases), fall back to types +
> the adversarial review pass ([agentic-coding.md](../../../agentic-coding.md) #9).
