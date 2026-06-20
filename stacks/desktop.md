# Stack — Desktop app

A native desktop application (macOS / Windows / Linux). Reuses the web UI stack inside a
native shell instead of shipping a browser.

**Inherits:** the [universal core](./README.md#universal-core-every-archetype). The
[data spine](./README.md#data-spine-full-stack-web--api-service) applies **only** if the app
owns a database — usually it talks to a **remote API** (an [api-service](./api-service.md) or a
full-stack backend) and holds little local state, or uses **local SQLite** for offline data.

## Core

| Capability | Canonical choice | Floor | Why |
| ---------- | ---------------- | ----- | --- |
| Shell | **Tauri** | 2 | OS webview (no bundled Chromium) → tiny bundles + low RAM; Rust backend; strong default security (explicit capabilities). |
| Frontend | **React + Vite** + Tailwind v4 + shadcn/ui | — | The same UI vocabulary as full-stack web — components carry over. **SPA/static**, not SSR. |
| Language | **TypeScript** (frontend) + **Rust** (Tauri backend commands) | — | Keep native logic in Rust commands; the webview stays pure TS/React. |
| Local data (if any) | **SQLite** via `tauri-plugin-sql` (Drizzle works over it) | — | Only when the app needs offline/local storage; otherwise call the remote API. |
| Auth (if networked) | **Better Auth** via the remote API; tokens in the OS keychain (`tauri-plugin-stronghold` / keyring) | — | Never store secrets in plain files; use the OS secret store. |

> **Electron** is the deviation, not the default — choose it only when you need Node/Chromium
> runtime parity, a dependency that assumes Chromium, or a mature Electron-only plugin. Record
> the reason in `docs/adr/`.

## Desktop-specific concerns

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Auto-update | **Tauri updater** (signed) | Ship fixes without a reinstall; updates must be signature-verified. |
| Code signing | macOS notarization + Windows Authenticode | Unsigned desktop apps get blocked/warned by the OS. CI secret-gated. |
| IPC / capabilities | Tauri **capabilities allowlist** — expose only the commands the UI needs | The desktop analog of "server-authoritative" — the Rust side is the trust boundary; don't expose broad FS/shell access. |
| Packaging | per-OS bundles (`.dmg` / `.msi` / `.AppImage`) via `tauri build` | One command per target. |

## Quality

| Capability | Canonical choice | Why |
| ---------- | ---------------- | --- |
| Error tracking | **Sentry** (browser SDK in the webview + Rust panic hook) | Both sides can fail. |
| Testing | **Vitest** (frontend, from core); **WebDriver** via `tauri-driver` for e2e | Drive the real app window on the critical flows. |
| Updates/release | CI builds + signs per-OS artifacts | Gate signing secrets in CI, never in the repo. |

## Conventions specific to this archetype

- The **Rust command surface is the security boundary** — validate inputs there, expose the
  minimum, treat the webview as untrusted (same posture as a server treating the client).
- Keep secrets in the OS keychain, never in `localStorage`/files.
- If the app is networked, the backend follows [full-stack-web.md](./full-stack-web.md) /
  [api-service.md](./api-service.md) — this file only covers the desktop shell.
- **SEO does not apply** (no public pages). Most baseline web items (headers/CSP) apply to the
  webview content; deploy-time/Vercel items are N/A — note them in the deferral table.
