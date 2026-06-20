import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { collectMarkdown, REPO_ROOT, SPEC_DIR } from "./citation-lib"

/**
 * Stable-ID guard:
 *
 *   1. Reference integrity — every `INV-<n>` referenced anywhere in docs/spec/
 *      must be defined in its catalog. Catches a reference to a renamed/deleted ID.
 *   2. Append-only snapshot — the ordered ID list is pinned in
 *      `snapshots/catalog-ids.json`. The test fails if an ID disappears or moves.
 *      A legitimate new ID appends to BOTH the catalog file and the snapshot in
 *      the same change.
 *
 * Add a CATALOGS row per prefix you use (INV-, BR-, C-, R-, …).
 */

type Catalog = {
  name: string
  /** Path (relative to repo root) of the file defining this catalog's entries. */
  file: string
  /** Matches a heading that DEFINES an id; capture group 1 = the number. */
  headingPattern: RegExp
  /** Matches a REFERENCE to this catalog in prose; capture group 1 = the number. */
  referencePattern: RegExp
  prefix: string
}

const CATALOGS: Catalog[] = [
  {
    name: "Invariants",
    file: "docs/spec/invariants.md",
    headingPattern: /^### INV-(\d+)/gm,
    referencePattern: /\bINV-(\d+)\b/g,
    prefix: "INV",
  },
  // Add more as you introduce them, e.g.:
  // { name: "Business rules", file: "docs/spec/business-rules.md",
  //   headingPattern: /^### BR-([A-Z]+-\d+)/gm, referencePattern: /\bBR-([A-Z]+-\d+)\b/g, prefix: "BR" },
]

const SNAPSHOT_PATH = path.join(
  REPO_ROOT,
  "tests/spec/snapshots/catalog-ids.json"
)
const snapshot: Record<string, string[]> = JSON.parse(
  readFileSync(SNAPSHOT_PATH, "utf8")
)

function definedIds(c: Catalog): string[] {
  const src = readFileSync(path.join(REPO_ROOT, c.file), "utf8")
  return [...src.matchAll(c.headingPattern)].map((m) => m[1])
}

describe("docs/spec stable-ID catalogs", () => {
  const allSpecText = collectMarkdown(SPEC_DIR)
    .map((f) => readFileSync(f, "utf8"))
    .join("\n")

  for (const c of CATALOGS) {
    const defined = new Set(definedIds(c))

    it(`${c.name}: every referenced ${c.prefix}-<n> is defined`, () => {
      const referenced = [...allSpecText.matchAll(c.referencePattern)].map(
        (m) => m[1]
      )
      const missing = [...new Set(referenced)].filter((id) => !defined.has(id))
      expect(
        missing,
        `${c.name}: referenced but undefined IDs: ${missing
          .map((id) => c.prefix + "-" + id)
          .join(", ")}. Define them, or fix the reference.`
      ).toEqual([])
    })

    it(`${c.name}: ID list matches the append-only snapshot`, () => {
      const actual = definedIds(c)
      const expected = snapshot[c.prefix] ?? []
      // Order + membership must match. A legitimate append updates the snapshot
      // in the same change; a renumber/delete/reorder fails here.
      expect(
        actual,
        `${c.name}: catalog IDs diverged from the snapshot. If you appended a new ` +
          `ID, add it to snapshots/catalog-ids.json too. IDs are append-only — ` +
          `never renumber, delete, or reorder.`
      ).toEqual(expected)
    })
  }
})
