import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { LEGAL_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import { withMenus } from "@/lib/restaurants";

/* ── THE SITEMAP, GENERATED RATHER THAN WRITTEN ──
 *
 * It is a route file and not a `public/sitemap.xml` for one reason that has
 * already bitten this project once: EVERY URL IN HERE HAS TO AGREE WITH THE
 * CANONICAL. lib/site.ts's banner is the story of a hostname that was wrong
 * in five places at once; a hand-written sitemap would be a sixth copy, and
 * the one nobody looks at. Reading SITE_URL means the day the apex becomes
 * primary, this file is already correct.
 *
 * Under `output: "export"` Next prerenders this to a real out/sitemap.xml at
 * build time — a metadata route, not a request-time handler, so it does not
 * violate the "no route handlers" invariant next.config.mjs depends on.
 *
 * ── WHAT IS DELIBERATELY ABSENT ──
 *  · /lab/* — throwaway prototype routes, noindexed in app/lab/layout.tsx.
 *  · changeFrequency and priority. Google has said for years that it ignores
 *    both, and Bing treats priority as advisory at best. They are two more
 *    fields to keep honest in exchange for nothing, and a sitemap full of
 *    invented `priority: 0.8` is a tell rather than an optimisation.
 *
 * ── lastModified IS ONLY SET WHERE IT IS TRUE ──
 * This is the field that decides whether the whole file is trusted: Google
 * uses lastmod only while it stays consistent with what actually changed,
 * and starts ignoring it wholesale once it does not. So it appears on the
 * two kinds of page whose modification date this repository genuinely
 * knows — journal posts (frontmatter `date`, validated in lib/posts.ts) and
 * the legal pages (LEGAL_UPDATED, which the pages themselves render) — and
 * is omitted everywhere else rather than filled in with the build date.
 * ⚠️ `new Date()` here would stamp EVERY url with the moment of the deploy,
 * telling a crawler the whole site changes on every unrelated build. That is
 * the single most common way a sitemap gets itself discounted.
 */
/* ⚠️ `force-static` IS REQUIRED HERE, AND ITS ABSENCE FAILS THE BUILD.
   Under `output: "export"` Next 15 refuses to compile a metadata route
   without it, verbatim:

     export const dynamic = "force-static"/export const revalidate not
     configured on route "/sitemap.xml" with "output: export"

   Metadata routes are compiled as App Route handlers internally, and an
   exported build has no request time for a handler to run at — so Next
   makes you SAY that this one is resolved once, at build. It is not a
   default: this file rendered a 500 in dev and would have taken the
   Cloudflare build down with it, which is the same class of trap the
   `output: "export"` notes in next.config.mjs are about.

   It does not make this a route handler in the sense that config file
   forbids — nothing here touches next/server, and the output is a static
   file in out/. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  /* The editorial pages, most important first. Order carries no weight for a
     crawler; it is for the human opening the file. */
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/restaurants` },
    { url: `${SITE_URL}/about` },
    { url: `${SITE_URL}/blog` },
    { url: `${SITE_URL}/careers` },
    { url: `${SITE_URL}/contact` },
    { url: `${SITE_URL}/privacy`, lastModified: LEGAL_UPDATED },
    { url: `${SITE_URL}/terms`, lastModified: LEGAL_UPDATED },
  ];

  /* One entry per MDX post. This reads the same getPosts() the journal and
     the /blog/[slug] route read, so a post cannot exist on the site and be
     missing from the sitemap — the failure mode a hand-maintained list has
     by default.

     ⚠️ ONLY THE MDX POSTS BELONG HERE. lib/blog.ts's feed also carries
     "press" and "native" entries, and every one of those is a link to
     SOMEBODY ELSE'S SITE (see the type note in that file — "native" is
     about authorship, not hostname). Putting them in would be claiming
     other publishers' URLs as our own, which is the one thing a sitemap
     must never do. getPosts() returns only what /blog/<slug> actually
     serves. */
  const posts: MetadataRoute.Sitemap = getPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.entry.slug}`,
    lastModified: post.entry.date,
  }));

  /* One entry per menu page, read from the SAME withMenus() that
     app/menus/[slug]/page.tsx hands to generateStaticParams. That file's
     banner calls its list "the whole route table"; this reads the table
     rather than copying it, so a venue that gains or loses `menuPages`
     moves in both places on the same build.

     ⚠️ THESE WERE MISSING UNTIL 2026-08-25 and the omission was invisible:
     all seven pages export, carry correct canonicals and are linked from
     the restaurants grid, so nothing 404s and nothing looks wrong — they
     were simply never declared. A crawler had to find them by following
     links, which is exactly the discovery a sitemap exists to not depend on.

     No lastModified, for the reason the banner above gives: this repository
     does not know when a menu was last reprinted, and inventing the build
     date is how the whole file stops being trusted. */
  const menus: MetadataRoute.Sitemap = withMenus().map((r) => ({
    url: `${SITE_URL}/menus/${r.slug}`,
  }));

  return [...pages, ...menus, ...posts];
}
