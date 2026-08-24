import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JournalPost from "@/components/JournalPost";
import { getAdjacentPosts, getPost, getPosts } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/site";
import { StructuredData } from "@/lib/StructuredData";

/* ═══ ONE ROUTE, ONE POST, WRITTEN AT BUILD TIME ═══
 *
 * The only dynamic segment on the site. Under `output: "export"` that word
 * means less than it looks: there is no server to be dynamic on, so Next
 * asks generateStaticParams what the segment can be and writes one folder of
 * HTML per answer. /blog/a-note-on-service is a real out/blog/a-note-on-service/index.html
 * on Cloudflare's edge, not a route matched at request time.
 *
 * ⚠️ THAT IS ALSO WHY THERE IS NO CATCH-ALL BEHAVIOUR TO CONFIGURE. An
 * exported build cannot render a slug it was not told about, so a URL that
 * is not in this list is served by the static 404 (app/not-found.tsx) — the
 * `notFound()` below only ever fires in development.
 */

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const { entry } = post;

  return {
    title: entry.title,
    description: entry.excerpt,
    alternates: { canonical: `/blog/${entry.slug}` },
    openGraph: {
      /* `article`, NOT `website` — the rest of the site's pages are places
         and this is a piece of writing with a date and an author on it. It
         is what makes a share card render as an article rather than as the
         brand. */
      type: "article",
      title: `${entry.title} — Maginhawa Group`,
      description: entry.excerpt,
      url: `/blog/${entry.slug}`,
      publishedTime: entry.date,
      authors: [entry.source],
      images: [
        {
          url: entry.image,
          width: 1200,
          height: 630,
          alt: post.imageAlt || entry.title,
        },
      ],
    },
  };
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  /* THE BODY IS TURNED INTO HTML HERE, IN A SERVER COMPONENT, and crosses
     into the client shell as a string — so the prose is in the HTML the
     crawler and the reader receive, and the markdown parser never reaches the
     browser bundle. lib/markdown.ts carries the rules it applies. */
  const html = await renderMarkdown(post.body);

  const { previous, next } = getAdjacentPosts(slug);

  /* BlogPosting rather than Article: it is the narrower type and it is what
     it is. `@id` and `publisher` join this record to the Organization and
     WebSite records the root layout already publishes, which is what turns
     a page of structured data into a graph rather than three unrelated
     claims. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE_URL}/blog/${post.entry.slug}#post`,
    headline: post.entry.title,
    description: post.entry.excerpt,
    image: `${SITE_URL}${post.entry.image}`,
    datePublished: post.entry.date,
    dateModified: post.entry.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntityOfPage: `${SITE_URL}/blog/${post.entry.slug}`,
    inLanguage: "en-GB",
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <JournalPost
        entry={post.entry}
        readingMinutes={post.readingMinutes}
        imageAlt={post.imageAlt}
        previous={
          previous && {
            slug: previous.entry.slug,
            title: previous.entry.title,
          }
        }
        next={next && { slug: next.entry.slug, title: next.entry.title }}
        html={html}
      />
    </>
  );
}
