"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { useRef } from "react";
import styles from "./StoryStrip.module.css";

/**
 * The statement's payoff: a byline that dates the group, and a band of
 * photographs drifting sideways under it as the reader comes down the page.
 *
 * Rendered INSIDE the manifesto's section rather than as a chapter of its
 * own — the statement and this band share one screen, the claim above and
 * the evidence beneath it. See Manifesto.module.css for the layout that
 * seats the two.
 */

/* THE PRINTS, NOT THE VENUE HEROES — and this is the whole of "use
   different images".

   The band used to render `RESTAURANTS[].image`. Those are the same files
   Discover's cards use one chapter above (lib/venueCards.ts falls through to
   `r.image`), so the page showed the reader the identical seven photographs
   twice inside one scroll — and because the canonical venue image is a
   SHOPFRONT for most of them, the band read as a row of storefronts rather
   than as anything about the food or the rooms.

   `ourrestaurants/print-*` are editorial frames that were already in the
   repository and referenced nowhere (AboutIntro's own comment called the ten
   of them orphans, and AboutIntro itself is off the page now). They are the
   right pictures for this job and they cost nothing to adopt.

   NO LABELS, and the picture set is why that works. Named frames made this a
   second venue index competing with the real one above it; unnamed editorial
   prints make it a band of atmosphere, which is what belongs under a
   statement of belief. The venues are enumerated, named and linked in
   Discover — this does not have to do that job as well. */
const PRINTS = [
  "/images/ourrestaurants/print-01-web.jpg",
  "/images/ourrestaurants/print-02-web.jpg",
  "/images/ourrestaurants/print-03-web.jpg",
  "/images/ourrestaurants/print-04-web.jpg",
  "/images/ourrestaurants/print-05-web.jpg",
  "/images/ourrestaurants/print-06-web.jpg",
  "/images/ourrestaurants/print-07-web.jpg",
  "/images/ourrestaurants/print-08-web.jpg",
];

/* THREE MARKS ACROSS THE MEASURE — where, who, what.

   The reference sets a masthead of three: a place at each end and the
   studio's own mark between them (Tandem's is "Chicago, IL 01:12 · Tandem ©
   Since 1997 · Tampa, FL 02:12"). The two live clocks work there because
   the practice has two offices in two timezones; this is one group in one
   city, so copying the FORM without the content would mean inventing a
   second location or printing the same time twice. The three marks here
   carry the three things a reader actually wants at this moment — where it
   is, how long it has been going, and what it cooks.

   SHORT, AND THE SAME SHAPE AS EACH OTHER. They were longer — "Kentish
   Town, London", "Maginhawa © Since 1987", "Filipino · Filipino-Japanese ·
   Caribbean" — and at three uneven lengths the row read as three sentences
   rather than as a masthead. Trimmed to a place, a name and a date, the
   three marks scan as one line of apparatus, which is what they are.

   THE CUISINES MOVED RATHER THAN VANISHED. "Filipino, Filipino-Japanese
   and Caribbean" is the only one of the three that says WHAT THIS IS, and
   it is the one thing a first-time reader most needs — so it is now the
   eyebrow ABOVE the statement (see Manifesto.tsx), where it introduces the
   sentence instead of trailing it.

   EVERY MARK IS SOURCED. 1987 is the /about page and its structured data
   ("from a 1987 Camden kitchen"); London is the group's city on every
   venue in lib/restaurants.ts. A masthead is exactly where invented detail
   goes unchallenged, so none of it is invented.

   NO VENUE COUNT: TODOS.md item 7 records "seven rooms vs eight tiles" as
   an unreconciled discrepancy, so any number printed here would be picking
   a side of an open question. */
const MARKS = ["London", "Maginhawa", "Est. 1987"];

/* HOW FAR THE BAND DRIFTS, as a share of the TRACK's own width — the unit
   `x` percentages resolve against is the translated element, not the
   viewport, which is what makes this safe at every screen size.

   The band must never drag its right edge into view. Eight frames at
   `clamp(300px, 30vw, 480px)` plus gaps make a track that overflows the
   window several times over — right edge after a full 14% drift, versus the
   viewport it has to clear:
     390px    2295px track →  1974px  vs  390    ✓
     1440px   3575px track →  3075px  vs  1440   ✓
     1920px   3966px track →  3411px  vs  1920   ✓
   RE-CHECK THESE IF THE FRAME WIDTH, ASPECT OR COUNT CHANGES. It is
   arithmetic, not a guarantee — a wider frame lengthens the track and helps,
   but dropping frames shortens it and eventually bites. */
const DRIFT_FROM = "-2%";
const DRIFT_TO = "-14%";

/* ── THE ARRIVAL ──
   0.07s between frames: at the band's EIGHT prints that is a 0.56s wave
   across the row, which is long enough to read as left-to-right and short
   enough that the last frame is not still arriving when the reader has
   finished looking at the first. Measured mid-flight, six of the eight are
   in motion at once (opacities 0.99 / 0.97 / 0.93 / 0.85 / 0.70 / 0.45 /
   0.07 / 0), which is the wave the stagger is tuned for — a queue of
   separate events would show one or two. Each print rises a little and inks in over 0.7s on
   the site's entrance curve, so several are always in flight at once and
   the row never reads as a queue of separate events.

   THE TRAVEL IS SMALL — 24px against a frame ~300px tall. The band already
   carries a scroll-linked horizontal drift (see `x` below); a large
   entrance on top of that would read as two unrelated movements rather than
   as one band settling. */
const bandVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const frameVariants: Variants = {
  hidden: { y: 24, opacity: 0 },
  shown: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function StoryStrip() {
  const reduce = useReducedMotion();
  const bandRef = useRef<HTMLDivElement>(null);

  /* THE WHOLE PASS, not a window inside it. `start end → end start` runs 0
     the moment the band's top reaches the bottom of the screen and 1 as its
     bottom leaves the top, so the drift is spread over every pixel of
     scroll the band is visible for. That is what makes it read as slow: the
     travel is small AND the range is as long as it can possibly be. */
  const { scrollYProgress } = useScroll({
    target: bandRef,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], [DRIFT_FROM, DRIFT_TO]);

  return (
    /* ── THE BAND IS THE THIRD BEAT, at the user's instruction ──
       The eyebrow pops, the sentence builds out of its masks, and then the
       photographs used to simply be there. They arrive now, left to right,
       so the screen reads as one choreographed frame rather than as type
       with a strip under it — and the crop at the fold becomes something
       ARRIVING rather than something cut off.

       ⚠️ THE OBSERVER IS ON THE BAND, NOT ON THE TRACK, AND THAT IS NOT A
       PREFERENCE. `.rail` is `overflow: hidden` and the track is wider than
       it: an IntersectionObserver intersects its target against the clip
       rect of every ancestor, so a `whileInView` on the track or on a frame
       would be measuring a box that is mostly clipped away — the same trap
       recorded in Discover.tsx, where a word parked below its own mask
       reported a 0 ratio forever and its heading could never rise.

       Variants reach the frames through React context, so the plain
       `.rail` div between this element and them does not break the chain;
       the track is a motion component that declares no variants of its own
       and simply passes them through. */
    <motion.div
      className={styles.band}
      ref={bandRef}
      variants={bandVariants}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "shown"}
      viewport={{ once: true, amount: 0.15 }}
    >
      {/* THE MASTHEAD — three marks across the measure, ends and centre.

          NO HAIRLINE ABOVE IT. A rule sat here closing the statement and
          opening the band; removed at the user's instruction. It was
          hairline 2 of the three this page was building toward, so
          Discover's head rule is now the only one on the home page.

          NO "LEARN MORE ABOUT US" EITHER, removed in the same pass. WORTH
          KNOWING WHAT THAT COSTS: with the About Us chapter already gone
          from this page, that link was the home page's only route to
          /about. It is still in the navbar on every route, so the page is
          not reachable-by-nav-only by accident — but the home page now
          makes no editorial invitation to the group's story at all. If that
          matters, the masthead's centre mark is the natural place to put it
          back as a link rather than re-adding a button. */}
      <div className={styles.meta}>
        {MARKS.map((m) => (
          <span className={styles.mark} key={m}>
            {m}
          </span>
        ))}
      </div>

      {/* THE RAIL CLIPS; THE TRACK MOVES. Splitting the two is what keeps the
          drift from adding document width — a transform on an unclipped row
          this wide would give the page a horizontal scrollbar. */}
      <div className={styles.rail}>
        <motion.div
          className={styles.track}
          style={reduce ? undefined : { x }}
        >
          {PRINTS.map((src) => (
            <motion.div
              className={styles.frame}
              key={src}
              variants={frameVariants}
            >
              {/* alt="" ON PURPOSE. With the names gone these carry no
                  information a reader could act on, and the claim they
                  illustrate is made in words directly above them by the
                  statement itself. Every venue is named, described and
                  linked in Discover one chapter up. Giving eight atmosphere
                  frames invented descriptions would add noise to a screen
                  reader, not access. */}
              <Image
                className={styles.img}
                src={src}
                alt=""
                fill
                sizes="(max-width: 780px) 68vw, 30vw"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
