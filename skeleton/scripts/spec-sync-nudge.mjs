#!/usr/bin/env node
// spec-sync nudge — "docs follow code in the same change" (agentic-coding.md idea #7).
//
// Warns when behavior files change in a diff but no docs/spec/ file changed alongside
// them. The citation/catalog guards prove docs *reference* real code; this catches the
// other direction — code that moved without its spec being revisited.
//
// It's a NUDGE: exits 0 (warn-only) by default so it never blocks a merge on a judgment
// call. Pass --strict to make it fail the build instead.
//
// Usage:
//   node scripts/spec-sync-nudge.mjs            # diff vs merge-base with origin/main
//   node scripts/spec-sync-nudge.mjs --strict   # exit 1 on a gap (hard gate)
//   SPEC_SYNC_BASE=<sha> SPEC_SYNC_HEAD=<sha> node scripts/spec-sync-nudge.mjs
//
// ADAPT to your app: BEHAVIOR is "code whose change should be reflected in the spec."
// Add your action/data/schema dirs; SPEC_DIR is where the canonical spec lives.

import { execSync } from "node:child_process"

// ── Config — adapt these globs to your layout ───────────────────────────────
const BEHAVIOR = [
  /(^|\/)actions\.tsx?$/, // app/**/actions.ts — server actions
  /(^|\/)actions\//, // an actions/ directory
  /^drizzle\/schema\//, // DB schema
  /^data\//, // the data layer
]
const SPEC_DIR = /^docs\/spec\//
const STRICT = process.argv.includes("--strict")

// ── Resolve the diff range ──────────────────────────────────────────────────
function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim()
}

function range() {
  const { SPEC_SYNC_BASE, SPEC_SYNC_HEAD } = process.env
  if (SPEC_SYNC_BASE && SPEC_SYNC_HEAD) return `${SPEC_SYNC_BASE} ${SPEC_SYNC_HEAD}`
  // Fall back to the merge-base with origin/main (works locally and in most CI).
  try {
    const base = sh("git merge-base origin/main HEAD 2>/dev/null")
    return `${base} HEAD`
  } catch {
    // No origin/main (shallow clone / fresh repo): diff the last commit.
    return "HEAD~1 HEAD"
  }
}

function warn(msg) {
  // GitHub Actions annotation when available; plain text otherwise.
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${msg}`)
  else console.warn(`⚠️  ${msg}`)
}

// ── Run ─────────────────────────────────────────────────────────────────────
let files
try {
  files = sh(`git diff --name-only ${range()}`).split("\n").filter(Boolean)
} catch (e) {
  console.error(`spec-sync: could not compute the diff (${e.message}). Skipping.`)
  process.exit(0)
}

const touchedBehavior = files.filter((f) => BEHAVIOR.some((re) => re.test(f)))
const touchedSpec = files.some((f) => SPEC_DIR.test(f))

if (touchedBehavior.length > 0 && !touchedSpec) {
  warn(
    `Behavior changed but docs/spec/ did not. Re-read the matching spec and update it ` +
      `in this change (precedence: Code → docs/spec/ → CLAUDE.md). Files:\n  ` +
      touchedBehavior.join("\n  ")
  )
  process.exit(STRICT ? 1 : 0)
}

console.log("spec-sync: OK — behavior changes are accompanied by a docs/spec/ update.")
process.exit(0)
