import type { Metadata } from "next";
import BlogIndex from "@/components/BlogIndex";
import { getJournal } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Stories, openings, reviews and recognitions from the Maginhawa Group — written from our own kitchens and from the publications who've eaten with us.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Journal — Maginhawa Group",
    description:
      "Stories, reviews and recognitions from the Maginhawa Group of London restaurants.",
    url: "/blog",
    images: [{ url: "/og/maginhawa-og.jpg", width: 1200, height: 630, alt: "Maginhawa Group journal" }],
  },
};

/* THE ARCHIVE IS ASSEMBLED HERE, NOT IN THE COMPONENT.
   getJournal() reads content/posts/*.md off the filesystem and merges our own
   writing into the curated press feed, newest first. It can only happen in a
   server component — BlogIndex is a client one — which is why the feed is a
   prop rather than an import. See the architecture note at the top of
   lib/posts.ts.

   ⚠️ THIS ROUTE CARRIES NO `dynamic` EXPORT, AND THAT IS WORTH KNOWING RATHER
   THAN REDISCOVERING. It briefly carried `force-static`, added because
   BlogIndex read the query string through useSearchParams and Next therefore
   refused to prerender the list at all. That was the wrong lever: it got the
   cards into out/blog.html but left them parked inside a streamed
   `<div hidden>`, so the page was still blank with scripts off. The component
   stopped reading the query during render instead (see the store at the top
   of components/BlogIndex.tsx), nothing suspends, and this route prerenders
   whole with no configuration at all. Re-introducing useSearchParams here or
   in any child brings the whole problem back. */
export default function BlogPage() {
  return <BlogIndex entries={getJournal()} />;
}
