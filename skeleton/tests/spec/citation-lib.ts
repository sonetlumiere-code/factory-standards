import fs from "node:fs"
import path from "node:path"

/**
 * Citation machinery for the spec guards. Defines what a spec citation looks like
 * and what it means for one to *resolve* against the source tree. Adapted from the
 * factory reference repos — drop it into `tests/spec/` and the guards below use it.
 *
 * Citations are written as `` `path` › `symbol` `` (or a bare `` `path` `` when no
 * single symbol fits). Line numbers are deliberately absent — they drift on every
 * refactor; symbols are durable. Placeholder paths containing `<...>` are skipped,
 * so an un-filled template doc doesn't fail the build.
 */

export const REPO_ROOT = process.cwd()
export const SPEC_DIR = path.join(REPO_ROOT, "docs", "spec")

// The `›` separator (U+203A) between a path and the symbol it points at.
export const SEP = "›"

// A citation path we resolve on disk. Excludes placeholder/glob tokens
// (`<feature>`, `course*.ts`, `…`) by allowing only real path characters —
// route groups `()` and dynamic segments `[]` are legal on disk, so allowed.
const PATH_TOKEN = /^[A-Za-z0-9_./()[\]@-]+$/
// A real citation path ends in a file extension. Filters out illustrative
// templates that aren't actual files.
const HAS_EXT = /\.[A-Za-z]+$/
// Bare file citations we verify are restricted to source files that carry a
// directory — root-only mentions and `.md` names in prose aren't evidence.
const BARE_SOURCE = /\.(ts|tsx)$/

// `path › symbol` pairs, e.g. `` `data/users.ts` › `createUser` ``.
const PAIR_RE = new RegExp("`([^`]+)`\\s*" + SEP + "\\s*`([^`]+)`", "g")
// Any backtick token NOT immediately followed by `›` (so the path half of a pair
// isn't double-counted as a bare citation).
const BARE_RE = new RegExp("`([^`]+)`(?!\\s*" + SEP + ")", "g")

export function collectMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectMarkdown(full))
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full)
  }
  return out
}

export function fileExists(rel: string): boolean {
  const target = path.join(REPO_ROOT, rel)
  return fs.existsSync(target) && fs.statSync(target).isFile()
}

// Symbol must appear as a *definition*, not merely a mention. Covers
// `function S`, `const|let|var|class|type|interface|enum S`, an object/type key
// `S:`, an async method shorthand `async S(`, and — only for snake_case
// identifiers (e.g. Drizzle index/constraint names) — a string literal `"S"`.
// A bare usage or `import` does NOT count, so a citation can't pass by pointing
// at a file that merely references code defined elsewhere.
export function symbolPresent(rel: string, symbol: string): boolean {
  const src = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8")
  const s = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    `\\bfunction\\s+${s}\\b`,
    `\\b(?:const|let|var|class|type|interface|enum)\\s+${s}\\b`,
    `\\b${s}\\s*:`,
    `\\basync\\s+${s}\\s*\\(`,
  ]
  if (symbol.includes("_")) patterns.push(`["']${s}["']`)
  return new RegExp(patterns.join("|")).test(src)
}

export type Citation =
  | { kind: "pair"; spec: string; path: string; symbol: string }
  | { kind: "bare"; spec: string; path: string }

export function extractCitations(specFile: string, text: string): Citation[] {
  const spec = path.relative(REPO_ROOT, specFile)
  const cites: Citation[] = []

  for (const m of text.matchAll(PAIR_RE)) {
    const [, cPath, symbol] = m
    if (!PATH_TOKEN.test(cPath)) continue // placeholder/prose, not a real path
    if (!HAS_EXT.test(cPath)) continue // illustrative template, not a file
    cites.push({ kind: "pair", spec, path: cPath, symbol })
  }

  for (const m of text.matchAll(BARE_RE)) {
    const token = m[1]
    if (!PATH_TOKEN.test(token)) continue
    if (!BARE_SOURCE.test(token)) continue
    if (!token.includes("/")) continue // root-only mentions aren't citations
    cites.push({ kind: "bare", spec, path: token })
  }

  return cites
}

// A citation resolves when its file exists and — for a pair — the symbol is
// defined there.
export function citationResolves(c: Citation): boolean {
  if (!fileExists(c.path)) return false
  if (c.kind === "pair") return symbolPresent(c.path, c.symbol)
  return true
}
