"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import styles from "./JournalPost.module.css";
import { getRestaurant } from "@/lib/restaurants";
import type { BlogEntry } from "@/lib/blog";

/* THE SHELL EVERY POST OF OUR OWN IS READ IN — /blog/<slug>.
 *
 * ── IT IS LegalPage'S ARRANGEMENT, DELIBERATELY ──
 * /privacy and /terms were the first routes on this site whose job was
 * READING rather than looking, and the shape they settled on is the right
 * one here too: a client shell that owns the furniture (nav, menu, footer,
 * the dark zone) while a server component owns the WORDS.
 *
 * That split is not tidiness. The body arrives already rendered — markdown
 * turned into HTML at build time by lib/markdown.ts — so the prose lands in
 * the pre-rendered page rather than in a JavaScript bundle the reader has to
 * download and execute before the first sentence appears. For a page whose
 * entire value is being readable and indexable, there is no other shape
 * worth having.
 *
 * `dangerouslySetInnerHTML` is the honest way to hand a string of HTML to
 * React and is not dangerous here: the string is produced at build time from
 * a file in this repository by a pipeline that drops raw HTML outright (see
 * the note at the foot of lib/markdown.ts). No reader input reaches it.
 *
 * ── WHAT IT ADDS THAT LegalPage DOES NOT ──
 * A photograph, a byline and a way onward. A legal notice is a destination;
 * a journal entry is a stop on a path, so the foot always offers the next
 * one. Everything else — the measure, the heading ramp, the hairline under
 * the head — is the same system, read from the same tokens.
 *
 * ── IT DOES NOT ANIMATE, FOR LegalPage'S REASON ──
 * No reveal wave, no pinned chapter, no scroll choreography. The page
 * transition still runs (PageTransition owns that at the root), but nothing
 * here delays a sentence the reader came for.
 */
export default function JournalPost({
  entry,
  readingMinutes,
  imageAlt,
  previous,
  next,
  html,
}: {
  entry: BlogEntry;
  readingMinutes: number;
  imageAlt: string;
  /** the piece published before this one — undefined on the oldest post */
  previous?: { slug: string; title: string };
  /** the piece published after it — undefined on the newest */
  next?: { slug: string; title: string };
  /** the body, already rendered from markdown by lib/markdown.ts */
  html: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const venue = entry.restaurant ? getRestaurant(entry.restaurant) : undefined;

  /* Release any dark backdrop the loader or another route may have left on
     the document — the identical hand-off LegalPage and ContactPage make.
     Arriving here from the home page means arriving with `is-loading` still
     on the body and the html background painted dark, which renders correct
     content on a black sheet. */
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    html.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("is-loading");
    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page}>
        <article className={styles.doc}>
          {/* ── THE WAY BACK, OFFERED BEFORE THE PIECE AND AGAIN AFTER IT ──
              A reader who arrived on a post from a search result has no
              history to go back through and no other route out of it: the
              nav offers "Blog", but that is a destination in a bar rather
              than an answer to "where am I". This one names the set this
              page belongs to, and it is at the TOP because that is where
              somebody who has just realised they are in the wrong place
              looks. The same link closes the article for the reader who
              finished it. */}
          <Link className={styles.backTop} href="/blog">
            <span className={styles.backArrow} aria-hidden>
              ←
            </span>
            Back to all blogs
          </Link>

          <header className={styles.head}>
            {/* THE KICKER IS THE VENUE, NOT THE CATEGORY, when there is a
                venue — a reader scanning the journal knows "Belly" and does
                not know "news". The category follows it as the quieter half
                of the pair, and stands alone on a post about the group
                rather than about a room. */}
            <p className={styles.kicker}>
              {venue ? `${venue.name} · ` : ""}
              {entry.category === "news" ? "Journal" : entry.category}
            </p>

            {/* the page's one <h1> — same guarantee LegalPage makes by
                owning the title here rather than in each route */}
            <h1 className={styles.title}>{entry.title}</h1>

            {/* A REAL <time>: the ISO value for machines, the house label
                for people. lib/posts.ts derives both from one frontmatter
                field, so they cannot disagree. */}
            <p className={styles.byline}>
              {entry.source}
              <span className={styles.sep} aria-hidden>
                ·
              </span>
              <time dateTime={entry.date}>{entry.dateLabel}</time>
              <span className={styles.sep} aria-hidden>
                ·
              </span>
              {readingMinutes} min read
            </p>
          </header>

          {/* THE LEDE PHOTOGRAPH IS `priority`, and it is the only image on
              the page that is. It is above the fold on every viewport and it
              is the largest thing painted — i.e. it is this route's LCP
              element, and letting it queue behind lazy-loaded body images
              would be measuring the wrong thing. */}
          <figure className={styles.figure}>
            <Image
              className={styles.photo}
              src={entry.image}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 72vw"
            />
          </figure>

          <div
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* ── THE WAY ONWARD ──
              Three links, all internal. The two neighbours sit on one row,
              each at the end it points toward, so the row reads as a
              timeline rather than as a menu; the way back out closes it
              underneath. At the ends of the journal one neighbour does not
              exist and its side is simply empty — `justify-content: space-between`
              would then pull the survivor across the row, which is why the
              row is a two-column grid instead. */}
          <nav className={styles.foot} aria-label="More from the journal">
            {(previous || next) && (
              <div className={styles.footRow}>
                {previous ? (
                  <Link
                    className={`${styles.footLink} ${styles.footPrev}`}
                    href={`/blog/${previous.slug}`}
                    rel="prev"
                  >
                    <span className={styles.footLabel}>
                      <span className={styles.backArrow} aria-hidden>
                        ←
                      </span>
                      Read previous
                    </span>
                    <span className={styles.footTitle}>{previous.title}</span>
                  </Link>
                ) : (
                  <span />
                )}

                {next ? (
                  <Link
                    className={`${styles.footLink} ${styles.footNext}`}
                    href={`/blog/${next.slug}`}
                    rel="next"
                  >
                    <span className={styles.footLabel}>
                      Read next
                      <span className={styles.footArrow} aria-hidden>
                        →
                      </span>
                    </span>
                    <span className={styles.footTitle}>{next.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}

            <Link className={styles.backFoot} href="/blog">
              <span className={styles.backArrow} aria-hidden>
                ←
              </span>
              Back to all blogs
            </Link>
          </nav>

        </article>
      </main>

      <DarkZone>
        <Footer />
      </DarkZone>
    </>
  );
}
