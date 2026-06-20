# Tooling Configuration

The exact lint/format/type/editor config every project starts with. Copy these
verbatim, then add project-specific guards. House style: **no semicolons, double
quotes, 2-space indent** (Prettier-enforced — never argue about it in review).

IDs: `TOOL-<n>`. Levels: **MUST / SHOULD / MAY**.

---

## TOOL-1 (MUST) — Prettier

One formatter, zero debate. Config (`.prettierrc`):

```json
{
  "semi": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- `prettier-plugin-tailwindcss` auto-sorts Tailwind class names — drop it if not using Tailwind.
- `.prettierignore` must exclude generated artifacts so the formatter doesn't fight their
  generator:

  ```
  .next
  node_modules
  pnpm-lock.yaml
  build
  out
  # Generated files are owned by their generator, not Prettier:
  docs/spec/schema.generated.md
  ```

- Wire `eslint-config-prettier` (below) so ESLint never reports formatting — Prettier owns it.
- Scripts: `"format": "prettier --write ."`, and a `"format:check": "prettier --check ."` for CI.

## TOOL-2 (MUST) — ESLint (flat config) + project guards

ESLint catches *correctness and architecture* violations; Prettier owns formatting. Use the
flat config (`eslint.config.mjs`). Baseline + the highest-leverage idea — **encode
architecture rules the type system can't express as `no-restricted-syntax` guards**:

```js
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettierConfig from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

// Example architecture guard: ban `process.env.X` outside the env module so every
// var is validated once. (NODE_ENV is the one allowed direct access.)
const PROCESS_ENV_RULE = {
  selector:
    "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env']:not([property.name='NODE_ENV'])",
  message:
    "Use `env` from `@/lib/env/server` or `@/lib/env/client`, not `process.env` directly.",
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig, // MUST be last — turns off all formatting rules.
  {
    rules: {
      "no-restricted-syntax": ["error", PROCESS_ENV_RULE],
    },
  },
  // Narrow exceptions are explicit + reviewable (the env module itself is allowed):
  { files: ["lib/env/*.ts", "*.config.ts"], rules: { "no-restricted-syntax": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
```

**Guards worth adding per project** (all proven, high-leverage rules):

- **Banned `process.env` outside the env module** (the `PROCESS_ENV_RULE` above).
- **Money: ban `Math.round(X * 100)` outside the `toCents()` boundary** — forces all
  float→integer-cents conversion through one helper (a sibling `no-restricted-syntax` rule).
- **Drizzle safety: `eslint-plugin-drizzle`** with `enforce-delete-with-where` +
  `enforce-update-with-where` — a `DELETE`/`UPDATE` without a `WHERE` fails lint.
- **Import sorting: `eslint-plugin-simple-import-sort`** — deterministic import order, no churn.
- **CQRS / layering: the `data/` read-only or `server-only` boundary** as an override block.

The pattern: a recurring review nit or a "you must always do X here" rule becomes a guard,
so the agent (and humans) get the feedback at lint time instead of in review. Allowlist
exceptions explicitly, with a comment saying why — never a blanket disable.

## TOOL-3 (MUST) — TypeScript

`strict: true`, no exceptions. Plus:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true, // arr[i] is T | undefined — catches off-by-one
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true, // explicit import type
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./*"] }
  }
}
```

- `pnpm typecheck` = `tsc --noEmit`, run separately from `next build` so CI gets a fast,
  DB-free type gate.
- Never inline `$inferSelect`/`$inferInsert` — derive types in one `drizzle/types.ts` and
  import from there.

## TOOL-4 (SHOULD) — EditorConfig

Cross-editor baseline so contributors not using the Prettier-on-save setup still match
(`.editorconfig`). ❌ neither reference repo has one yet — add it:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

## TOOL-5 (SHOULD) — package.json scripts (the standard surface)

Every project exposes the same verbs, so an agent never has to guess:

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "drizzle-kit migrate && next build", // migrate runs first (DB-2)
    "start": "next start",
    "lint": "eslint",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run", // full suite (Docker for integration)
    "test:unit": "vitest run --project unit", // fast, no Docker
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx drizzle/seed.ts"
  }
}
```

## TOOL-6 (SHOULD) — Engine + package-manager pins

```jsonc
{
  "packageManager": "pnpm@10.x", // exact, so CI + local + Vercel agree
  "engines": { "node": ">=20", "pnpm": ">=10" }
}
```

Add a matching `.nvmrc` (`20`). Vercel and `actions/setup-node` both read it.

## TOOL-7 (MAY) — Git hooks

`husky` + `lint-staged` to run Prettier + ESLint on staged files pre-commit, so unformatted
code never lands. Keep it light — the real gate is CI; hooks are fast feedback. Don't run the
full test suite on commit (too slow); run it in CI.

---

## Quick scaffold checklist

- [ ] `.prettierrc` + `.prettierignore` (TOOL-1)
- [ ] `eslint.config.mjs` flat config, `prettierConfig` last, project guards added (TOOL-2)
- [ ] `tsconfig.json` strict + `noUncheckedIndexedAccess` (TOOL-3)
- [ ] `.editorconfig` (TOOL-4)
- [ ] Standard `scripts` surface (TOOL-5)
- [ ] `packageManager` + `engines` + `.nvmrc` (TOOL-6)
- [ ] `lint`, `format:check`, `typecheck`, `test` all run in CI
