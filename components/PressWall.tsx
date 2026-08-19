"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./PressWall.module.css";
import { FEATURED_OUTLETS } from "@/lib/press";
import { asset } from "@/lib/media";

// shared enter curve — the same rise the other chapters use
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The group's press credential, on the cream — ONE DRIFTING LANE OF
 * MASTHEADS AND NOTHING ELSE.
 *
 * THIS IS THE FIFTH ARRANGEMENT AND THE SECOND TIME IT HAS DRIFTED. It
 * began as a centred "As Seen In" over a moving lane, grew into three named
 * credentials in display type with the logos demoted beneath them, was cut
 * back to a label over a still wall, had that wall set as three hand-
 * balanced justified rows — and is now a single scrolling lane again, at
 * the user's instruction.
 *
 * WHAT CAME BACK, AND FROM WHERE. The lane, the doubled track, the edge
 * masks and the 72s pass are recovered from the version at HEAD rather than
 * rebuilt: this file's own note said to do that if a drifting lane ever
 * returned, and it was right — the seamless-wrap trick below (the trailing
 * pad that makes -50% land exactly one copy along) is the kind of thing
 * that gets re-derived wrong.
 *
 * WHAT DID NOT COME BACK: the SCROLL-LINKED DECELERATION, a useScroll
 * driving the animation's `playbackRate` 1 → 0 across the last 35% of the
 * section's exit so the mastheads coasted to a stop as the journal arrived.
 * It is not asked for here and it is the one piece of this section that was
 * expensive; it is still in git if the seam ever wants it again.
 *
 * ── THE VISIBLE LABEL IS GONE, AND THE HEADING IS NOT ──
 * "As featured in" is removed at the user's instruction. The <h2> stays as
 * visually-hidden text, because it is doing two jobs the words on screen
 * were only incidentally doing: the section is `aria-labelledby` it, and
 * without a heading this becomes an unnamed region containing fourteen
 * images whose alt text is a list of magazine names — which does not tell a
 * screen reader what it is looking at. Nothing renders; the wall speaks for
 * itself sighted, and the heading speaks for it otherwise.
 */

/* ONE LANE, in a hand-set ORDER that mixes wide and compact wordmarks so the
 * line never bunches — the same job the three hand-balanced rows used to do,
 * and a simpler one now that a lane has no measure to fill and no row ends to
 * justify against.
 *
 * ⚠️ THE ORDER IS THE ONLY SPACING CONTROL LEFT, and it matters more than it
 * did: on a fixed gap, three wide marks in a row read as a dense passage and
 * three compact ones as a hole. Wide (The Independent, The Infatuation, The
 * Sunday Times, Evening Standard, Hypebeast) and compact (Metro, Forbes, Time
 * Out, That's Up, Michelin Guide) alternate below.
 *
 * THE INK-BALANCED THREE-ROW SPLIT IS RETIRED WITH THE WALL. It solved
 * gap = (measure − ink) / (marks − 1) per row so the three rows read as
 * evenly spaced; a lane has one gap for all fourteen and no margins to set
 * flush to, so there is nothing left to solve. If the wall ever comes back,
 * recover that arithmetic from git rather than re-deriving it.
 *
 * THIS LIST CARRIES NO SIZE. There is exactly ONE size knob, `scale` in
 * lib/press.ts, and it is MEASURED off each logo's ink rather than guessed.
 *
 * DETERMINISTIC — no Math.random, no measurement at runtime. Server and
 * client render identical markup; a shuffled lane would hydrate differently
 * from the HTML it was sent. Names must match FEATURED_OUTLETS. */
const ORDER = [
  "The Independent",
  "Metro",
  "Hypebeast",
  "Forbes",
  "The Sunday Times",
  "Time Out",
  "Evening Standard",
  "Michelin Guide",
  "The Infatuation",
  "BBC Good Food",
  "Country & Townhouse",
  "That's Up",
  "The Week",
  "The Guardian",
] as const;

const MARKS = ORDER.map((name) =>
  FEATURED_OUTLETS.find((o) => o.name === name),
).filter((o): o is NonNullable<typeof o> => Boolean(o?.logo));

export default function PressWall() {
  const reduce = useReducedMotion();

  return (
    <section
      className={styles.section}
      aria-labelledby="featured-in"
      data-nav-theme="light"
    >
      {/* the section's name, for the outline and for `aria-labelledby`.
          Visually hidden — see the note above. */}
      <h2 className={styles.srOnly} id="featured-in">
        As featured in
      </h2>

      <motion.div
        className={styles.lane}
        initial={reduce ? false : { opacity: 0, transform: "translateY(14px)" }}
        whileInView={
          reduce ? undefined : { opacity: 1, transform: "translateY(0px)" }
        }
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        {/* The track holds the line TWICE and travels exactly -50%, so the
            wrap is seamless — at the end of the pass the second copy sits
            precisely where the first began. The reader is meant to see one
            continuous lane, so the second copy is aria-hidden: it is the
            same fourteen mastheads again, and a screen reader reading the
            list twice would be reporting an implementation detail. */}
        <ul className={styles.track}>
          {[0, 1].map((copy) =>
            MARKS.map((outlet) => (
              <li
                key={`${copy}-${outlet.name}`}
                className={styles.logoSeat}
                style={{ "--s": outlet.scale ?? 1 } as React.CSSProperties}
                aria-hidden={copy === 1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.logo}
                  // most of these marks are SVG, which `asset()` returns
                  // untouched by design — see its note on SVG delivery
                  src={asset(outlet.logo)}
                  alt={copy === 0 ? outlet.name : ""}
                  draggable={false}
                  /* ⚠️ DEPRIORITISED, NOT LAZY, AND THE DIFFERENCE MATTERS
                     HERE. These marks are Figma exports and they are not
                     small — thesundaytimes.svg alone is 869KB — and this
                     band sits thousands of pixels down the page, so on a
                     phone they were competing with the hero's own film for
                     the first screen's bandwidth: ~1.2MB of mastheads
                     nobody could see yet.
                     `loading="lazy"` is the obvious answer and it is the
                     wrong one for a MARQUEE. The track holds the line twice
                     and translates -50% forever; the second copy sits a few
                     thousand pixels to the right of the rail, outside every
                     viewport check the browser makes, so those images would
                     defer until the transform carried them in and then pop
                     into a lane that is supposed to be seamless.
                     `fetchPriority` changes only the ORDER — every mark
                     still loads eagerly, behind the things on screen. */
                  fetchPriority="low"
                  decoding="async"
                />
              </li>
            )),
          )}
        </ul>
      </motion.div>
    </section>
  );
}
