import type { Metadata } from "next";

/* ── THE LAB IS NOT PART OF THE PUBLIC SITE, AND NOW SAYS SO ONCE ──
 *
 * These are throwaway prototype routes — specimen sheets and hero studies
 * that decisions were taken off (the EB Garamond choice came off
 * /lab/type/plaster; see the font banner in app/layout.tsx). They are worth
 * keeping and they are not worth indexing: a reader who searches for this
 * restaurant group should never land on a page of nine typographic systems
 * on a bare ground.
 *
 * ⚠️ ONLY /lab/hero WAS PROTECTED BEFORE THIS FILE EXISTED. It set
 * `robots: { index: false, follow: false }` in its own metadata; the other
 * three — /lab/type, /lab/type/plaster, /lab/type/red — set nothing, so
 * they inherited the root layout's `index: true, follow: true` and shipped
 * as fully indexable pages in `out/`. A layout is the right home for the
 * rule because it cannot be forgotten by the next lab route somebody adds.
 *
 * ── WHY noindex AND *NOT* A robots.txt Disallow ──
 * These two look interchangeable and do opposite things. `Disallow` stops a
 * crawler FETCHING the page — which also stops it ever reading a noindex
 * tag inside, so a disallowed URL that is linked from anywhere can still be
 * indexed, as a bare title with no snippet. To have a page definitively
 * REMOVED from an index, the crawler has to be allowed in to see the
 * instruction. So app/robots.ts deliberately does not disallow /lab/, and
 * this is the directive that does the work.
 *
 * The lab routes are also absent from app/sitemap.ts, which is the third
 * and weakest signal of the three: a sitemap says "this is worth your
 * time", never "do not index this".
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
