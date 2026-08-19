"use client";

import { type CSSProperties, useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";
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
import PillCta from "./PillCta";
import { BLOG, type BlogEntry } from "@/lib/blog";
import { getRestaurant } from "@/lib/restaurants";
import { asset } from "@/lib/media";

/* ── THE FIRST ROW'S SEAT IN THE CASCADE ──
   One beat runs down the chapter, mark to last story, and every element's
   place in it is declared in Blog.module.css beside the rules that read
   it — except these four, whose seats are `RAIL_BEAT + index` and so have
   to be computed. The cadence itself is --cascade-beat over there; this is
   only a position in it, carried as --i exactly the way Discover carries
   --tw-i.

   ⚠️ THE ROWS CONTINUE THE HEAD'S COUNT rather than starting their own.
   The head occupies seats 0-4 (see the beat map in the stylesheet), so
   adding a head element means moving this number too, not just adding a
   line over there.

   The enter curve that used to live here as a tuple went with the Motion
   variants: it is --ease-entrance now, which is the same four numbers
   this file was restating. */
const RAIL_BEAT = 5;
const seat = (i: number) => ({ "--i": i }) as CSSProperties;

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
          style={{ "--ov-logo-url": `url(${asset(venue.logo)})` } as React.CSSProperties}
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
function RailRow({ post, beat }: { post: BlogEntry; beat: number }) {
  return (
    <a
      className={styles.row}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      /* the seat is declared once on the row and INHERITED by both halves,
         so the thumbnail's sweep and the headline's descent cannot drift
         apart — they are two moves on one beat, not two beats. */
      style={seat(beat)}
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
      {/* THE MASK IS A WRAPPER BECAUSE IT HAS TO BE. A clip on .rowText
          itself would travel with the type it is meant to be hiding — the
          same two-element arrangement SplitWords uses (a mask span plus an
          inline-block word) and for the same reason. The row's own box is
          not tight enough to serve: it is taller than its text by the
          --rail-air padding, so a descending block would show a sliver
          above the row's top edge before the clip caught it. */}
      <span className={styles.rowTextMask}>
        <span className={styles.rowText}>
          <h3 className={styles.rowTitle}>{post.title}</h3>
          <span className={styles.rowMeta}>
            {post.dateLabel} · {post.source}
          </span>
        </span>
      </span>
    </a>
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
  const sectionRef = useRef<HTMLElement>(null);
  /* ⚠️ THE OBSERVER WATCHES THE HEAD, NOT THE SECTION, AND THAT IS A FIX FOR
     A REAL BREAKAGE. It read `useInView(sectionRef, { amount: 0.1 })` — 10%
     of the SECTION BOX — which worked only because the head used to sit 36px
     inside that box: the trigger fired when 82px of section was showing and
     the label appeared 36px in, so the two were 46px of scroll apart and the
     entrance effectively played as the label arrived.

     THE TOP PADDING IS NOW 336px (it has to clear AboutSplit's descending
     plate — see Blog.module.css), so a threshold measured against the box
     fired with the label still 199px BELOW THE FOLD: measured at 1440×900,
     data-in went on at 0.57 of AboutSplit's transit and the label did not
     cross the fold until 0.69, 216px of scroll later. `once: true` means the
     0.7–1.4s cascade would have run and finished off-screen, and the reader
     would have met a chapter that had already introduced itself.

     WATCHING THE HEAD MAKES THE TRIGGER TRACK THE INK INSTEAD OF THE BOX, so
     it cannot drift again the next time the padding above it moves — which
     is the whole failure being fixed. The 12% bottom margin grows the
     observer root DOWNWARD, so it fires while the head is still 12vh (108px
     at 900) below the fold and the entrance is already running when the head
     rises into view. Default `amount` ("some") is right on an element this
     size; an `amount` fraction here would re-introduce exactly the
     box-relative coupling this replaces. */
  const headRef = useRef<HTMLDivElement>(null);
  const inView = useInView(headRef, { once: true, margin: "0px 0px 12% 0px" });

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="blog"
      data-nav-theme="light"
      /* THE ONE SWITCH. Everything the cascade does hangs off this
         attribute, and it never comes back off — useInView is `once`, so
         a reader scrolling back up does not replay the chapter.
         `undefined` rather than "off" so the parked rules can be written
         as :not([data-in]) and the released state needs no selector. */
      data-in={inView ? "on" : undefined}
    >
      {/* ── THE OPENING RULE IS GONE, at the user's instruction ──
          A 1px hairline on --rule used to stand here, inset to
          --blog-margin, so the head sat between two rules: this one opened
          the chapter and .headRule closed the head.

          IT FOLLOWS DISCOVER'S. That chapter's own .topRule was removed
          earlier and its .footRule after it, so this was the last opening
          hairline on the home page and the two chapters that are supposed
          to share a lockup had stopped sharing it. The head now starts out
          of open cream in both.

          .headRule STAYS — it closes the head and opens the pictures, which
          is a different job. One hairline in the chapter, not two.

          THE HEAD RISES ~19px AND THAT IS THE WHOLE OF THE SPACING CHANGE.
          The rule was 1px plus a negative margin that pulled the head to
          18px off it, against the section's own gap; with the span gone the
          head is simply the first flex child and sits on the section's
          padding-top. ⚠️ THAT PADDING IS NO LONGER 36px AND NOTHING
          SUBTRACTS IT ANY MORE. <Passage> used to sit underneath and
          subtract 36 by hand; it has moved down the page, AboutSplit's
          descending plate is now directly above, and this section's top
          padding is sized to clear that plate — see the derivation on
          `.section` in Blog.module.css. The head still sits on the
          padding-top, whatever it currently is. */}

      {/* ═══ THE CHAPTER HEAD — Discover's three-part lockup: the group's
          mark set into a standing label, the display sentence under it,
          then a full-width hairline that closes the head and opens the
          pictures.

          THE MARK IS DECORATIVE, hence alt="". 1024×1024 is the file's
          real size — maginhawa.png is a SQUARE mark, not a horizontal
          lockup; see the same note in Discover.tsx. ═══ */}
      <div className={styles.head} ref={headRef}>
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
            {/* the word is wrapped because it has to be masked separately
                from the mark beside it: the lockup's own box is as tall as
                the 2.6em mark, so a clip on <h2> would be nowhere near the
                word's line box and the descent would show above it. */}
            <span className={styles.labelWordMask}>
              <span className={styles.labelWord}>Blog</span>
            </span>
          </h2>
        </div>

        {/* ⚠️ THIS ONE SWEEPS, IT DOES NOT DESCEND, and the measurement
            that decided it is worth keeping: the lede is two lines from
            768 up (breaking before "Maginhawa") and FIVE at 390, where
            the chapter's 12px margin binds before the 17.7em measure
            does. A descending block has to travel its own height, so
            that is a 189px fall on a phone next to a 20px one on the
            label. Authored lines were the other way out and are worse —
            the break is not stable enough to hard-code. See the note over
            blogSettle in Blog.module.css. */}
        <div className={styles.ledeMask}>
          <p className={styles.lede}>
            Stories, openings, and ideas shaping the Maginhawa Group.
          </p>
        </div>

        {/* THE ARCHIVE LINK — the house action, shared with About's "Read
            our story" and the closing frame's "Choose a restaurant" (see
            components/PillCta.tsx). `styles.ctaHost` is the SEAT only: it
            hangs the pill off the display line's bottom edge at the row's
            right end. The label reads "Read More"; the accessible name says
            what it actually opens, which is the whole archive. */}
        {/* ⚠️ THE SWEEP GOES ON THE HOST, WHICH IS WHAT `className` LANDS
            ON — never on the magnet inside it. PillCta writes the cursor
            spring's x/y to `.magnet`'s inline style, so anything this file
            put there would be overwritten every frame without erroring.
            The clip is also why the animation fills `backwards`: once it
            ends the host is unclipped again, and the magnet's travel and
            the focus ring travel with it. */}
        <PillCta
          href="/blog"
          className={styles.ctaHost}
          aria-label="Read all stories"
        >
          Read More
        </PillCta>

        {/* presentational — the outline does not need a rule announced */}
        <span className={styles.headRule} aria-hidden />
      </div>

      {/* ── NO MOTION WRAPPERS LEFT ──
          The two columns used to arrive as two <motion.div>s fading up
          26px, 120ms apart, and everything else in the chapter stood
          still. The cascade animates thirteen elements, which is more
          projection nodes than this static subtree should be carrying —
          so it runs on CSS off a single attribute instead, the way
          Discover's title and SplitWords' CSS path already do. */}
      <div className={styles.body}>
        {FEATURED ? <LedeCard post={FEATURED} /> : null}

        <div className={styles.rail}>
          <div className={styles.railLabelMask}>
            <p className={styles.railLabel}>Latest</p>
          </div>
          {RAIL.map((post, i) => (
            <RailRow key={post.slug} post={post} beat={RAIL_BEAT + i} />
          ))}
        </div>
      </div>
    </section>
  );
}
