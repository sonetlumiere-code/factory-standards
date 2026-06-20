import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  citationResolves,
  collectMarkdown,
  extractCitations,
  REPO_ROOT,
  SPEC_DIR,
  type Citation,
} from "./citation-lib"

/**
 * Referential-integrity guard: every `` `path` › `symbol` `` citation in `docs/spec/`
 * must resolve — the file exists and the symbol is defined there. A renamed/removed
 * symbol or moved file fails the build, so a citation can't silently rot.
 *
 * It proves the footnote resolves, NOT that the surrounding statement is still true.
 * When you touch cited code, re-read the statement, not just the citation.
 */
describe("spec citations resolve to real code", () => {
  const specFiles = collectMarkdown(SPEC_DIR)
  const all: Citation[] = specFiles.flatMap((f) =>
    extractCitations(f, readFileSync(f, "utf8"))
  )

  it("docs/spec/ exists and is scannable", () => {
    expect(specFiles.length).toBeGreaterThan(0)
  })

  // One assertion per citation → a precise failure naming the bad reference.
  for (const c of all) {
    const label =
      c.kind === "pair" ? `${c.path} › ${c.symbol}` : `${c.path} (bare)`
    it(`${path.relative(REPO_ROOT, c.spec)}: ${label}`, () => {
      expect(
        citationResolves(c),
        `Citation "${label}" in ${c.spec} does not resolve. ` +
          `Either the file moved/was deleted, or the symbol was renamed. ` +
          `Fix the citation in the same change as the code move.`
      ).toBe(true)
    })
  }
})
