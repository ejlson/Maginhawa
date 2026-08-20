/* ═══ OUR OWN WRITING — THE HALF OF THE JOURNAL THAT IS NOT A LINK OUT ═══
 *
 * Everything on /blog used to be somebody else's article. This file is what
 * makes a Maginhawa post a first-class citizen of the same feed: a folder of
 * markdown files in content/posts/, read at BUILD TIME, turned into the exact
 * `BlogEntry` shape lib/blog.ts already publishes, and merged into it.
 *
 * The BODY of a post is rendered separately, by lib/markdown.ts. This file is
 * only concerned with the frontmatter — the facts that make a card.
 *
 * ── WHY FILES AND NOT A CMS ──
 * next.config.mjs sets `output: "export"`. There is no server at request
 * time — the build writes real .html files and Cloudflare serves them from
 * the edge. So the content has to be readable by the BUILD, and a folder of
 * text files in the repository is the cheapest thing that satisfies that:
 * no account, no API key, no network call in the build, no vendor holding
 * the words. Adding a visual editor later (Sveltia/Decap at /admin) does not
 * change any of this — such an editor commits these same files.
 *
 * ── ⚠️ THIS MODULE IS SERVER-ONLY, AND NOTHING ENFORCES THAT BUT THIS NOTE ──
 * It reads the filesystem. `node:fs` cannot be bundled for the browser, so
 * importing this from a "use client" component is a build error — an
 * obscure one, arriving from inside webpack rather than from here.
 *
 * The two components that render the feed (components/Blog.tsx and
 * components/BlogIndex.tsx) ARE client components, so they cannot call this.
 * They take the feed as a PROP instead, from the server components that own
 * their routes:
 *
 *     app/blog/page.tsx  ──getJournal()──▶  <BlogIndex entries={…} />
 *     app/page.tsx       ──getJournal()──▶  <Experience journal={…} />  ──▶  <Blog />
 *
 * Both keep `BLOG` as their default, so the components still render on their
 * own if a route ever forgets to pass it — press-only, but never broken.
 *
 * ── THE FRONTMATTER IS THE ONLY PLACE A POST IS DESCRIBED ──
 * A post is one file. Its frontmatter fills in the same fields the press
 * entries carry by hand in lib/blog.ts, so nothing about a post is typed
 * twice and the feed cannot disagree with the page. `slug` comes from the
 * filename and `dateLabel` is derived from `date`, because both are facts
 * the file already contains and a second copy is a second thing to get
 * wrong.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { BLOG, type BlogEntry } from "./blog";
import { RESTAURANTS } from "./restaurants";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/* A post carries everything a feed card needs (that is `entry`) PLUS the
   things only the post's own page renders. Keeping them apart is what lets
   the feed stay one uniform array: a card never has to know that some of
   its entries have a byline and a word count behind them. */
export type JournalPost = {
  entry: BlogEntry;
  /** the markdown body, frontmatter already stripped */
  body: string;
  /** who wrote it — shown in the byline, defaults to the group */
  author: string;
  /** alt text for the lede photograph, which a card never needs */
  imageAlt: string;
  /** derived from the body, never authored — see wordsToMinutes */
  readingMinutes: number;
};

const CATEGORIES: BlogEntry["category"][] = [
  "feature",
  "review",
  "news",
  "inclusion",
];

/* ── THE DATE LABEL IS DERIVED, AND en-GB IS NOT A DEFAULT ──
   The press entries spell theirs by hand as "14 Feb 2026", and a post whose
   label read "February 14, 2026" would sit in the same grid looking like it
   came from a different site. Intl with an explicit locale reproduces the
   house format exactly.

   `timeZone: "UTC"` is load-bearing. `new Date("2026-08-20")` is parsed as
   UTC midnight; formatted in a timezone behind UTC it renders as the 19th.
   The build machine's timezone must not be able to change what a post is
   dated — Cloudflare's builders run UTC, a laptop in Manila does not. */
const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/* 200 words a minute is the conventional figure for adult reading of
   continuous prose, and the number it produces is only ever shown rounded to
   a whole minute — so the estimate is honest at the precision it is
   displayed at. Never below 1: "0 min read" reads as a broken page. */
function wordsToMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* Frontmatter is data a person typed, so it is checked rather than trusted.
   Every failure here throws with the filename in the message and stops the
   BUILD — which is the point. The alternative is a post that deploys with
   an empty headline or a venue mark that silently never appears, and
   nothing in a static export will tell you afterwards. */
function fail(file: string, message: string): never {
  throw new Error(`content/posts/${file}: ${message}`);
}

function toEntry(file: string, raw: Record<string, unknown>, body: string) {
  const slug = file.replace(/\.mdx?$/, "");

  const title = raw.title;
  if (typeof title !== "string" || !title.trim())
    fail(file, "`title` is required");

  /* ⚠️ AN UNQUOTED YAML DATE IS PARSED AS A Date, NOT A STRING.
     `date: 2026-08-20` comes back from gray-matter as a JS Date object,
     while `date: "2026-08-20"` comes back as a string — and the whole feed
     sorts on this field being a comparable ISO string. Normalising both
     spellings here means a writer never has to know that, and a stray pair
     of quotes cannot reorder the journal. */
  const date =
    raw.date instanceof Date
      ? raw.date.toISOString().slice(0, 10)
      : typeof raw.date === "string"
        ? raw.date.trim().slice(0, 10)
        : undefined;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail(file, "`date` must be an ISO date, e.g. 2026-08-20");

  const excerpt = raw.excerpt;
  if (typeof excerpt !== "string" || !excerpt.trim())
    fail(file, "`excerpt` is required — it is the card's standfirst");

  const image = raw.image;
  if (typeof image !== "string" || !image.startsWith("/"))
    fail(file, "`image` is required and must be a path under public/, e.g. /blog/DSCF3052-web.jpg");

  const category = raw.category;
  if (!CATEGORIES.includes(category as BlogEntry["category"]))
    fail(file, `\`category\` must be one of ${CATEGORIES.join(", ")}`);

  /* The restaurant slug drives the venue mark stamped on every card. A typo
     here does not error at render — getRestaurant() returns undefined and
     the mark simply never draws — so it is caught at the only moment anyone
     is looking. */
  const restaurant = raw.restaurant;
  if (restaurant !== undefined) {
    if (typeof restaurant !== "string")
      fail(file, "`restaurant` must be a slug string");
    if (!RESTAURANTS.some((r) => r.slug === restaurant))
      fail(
        file,
        `\`restaurant: ${restaurant}\` is not a known venue — expected one of ${RESTAURANTS.map((r) => r.slug).join(", ")}`,
      );
  }

  const entry: BlogEntry = {
    slug,
    title,
    date,
    dateLabel: DATE_LABEL.format(new Date(`${date}T00:00:00Z`)),
    excerpt: excerpt.trim(),
    /* THE SOURCE LINE IS THE BYLINE FOR OUR OWN WORK. On a press card the
       source is the outlet — "Forbes", "Square Meal" — and it is the
       credential the card leads with. For a post the equivalent credential
       is who at the group wrote it, so the same slot carries the author and
       the cards need no special case. */
    source: typeof raw.author === "string" && raw.author.trim()
      ? raw.author.trim()
      : "Maginhawa Group",
    /* ROOT-RELATIVE, WHICH IS WHAT MAKES THE CARD OPEN IN THIS TAB — see
       isExternalEntry in lib/blog.ts. */
    url: `/blog/${slug}`,
    image,
    ...(restaurant ? { restaurant } : {}),
    category: category as BlogEntry["category"],
    kind: "post",
  };

  const post: JournalPost = {
    entry,
    body,
    author: entry.source,
    /* An empty alt is a DECISION here, not an omission: the headline names
       the story in real text directly beneath the photograph, so a
       description of the same thing is noise on a screen reader. Same
       reasoning as the card photography in components/Blog.tsx. Set
       `imageAlt` in the frontmatter when the picture carries information the
       words do not. */
    imageAlt: typeof raw.imageAlt === "string" ? raw.imageAlt : "",
    readingMinutes: wordsToMinutes(body),
  };

  return post;
}

/* Read once per process. The build calls into this from generateStaticParams,
   generateMetadata and the page body — three times per post, plus once per
   route that renders the feed — and re-reading the folder each time is
   pointless work in a build that is already the slowest part of a deploy. */
let cache: JournalPost[] | null = null;

export function getPosts(): JournalPost[] {
  if (cache) return cache;

  /* A missing folder is not an error. The site shipped for a year with no
     posts of its own and must keep building the day someone deletes the
     last one. */
  if (!fs.existsSync(POSTS_DIR)) {
    cache = [];
    return cache;
  }

  cache = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    /* Anything beginning with an underscore is a DRAFT and is skipped —
       _tomorrows-post.md can sit in the repository, be committed, be
       reviewed in a pull request, and not be published. Renaming it is what
       publishes it. */
    .filter((f) => !f.startsWith("_"))
    .map((file) => {
      const source = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(source);
      return toEntry(file, data as Record<string, unknown>, content);
    })
    .sort((a, b) => (a.entry.date < b.entry.date ? 1 : -1));

  return cache;
}

export function getPost(slug: string): JournalPost | undefined {
  return getPosts().find((p) => p.entry.slug === slug);
}

/* ── THE ONE FEED BOTH SURFACES RENDER ──
   Our posts and the press, newest first, in a single array of one shape.
   That uniformity is the whole design: the grid, the filters, the
   pagination and the home rail were all written against `BlogEntry[]` and
   none of them needed to change to start carrying our own writing.

   ⚠️ A POST AND A PRESS ENTRY CAN COLLIDE ON `slug`, and the collision would
   be silent — two cards with the same React key, and /blog/<slug> resolving
   to the post while every card for the press entry pointed elsewhere. Our
   own file wins (it owns the route) and the build says so. */
export function getJournal(): BlogEntry[] {
  const posts = getPosts().map((p) => p.entry);
  const taken = new Set(posts.map((p) => p.slug));

  for (const entry of BLOG) {
    if (taken.has(entry.slug)) {
      throw new Error(
        `content/posts/${entry.slug}.md collides with the "${entry.title}" entry in lib/blog.ts — rename one of them.`,
      );
    }
  }

  return [...posts, ...BLOG].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ── THE TWO POSTS EITHER SIDE OF THIS ONE ──
 * `posts` is newest-first, so the neighbour at index+1 is the piece
 * published BEFORE this one and the one at index-1 came after it. That is
 * the mapping the foot of a post renders as "previous" and "next", and it is
 * worth stating because the array order and the reading order run opposite
 * ways: previous is further DOWN the list.
 *
 * ⚠️ IT DOES NOT WRAP, and an earlier version did. Wrapping was defensible
 * while there was only a "next" — a trail of one direction that never
 * dead-ends. With both ends offered it becomes a lie: the oldest post would
 * claim the newest as the thing that follows it, and a reader walking the
 * journal would arrive back where they started with no sign they had. At the
 * ends one side is simply undefined and the foot renders what exists.
 */
export function getAdjacentPosts(slug: string): {
  previous?: JournalPost;
  next?: JournalPost;
} {
  const posts = getPosts();
  const i = posts.findIndex((p) => p.entry.slug === slug);
  if (i === -1) return {};
  return { previous: posts[i + 1], next: posts[i - 1] };
}
