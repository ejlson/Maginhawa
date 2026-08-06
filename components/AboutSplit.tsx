"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import styles from "./AboutSplit.module.css";

/**
 * The group's story, as a 50/50 split — photograph left, text right.
 *
 * Laid out after the reference: heading and its call to action at the TOP
 * of the text column, a deliberate void, then the reading block low in the
 * column — a paragraph, a row of small prints, and a smaller footnote
 * paragraph under them. The picture carries its own line at bottom-left.
 */

/* WHERE THIS SITS, AND WHY IT IS ON THE HOME PAGE.
   /about already opens with a long scroll-scrubbed sequence of its own —
   "About Us" centred, the two words travelling apart, a film opening in the
   gap and growing to fill the screen. That is deliberate, hand-built work
   and this would either replace it or fight it.
   The home page, by contrast, had NO About presence at all: the AboutIntro
   chapter was removed, then the story strip's "Learn more about us" went
   with the masthead rewrite, leaving no editorial route to the group's
   story whatsoever. This fills exactly that hole. */

/* THE HEADING SAYS WHAT THE GROUP BELIEVES, not what it is.
   It read "A London family, cooking since 1987" — a label, and one whose
   two facts are both already on this screen: the masthead above says London
   and Est. 1987, and the caption on the photograph says Camden 1987. It was
   the third telling of the same thing.
   Hospitality-as-inheritance is the claim underneath the whole section, and
   it is what the paragraphs below actually elaborate. */
const HEADING = "Everything we know about hospitality, we learned at home.";

/* THE PICTURE. Third choice, and the pool is now empty.
   omar.jpg was a 16.5MB single portrait illustrating "Chef Omar" beside a
   sentence about a family. careers-team.jpg was rejected. This is the last
   unused photograph in public/images at a sane weight (221KB) — everything
   else is either a venue hero (all seven are the Discover cards, one
   chapter above), one of the ten `ourrestaurants` prints (eight in the
   story band, two in the doors below), or a multi-megabyte source.
   A FOURTH CHANGE NEEDS A NEW ASSET, or a swap out of the story band. */
const PORTRAIT = "/images/careers-hero.jpg";

/* THE PANEL IS A LOOPING CLIP NOW, with the photograph kept as its poster
   and as the reduced-motion still.

   tile-guanabana.mp4 IS 2.8MB — chosen on weight, and the choice matters
   here more than usual. public/videos holds thirteen clips from 2.5MB to
   44MB (bintang-hero), and this page already carries eight band prints and
   three doors. The `tile-*` clips are the small hover loops, which is
   exactly why they are light; the `*-hero` clips would look no better at
   this size and would cost ten to twenty times as much.
   If this ever needs to be a specific room, pick from the tile set first
   and check the weight before the content. */
/* mamasons-hero.mp4 IS 25.6MB, at the user's instruction, and that is worth
   stating plainly rather than shipping quietly: it is roughly NINE TIMES
   the clip it replaces (tile-guanabana, 2.8MB) and by far the heaviest
   thing on this page, which already carries eight band prints and three
   doors. `preload="metadata"` keeps it off the critical path — the browser
   fetches headers, not frames, until it decides to play — but a visitor who
   reaches this section on a phone connection will pay for it.
   A compressed derivative (~3–5MB at this display size) would look identical
   in a 660px frame. That is the fix if the page ever feels heavy here. */
const VIDEO = "/videos/mamasons-hero.mp4";

/* TWO LINES, DELIBERATELY. The caption was one sentence ("One room in
   Camden, 1987."); it is now a statement and its location, set larger, so
   it reads as the picture's title rather than as a note under it. The break
   is hard-coded rather than left to wrapping — the two halves are doing
   different jobs and a measure-dependent break would sometimes put "Camden"
   on the first line. */
const PORTRAIT_LINE = ["Where it began.", "Camden, 1987."];

/* THE COPY. Two paragraphs doing different jobs, which is why the second is
   set smaller and lighter (see .paraFine): the first is what the group
   believes, the second is the record that backs it. The reference does the
   same — an argument, then a quieter elaboration under the prints.
   Every fact is already on the site: the 1987 Camden kitchen and Chef Omar
   are in /about's metadata and structured data, the three kitchens are the
   site's own description. No venue count — TODOS.md item 7 still records
   "seven rooms vs eight tiles" as unreconciled. */
const PARA_LEAD =
  "We cook the food we grew up on, for people we treat like family. A table you are not hurried from, a room that is easy to be in, and a plate that tastes like somebody's home. It is the only way we have ever known how to do this, and it is the reason the same faces come back year after year.";
const PARA_FINE =
  "From one Camden kitchen in 1987 to a family of dining rooms across North London — Filipino, Filipino-Japanese and Caribbean, each with its own character — still run by the same family, and still led by Chef Omar. Every room keeps its own menu, its own regulars and its own way of doing things. What they share is the standard they are held to, and the people who set it.";

/* ══════════ THE THREE PRINTS DO SOMETHING NOW ══════════
   They were decorative. Each one is now a door into one of the three
   kitchens the paragraph beneath them names, which is the cheapest possible
   way to make a visual footnote earn its place: the copy says "Filipino,
   Filipino-Japanese and Caribbean" and the pictures immediately above it
   are those three, in that order, each linking to a room that serves it.

   ONE VENUE STANDS FOR EACH KITCHEN rather than a filtered index, because
   /restaurants has no cuisine filter to link to — building one to serve
   three thumbnails would be the tail wagging the dog. The venue chosen for
   each is the clearest example of its kitchen in lib/restaurants.ts.

   THE VISIBLE LABELS ARE GONE at the user's instruction, and that costs
   something worth stating rather than burying. Nothing about a 148px
   photograph announces that it is a link, and the label was the only
   sighted affordance these had. What is left is a hover lift and a cursor
   — both of which require the reader to already be pointing at the picture
   to discover it, and neither of which exists on touch.
   Screen-reader users are unaffected: each link still carries a real
   accessible name ("Filipino — see the restaurant"), so the target is never
   announced as a filename. The loss is purely visual discoverability. If
   these turn out to go unclicked, the label is the first thing to put back. */
const DOORS = [
  { slug: "bintang", label: "Filipino", src: "/images/ourrestaurants/print-09-web.jpg" },
  { slug: "ramo", label: "Filipino-Japanese", src: "/images/ourrestaurants/print-10-web.jpg" },
  { slug: "guanabana", label: "Caribbean", src: "/images/manifesto/group-web.jpg" },
];

export default function AboutSplit() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.section} data-nav-theme="light">
      {/* THE RULE THAT OPENS THE CHAPTER. Decorative, so a bare div rather
          than <hr>: an <hr> is a semantic thematic break and a screen reader
          announces it, which would double up on the heading already doing
          that job. There was a matching one at the bottom; it is removed at
          the user's instruction. */}
      <div className={styles.rule} aria-hidden />
      <div className={styles.split}>
        {/* ── LEFT: the picture, and its line ── */}
        <figure className={styles.media}>
          {reduce ? (
            /* REDUCED MOTION GETS THE STILL, not a paused video. A <video>
               with autoplay suppressed shows its poster, which would be the
               same picture — but it would also download the clip to do it.
               Rendering the image outright means the 2.8MB never ships to a
               reader who asked for less movement. */
            <Image
              className={styles.mediaImg}
              src={PORTRAIT}
              alt="A Maginhawa Group dining room"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          ) : (
            /* DECORATIVE, so aria-hidden and no controls: it carries no
               information the text beside it does not. `muted` is not a
               style choice — autoplay is blocked without it on every
               browser. `playsInline` stops iOS taking it fullscreen. */
            <video
              className={styles.mediaVideo}
              src={VIDEO}
              poster={PORTRAIT}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            />
          )}
          {/* THE SCRIM IS A SEPARATE ELEMENT, not a background on the
              caption, so the ramp can be taller than the text and the text
              can sit anywhere inside it. See the stylesheet for the
              worst-case contrast this guarantees. */}
          <div className={styles.mediaScrim} aria-hidden />
          <figcaption className={styles.mediaLine}>
            <span className={styles.dash} aria-hidden>
              —
            </span>
            {PORTRAIT_LINE[0]}
            <br />
            {PORTRAIT_LINE[1]}
          </figcaption>
        </figure>

        {/* ── RIGHT: heading + pill high, reading block low ── */}
        <div className={styles.copy}>
          <div className={styles.lead}>
            <h2 className={styles.heading}>
              {/* THE EM-DASH IS DECORATION AND IS HIDDEN FROM THE ACCESSIBLE
                  NAME. Left in the text it would be announced as "em dash"
                  before every reading of the heading. */}
              <span className={styles.dash} aria-hidden>
                —
              </span>
              {HEADING}
            </h2>

            <Link href="/about" className={styles.pill}>
              Read our story
            </Link>
          </div>

          <div className={styles.readingBlock}>
            <p className={styles.para}>{PARA_LEAD}</p>

            <ul className={styles.doors}>
              {DOORS.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/restaurants/${d.slug}`}
                    className={styles.door}
                    aria-label={`${d.label} — see the restaurant`}
                  >
                    <span className={styles.doorFrame}>
                      <Image
                        className={styles.doorImg}
                        src={d.src}
                        alt=""
                        fill
                        sizes="150px"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className={styles.paraFine}>{PARA_FINE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
