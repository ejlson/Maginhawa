"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import styles from "./Blog.module.css";
/* THE VENUE CARD'S MATERIAL, IMPORTED RATHER THAN COPIED. The lede card
   below wears the restaurant cards' ramp (a 34px backdrop blur that hands
   back the photograph's own colour, then a neutral scrim) and their corner
   mark — so the two chapters are one system by construction and not by two
   files agreeing. Discover's expansion already imports this sheet for
   `.photo` / `.fallback` / `.stickerBadge`; this is the same arrangement.
   The custom properties those rules read are declared on `.feature` in
   Blog.module.css, because a class can be imported and a variable cannot. */
import card from "./VenueCard.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import { getRestaurant } from "@/lib/restaurants";
import { useMagnet } from "@/lib/useMagnet";

// shared enter curve — the same ease the Discover reel slides in on
const EASE = [0.22, 1, 0.36, 1] as const;

/* THE HOME JOURNAL IS A CHOSEN FEW, not the newest twelve.

   It used to be `BLOG.slice(0, 12)` — whatever happened to sit at the top of
   the feed. These are picked, each with its own commissioned still, and
   the order is the order they are listed in. `/blog` is untouched and still
   shows the full feed; this is the shop window, not the archive.

   Looked up by slug rather than spliced by index so that adding an entry to
   lib/blog.ts cannot silently change what the home page shows, and a slug
   that stops existing drops out loudly (filter(Boolean)) instead of shifting
   every card along by one. */
const HOME_SLUGS = [
  "olive-best-new-restaurants",
  "the-sauce-cny",
  "forbes-valentines",
  "my-london-valentines",
  "observer-filipino-pastries",
  "ham-and-high-michelin",
  "msn-valentine-croissants",
  "time-out-michelin-january",
] as const;
const POOL = HOME_SLUGS.map((s) => BLOG.find((b) => b.slug === s)).filter(
  (b): b is BlogEntry => Boolean(b),
);

/* ═══ WHICH STORY IS THE LEDE ═══
   THE NEWEST BY DATE, not the first slug in the list above. The curated
   order is an editorial ordering of a set; "the latest entry" is a fact
   about the data, and the two agree today (olive-…, 14 Feb 2026) only by
   coincidence. Sorting on the ISO `date` field — which exists precisely
   because `dateLabel` cannot be sorted — means adding a newer entry
   promotes it without anyone having to remember to reorder the list.

   The rail then takes the next four IN THE CURATED ORDER, so the editorial
   sequence still decides everything except which story leads. The
   remaining three are reachable through the head's archive pill; a rail
   long enough to hold all seven would run the chapter past its own screen,
   which is the thing this layout exists to avoid. */
const FEATURED = [...POOL].sort((a, b) => b.date.localeCompare(a.date))[0];
const RAIL = POOL.filter((p) => p.slug !== FEATURED?.slug).slice(0, 4);

/* The category, as the reader's word rather than the data's. `category` is
   a real field on every entry (lib/blog.ts) — this is the display name for
   each value, which is the only thing the card adds. */
const CATEGORY_LABEL: Record<BlogEntry["category"], string> = {
  feature: "Feature",
  review: "Review",
  news: "News",
  inclusion: "Inclusion",
};

/* THE VENUE'S MARK ON THE PHOTOGRAPH — whose story this is, told in their
   own lettering. It is the same object the venue cards carry
   (VenueCard.module.css's `.cardCrown` / `.cardLogo`): a cream mask over a
   radial wash off the picture's top-left corner, so it takes the palette
   rather than whatever ink the source PNG happens to have, and it has a
   ground to sit on. The wash is what buys the contrast — a bare cream mark
   on a bright photograph measures ~1.16:1, i.e. it is not there.

   THE DATA WAS ALREADY HERE. Every entry in lib/blog.ts carries a
   `restaurant` slug and every restaurant carries a `logo`; the strip's
   cards simply never asked for it.

   `role="img"` + the venue's name, for the reason VenueCard states: the
   mark is a logotype a reader recognises, and the accessible name is the
   string a screen reader needs. An entry with no restaurant (or a slug
   with no mark on file) renders nothing rather than an empty corner. */
function VenueMark({ slug }: { slug?: string }) {
  const venue = slug ? getRestaurant(slug) : undefined;
  if (!venue?.logo) return null;
  return (
    <div className={card.cardCrown}>
      <span className={card.cardLogo} role="img" aria-label={venue.name}>
        <span
          className={card.cardLogoMark}
          style={{ "--ov-logo-url": `url(${venue.logo})` } as React.CSSProperties}
        />
      </span>
    </div>
  );
}

/* ═══ THE LEDE CARD — the newest story, as one venue-card object ═══
   A full-bleed photograph, the venue's mark bare in the top-left, the
   photo-derived ramp seated in the bottom edge, and the type ON the ramp:
   a category pill, the headline at display size, then date · outlet.

   NO EXCERPT. The strip's cards carried a two-line standfirst because they
   were 331px wide and the headline alone did not fill them; this card is
   the width of seven columns and its headline is set at up to 2.4rem, so a
   paragraph under it would be a third voice competing with the picture.

   THE WHOLE CARD IS THE LINK, so nothing inside it is separately
   focusable — the category is a <span>, not a chip you can tab to. */
function LedeCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={styles.feature}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        className={styles.featurePhoto}
        src={post.image}
        // DECORATIVE — the headline below names the story in real text, and
        // the mark above announces the venue. A third description of the
        // same thing is noise on a screen reader.
        alt=""
        fill
        sizes="(max-width: 900px) 92vw, 58vw"
      />

      {/* the ramp — two stacked layers, blur first then scrim. ⚠️ THE
          ORDER IS LOAD-BEARING: backdrop-filter samples what is painted
          below it, so a scrim painted first would be blurred into the
          result and the ramp would darken itself recursively down the
          card. See the banner in VenueCard.module.css. */}
      <div className={card.rampBlur} aria-hidden />
      <div className={card.rampScrim} aria-hidden />

      <VenueMark slug={post.restaurant} />

      <div className={styles.featureBlock}>
        <span className={styles.category}>{CATEGORY_LABEL[post.category]}</span>
        <h3 className={styles.featureTitle}>{post.title}</h3>
        {/* the foot: the facts at one end of the line, the control at the
            other — see .featureFoot for why they share a row */}
        <span className={styles.featureFoot}>
          {/* DATE · OUTLET, and the outlet is why there is no "10 min read"
              here. Nothing in lib/blog.ts records a reading time and most
              of these entries are somebody else's article, so a computed
              one would be fiction; the source is the fact a reader of a
              press feed actually wants. */}
          <span className={styles.featureMeta}>
            {post.dateLabel} · {post.source}
          </span>

          {/* THE CONTROL — a styled span, not an anchor: the whole card is
              the link and nesting anchors is invalid. aria-hidden because
              the card's accessible name is already the headline, so
              "Read More" would announce the same link twice. */}
          <span className={styles.featureCta} aria-hidden>
            Read More
            <svg
              className={styles.featureCtaArrow}
              viewBox="0 0 32 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 5 H26" />
              <path d="M22 1 L26 5 L22 9" />
            </svg>
          </span>
        </span>
      </div>
    </a>
  );
}

/* a rail row — thumbnail, headline, meta. The whole row is the link. */
function RailRow({ post }: { post: BlogEntry }) {
  return (
    <a
      className={styles.row}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.thumb}>
        <Image
          className={styles.thumbPhoto}
          src={post.image}
          alt=""
          fill
          sizes="(max-width: 900px) 22vw, 8vw"
        />
      </span>
      <span className={styles.rowText}>
        <h3 className={styles.rowTitle}>{post.title}</h3>
        <span className={styles.rowMeta}>
          {post.dateLabel} · {post.source}
        </span>
      </span>
    </a>
  );
}

/* ═══ THE ARCHIVE LINK — a pill and a disc that close on each other, and
   a magnet that carries the whole control toward the pointer.

   THE GEOMETRY IS IN Blog.module.css and the note there is the one to
   read: what the SVG goo filter was, why it read as a blob at rest and as
   two pinched cells on hover, and why the merge is now an exact clip
   instead of a blurred threshold.

   THE THREE-ELEMENT NESTING IS LOAD-BEARING, not decoration:
     .ctaHost    NEVER transformed — its border box is the control's REST
                 rect, which is what the magnet's offset math measures
                 from. Measuring the moving element instead makes the
                 magnet its own input and it walks away from the pointer.
     .ctaMagnet  carries the spring transform.
     .headCta    the <Link>. Rides inside the transform, so the hit area
                 and the focus ring travel with the glyphs and the control
                 is pressable at rest and at full pull alike. ═══ */
function ArchiveCta() {
  /* A QUIETER MAGNET THAN THE DEFAULT, at the user's instruction. The
     defaults in lib/useMagnet.ts are the reservations pill's — that button
     is the last frame of the page and the only thing on its screen, where
     this one shares a head with a display sentence it must not appear to
     be tugging at. Halving the pull and drawing the radius in from 1.6
     half-diagonals to 1.25 takes the peak displacement from ~14px to ~6px:
     enough that the control is plainly alive under the pointer, not enough
     to read as the head moving. */
  const { hostRef, magnetic, x, y } = useMagnet<HTMLSpanElement>({
    reach: 1.25,
    pull: 0.38,
    cap: 0.3,
  });

  return (
    <span ref={hostRef} className={styles.ctaHost}>
      {/* no style prop at all when the magnet is off, so the computed
          transform stays `none` rather than an identity matrix */}
      <motion.span
        className={styles.ctaMagnet}
        style={magnetic ? { x, y } : undefined}
      >
        <Link
          href="/blog"
          className={styles.headCta}
          aria-label="Read all stories"
        >
          {/* the pill body — decoration standing in for the control's
              background, and clipped back to the label at rest */}
          <span className={styles.ctaBody} aria-hidden />
          <span className={styles.ctaLabel}>Read More</span>
          <span className={styles.ctaDisc}>
            <svg
              className={styles.ctaArrow}
              viewBox="0 0 24 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 5 H17" />
              <path d="M13 1 L17 5 L13 9" />
            </svg>
          </span>
        </Link>
      </motion.span>
    </span>
  );
}

/**
 * Blog chapter on the cream page — a hairline opening the chapter, the
 * head lockup (the group's mark set into a standing label, the display
 * sentence under it, the archive pill hung off its bottom edge, then a
 * full-width rule), and beneath it TWO COLUMNS: the newest story as one
 * large card wearing the restaurant cards' material, and a rail of the
 * four next stories as thumbnail rows.
 *
 * WHAT IT REPLACES: eight equal 1:1 cards in a draggable scroll-snap strip
 * with prev/next discs and ~180 lines of pointer physics — a mouse-drag
 * follow, an inertial coast with boundary damping, a scroll-driven
 * position counter and a 110vw entrance slide. All of it is gone with the
 * strip: there is nothing left on this chapter to drag.
 */
export default function Blog() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.1 });

  // the two columns arrive together and a beat apart — the card first,
  // because it is the thing the chapter is presenting. Reduced motion
  // takes the fade and none of the travel.
  const enter = (delay: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: inView ? { opacity: 1 } : undefined,
          transition: { duration: 0.4, ease: "easeOut" as const, delay },
        }
      : {
          initial: { opacity: 0, y: 26 },
          animate: inView ? { opacity: 1, y: 0 } : undefined,
          transition: { duration: 0.85, ease: EASE, delay },
        };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="blog"
      data-nav-theme="light"
    >
      {/* the chapter's opening rule — presentational, so it is not
          announced; see .topRule for why it is a child of the section and
          not a line at its top edge */}
      <span className={styles.topRule} aria-hidden />

      {/* ═══ THE CHAPTER HEAD — Discover's three-part lockup: the group's
          mark set into a standing label, the display sentence under it,
          then a full-width hairline that closes the head and opens the
          pictures.

          THE MARK IS DECORATIVE, hence alt="". 1024×1024 is the file's
          real size — maginhawa.png is a SQUARE mark, not a horizontal
          lockup; see the same note in Discover.tsx. ═══ */}
      <div className={styles.head}>
        <div className={styles.labelRow}>
          <h2 className={styles.chapterLabel}>
            <Image
              className={styles.labelMark}
              src="/logo/maginhawa.png"
              alt=""
              width={1024}
              height={1024}
              aria-hidden
            />
            Blog
          </h2>
        </div>

        <p className={styles.lede}>
          Stories, openings, and ideas shaping the Maginhawa Group.
        </p>

        <ArchiveCta />

        {/* presentational — the outline does not need a rule announced */}
        <span className={styles.headRule} aria-hidden />
      </div>

      <div className={styles.body}>
        {FEATURED ? (
          <motion.div {...enter(0)}>
            <LedeCard post={FEATURED} />
          </motion.div>
        ) : null}

        <motion.div className={styles.rail} {...enter(0.12)}>
          <p className={styles.railLabel}>Latest</p>
          {RAIL.map((post) => (
            <RailRow key={post.slug} post={post} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
