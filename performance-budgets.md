# Performance budgets

Targets and budgets for apps with a UI (full-stack web, static site, desktop webview). This is
where [seo.md](./seo.md) hands off Core Web Vitals (a ranking input) and where baseline
[OBS-3](./vercel-nextjs-production-baseline.md) (`@vercel/speed-insights`) reports against.
**Set a budget, measure the field, fail CI on regressions** — a budget no one enforces is a wish.

## Core Web Vitals (field, p75)

| Metric | Good | Needs work |
| ------ | ---- | ---------- |
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | ≤ 4.0 s |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | ≤ 500 ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 |

Measure **field** data (real users) via `@vercel/speed-insights`; treat lab/Lighthouse as a
pre-merge proxy, not the source of truth.

## The levers

- **LCP** — optimize the hero: `next/image` / `astro:assets` with explicit dimensions,
  `priority`/preload the LCP image, avoid render-blocking fonts (`font-display: swap`, `next/font`).
- **CLS** — reserve space for media and embeds (width/height), avoid late-injected banners,
  keep font swaps metric-compatible.
- **INP** — minimize hydration/JS on the main thread. RSC (Next) and Astro islands help by
  default; defer non-critical client components; avoid long tasks in event handlers.

## Bundle-size budget

- Set a first-load JS budget (e.g. ≤ ~130 KB gzip for a content route) and watch it in CI.
- Lazy-load heavy, below-the-fold, or rarely-used components (`next/dynamic`, island `client:visible`).
- Keep the icon wrapper (`@/components/icons`) tree-shakeable; never import a whole icon set.

## Images & media

- Always `next/image` / `astro:assets` — never a raw `<img>` for content images.
- Cloudinary for uploads/transforms; allowlist its host in `next.config` `remotePatterns`
  (NEXT-5) and the CSP (SEC-1). Serve AVIF/WebP; size to the layout, don't ship 4000px originals.

## Caching / rendering

- Prefer **static / ISR** for content; `revalidate` over `force-dynamic` where data tolerates it.
- ⚠️ Data-driven `sitemap`/`robots`/pages are evaluated at build unless you opt out — see the
  `force-dynamic` gotcha in [seo.md](./seo.md). Don't make a route dynamic just to be safe; that
  forfeits the cache.
- **Edge vs Node** deliberately (NEXT-6): DB-backed routes run on Node (Neon driver + `ws`).

## Enforcement

- **`@vercel/speed-insights` + `@vercel/analytics`** (OBS-3) for field vitals.
- A **Lighthouse-CI budget** (or bundle-analyzer threshold) gated in CI: fail the PR when a
  budget regresses, the same way the spec-sync nudge guards docs.
