#!/usr/bin/env node
// Link-integrity check for factory-standards' own docs — the factory eating its own
// cooking (agentic-coding preaches link-integrity tests; this applies it here).
//
// Verifies every RELATIVE markdown link (`./x.md`, `../dir/y`) points at a file that
// exists. Skips URLs, mailto, and pure anchors. Exits 1 on any dangling link.
//
// `skeleton/` is EXCLUDED on purpose: it's a template whose `docs/spec/*.md` links are
// placeholders the bootstrap fills in per project — they resolve once an app is scaffolded,
// not in the bare template.

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const EXCLUDE_DIRS = ["skeleton", "node_modules", ".git"]

const files = execSync("git ls-files '*.md'", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !EXCLUDE_DIRS.some((d) => f === d || f.startsWith(`${d}/`)))

const LINK = /\]\(([^)]+)\)/g
let broken = 0

for (const file of files) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8")
  const dir = path.dirname(file)
  let m
  while ((m = LINK.exec(src))) {
    let target = m[1].trim().split(/\s+/)[0] // drop optional "title"
    if (/^(https?:|mailto:|#)/.test(target)) continue // external / anchor-only
    target = target.split("#")[0] // strip in-page anchor
    if (!target || target.startsWith("<")) continue
    const resolved = path.join(dir, target)
    if (!fs.existsSync(path.join(ROOT, resolved))) {
      console.error(`✗ ${file} → ${m[1]}`)
      broken++
    }
  }
}

if (broken > 0) {
  console.error(`\n${broken} broken relative link(s). Fix them or update the reference.`)
  process.exit(1)
}
console.log(`link-check: OK — all relative markdown links resolve (skeleton/ excluded).`)
