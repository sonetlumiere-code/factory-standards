# SEO Guide (conditional)

The **how** behind baseline [NEXT-3](./vercel-nextjs-production-baseline.md) (the SEO
surface MUST) — concrete patterns for metadata, crawl directives, structured data, and
canonicalization, for both stacks that render public pages.

**Applies to:** static sites ([Astro](./stacks/static-site.md)) and full-stack web apps
with public pages ([Next.js](./stacks/full-stack-web.md)). **Does NOT apply to** API-only
services — no public HTML to index. The [interactive bootstrap](./bootstrap-interactive.md)
decides whether to include this (Q5: public pages / SEO).

> Scope note: this is the implementation guide. Performance (Core Web Vitals) is a ranking
> input but lives with [OBS-3](./vercel-nextjs-production-baseline.md) and the planned
> `performance-budgets.md` — see [Web Vitals](#7-core-web-vitals-ranking-input) below for the
> handoff.

---

## 1. Metadata + Open Graph

Every indexable page needs a unique `<title>` and meta description, plus Open Graph /
Twitter cards for link previews. Set a site-wide default and override per page.

**Next.js (App Router)** — use the Metadata API, never hand-rolled `<head>` tags:

```ts
// app/layout.tsx — site-wide defaults
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL), // makes OG/canonical URLs absolute
  title: { default: "Acme", template: "%s · Acme" },
  description: "…",
  openGraph: { type: "website", siteName: "Acme", images: ["/og-default.png"] },
  twitter: { card: "summary_large_image" },
}

// app/blog/[slug]/page.tsx — per-page, data-driven
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPublicPost(params.slug) // data layer; Public* type
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", images: [post.ogImage] },
  }
}
```

- Set `metadataBase` once — without it, OG/canonical URLs render relative and break previews.
- Generate per-route OG images with `opengraph-image.tsx` (the ImageResponse API) when you
  want dynamic cards; otherwise ship a static default.

**Astro** — a single `<SEO>` component in your base layout, fed by frontmatter / content
collections. Use `Astro.site` (set in `astro.config`) for absolute URLs, and `astro:assets`
for OG images. Validate the same fields (title, description, og:*, twitter:*).

## 2. robots + sitemap (+ the DB-at-build gotcha)

**Next.js:**

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  }
}

// app/sitemap.ts
export const dynamic = "force-dynamic" // ⚠️ see gotcha
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublicPostSlugs() // queries the DB
  return posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt }))
}
```

> **⚠️ DB-at-build gotcha.** A `sitemap.ts`/`robots.ts` (or any route) that queries the
> database is evaluated **at build time** by default and frozen into the output — the build
> may fail if the DB is unreachable in CI, or worse, ship a stale snapshot. For anything
> data-driven, opt out of static evaluation: `export const dynamic = "force-dynamic"`
> (always fresh) or `export const revalidate = 3600` (ISR). The same applies to public
> pages whose content comes from the DB. Enforced by the **build-time DB safety** guard
> ([catalog](../skeleton/tests/architecture/CATALOG.md) / anti-pattern AP-12) — it fails
> `pnpm test` before the build does.

**Astro:** add `@astrojs/sitemap` (auto-generates `sitemap-index.xml` from your routes) and
drop a static `public/robots.txt` pointing at it. For collection pages, ensure they're in
the static route map (or use `getStaticPaths`).

## 3. Canonical URLs

One canonical URL per piece of content — duplicates split ranking signals.

- **Next.js:** `alternates: { canonical: "/path" }` per page (relative is fine with
  `metadataBase`).
- Pick **one** host (apex vs `www`) and redirect the other; enforce a single trailing-slash
  convention; strip tracking query params from canonicals.
- Paginated / filtered list views: canonicalize to the clean URL, not the `?page=2&sort=…`
  variant, unless each page is genuinely distinct content.

## 4. Structured data (JSON-LD)

Emit [schema.org](https://schema.org) JSON-LD so search engines render rich results. Keep a
typed helper and inject it as a script tag.

```tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
// Article, Product, Organization, BreadcrumbList, FAQPage are the common types.
```

- Match the JSON-LD to what's **visibly** on the page (mismatches are a manual-action risk).
- Validate with Google's Rich Results Test / Schema Markup Validator before shipping.
- `BreadcrumbList` + `Organization` (site-wide) are the cheapest wins.

## 5. hreflang / i18n (only if multilingual)

If you ship more than one language, declare alternates so the right locale is served:

```ts
alternates: {
  canonical: "/es/articulo",
  languages: { "en-US": "/en/article", "es-ES": "/es/articulo", "x-default": "/en/article" },
}
```

- Every language version must point back at **all** others (reciprocal) + an `x-default`.
- Reflect the alternates in the sitemap too. Skip this section entirely for single-language
  sites — don't add empty hreflang tags.

## 6. Indexing hygiene

- Mark non-public or thin pages `noindex` (`robots: { index: false }`) — admin, auth,
  search-result, and duplicate utility pages.
- Don't `disallow` in robots.txt a page you also want `noindex`'d — if it can't crawl it,
  it can't see the noindex. Allow the crawl, set the meta.
- Return real **404/410** for gone content (not a 200 soft-404) and **301** for moves.

## 7. Core Web Vitals (ranking input)

Performance is a ranking factor but is owned elsewhere — set the budget with
[OBS-3](./vercel-nextjs-production-baseline.md) (`@vercel/speed-insights`) and the planned
`performance-budgets.md`. The SEO-relevant levers: LCP (optimize the hero with `next/image`
/ `astro:assets`, preload the LCP image), CLS (reserve media dimensions, `font-display`),
INP (minimize hydration — Astro islands / RSC help by default).

---

## Ready-to-index checklist

- [ ] Unique title + description on every indexable route; `metadataBase` / `Astro.site` set.
- [ ] OG + Twitter tags resolve to **absolute** image URLs (test the link preview).
- [ ] `robots` allows crawl + points at the sitemap; `sitemap` lists canonical URLs.
- [ ] Data-driven `sitemap`/pages opt out of build-time freeze (`force-dynamic`/`revalidate`).
- [ ] One canonical host + trailing-slash convention; `alternates.canonical` per page.
- [ ] JSON-LD for the page's primary type, validated, matching visible content.
- [ ] hreflang reciprocal + `x-default` (multilingual only).
- [ ] Admin/auth/thin pages `noindex`; 404/410/301 correct.
- [ ] Web Vitals within budget (see OBS-3).
