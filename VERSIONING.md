# Versioning the paved road

The standards evolve. A bootstrapped app should record **which version of factory-standards
it was built against**, so months later you can tell whether it predates a standard you
added — and decide whether to backport.

## Scheme (semver-ish for standards)

Tags are `vMAJOR.MINOR.PATCH`:

- **MAJOR** — a change that would make an existing app *non-conformant*: a new MUST, a guard
  that fails code that used to pass, a stack swap. Apps need a migration to catch up.
- **MINOR** — additive: a new doc/recipe/stack/question, a new SHOULD, a new guard that's
  inert until adopted. Existing apps stay conformant.
- **PATCH** — clarifications, wording, link fixes — no behavioral expectation changes.

Bump by tagging when a standards change lands:

```bash
git tag -a v0.2.0 -m "Add <thing>"   # annotated tag
```

## How an app records its version

The bootstrap writes a `.factory-version` file at the app root during scaffold:

```bash
# run from the factory-standards checkout, output captured into the new app
git -C <factory-standards> describe --tags --always   # e.g. v0.1.0  or  v0.1.0-3-g7b47194
```

`.factory-version` (in the new app) holds that string plus the date. `git describe` works
**with or without tags** — it falls back to the commit hash — so the mechanism never blocks a
scaffold. Example contents:

```
factory-standards: v0.1.0
commit: 7b47194
generated: 2026-06-20
```

## Reading it back

- `git log v0.1.0..HEAD -- .` in factory-standards shows everything an app on `v0.1.0` is
  missing.
- The `/audit-app` command ([.claude/commands/audit-app.md](./.claude/commands/audit-app.md)) can diff an app against the
  current standards and report the gap by ID.

> Keep it lightweight: one tag per standards change that matters, one `.factory-version` line
> per app. This is provenance, not a package manager.
