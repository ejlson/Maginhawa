"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { onChapterReady } from "@/lib/chapter";
import styles from "./ChapterPin.module.css";

/**
 * Holds a chapter still while the next one climbs over it.
 *
 * The cover is exactly the viewport the following chapter's top edge takes
 * to travel from the bottom of the window to the top. Across it, this chapter
 * is pushed DOWN the page at very nearly the rate the page is scrolling up —
 * so it stays where it is on screen while everything else moves — and the
 * next chapter, which carries an opaque ground and sits above this one in
 * the stacking order, simply covers it.
 *
 * A transform, not `position: sticky`. Sticky cannot express this: `top`
 * would hold the chapter's FIRST screen, which the reader has already read,
 * and `bottom` only ever pulls an element UP from below the fold — it has no
 * power to hold one that is leaving upward. Getting a sticky offset to hold
 * the last screen of a taller-than-viewport chapter means feeding it the
 * chapter's measured height, which is a resize observer and a re-measure for
 * something the scroll position already tells us. This is one composited
 * transform and no measurement at all.
 *
 * DRIFT. A chapter held perfectly still under a moving one reads as a stuck
 * page rather than as depth, so the hold is deliberately imperfect: it
 * travels a few vh SHORT of cancelling the scroll, which lifts it slowly as
 * it is covered. Enough that the two planes are clearly not the same
 * distance away, small enough that nobody would call it an animation.
 *
 * HOLD. Before any of that, the chapter is simply KEPT: `hold` vh of scroll
 * during which it is pushed down at the same rate and nothing covers it,
 * because the next chapter's top edge is still that far below the fold.
 * This is not padding — the reader sees no empty ground, since the held
 * chapter travels down over it. It buys the chapter time to finish saying
 * what it was saying (the restaurant grid's assembly ends the instant it
 * hands scroll back, and being overrun by the next chapter a beat later
 * reads as an interruption).
 *
 * The runway at the end of the box is both the hold and the clock: its
 * bottom edge sits exactly where the next chapter's top edge falls, so
 * "how far covered" is read straight off the geometry.
 *
 * WAITING ITS TURN. The pass would otherwise begin the moment the held
 * chapter's bottom edge reaches the bottom of the window — and a chapter
 * that stages its own arrival is not finished then. The restaurant grid is
 * shorter than a viewport and parks its composition two thirds of the way
 * down itself, so its bottom edge arrives ~170px BEFORE its title reaches
 * the middle of the screen. Engaging there was fatal rather than untidy:
 * the hold cancels the scroll exactly, so the title then could not move at
 * all, and the performance only armed once the drift had inched it into
 * the trigger band — by which time the reader was most of the way through
 * the cover with the next chapter's maroon already on screen. So the pin
 * holds nothing until the chapter says it is done, and REBASES when it is:
 * the progress at that moment becomes the new zero. The hold loses those
 * few dozen pixels and nothing else moves — in particular the cover still
 * ends exactly where the geometry says it does, which is the property that
 * makes the seam impossible.
 */
export default function ChapterPin({
  children,
  drift = 7,
  hold = 60,
}: {
  children: React.ReactNode;
  /** how far the held chapter lifts across the whole pass, in vh */
  drift?: number;
  /** scroll held BEFORE the next chapter starts crossing, in vh */
  hold?: number;
}) {
  const reduce = useReducedMotion();
  const runwayRef = useRef<HTMLDivElement>(null);
  // start → the runway's top reaches the bottom of the window
  // end   → its bottom (the next chapter's top edge) reaches the top
  // so the pass is (100 + hold)vh of scrolling, of which the LAST 100 is
  // the cover and the first `hold` is the beat before it
  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start end", "end start"],
  });
  /* The chapter's own permission, and the progress it was at when it gave
     it. `base` is read off the live scroll rather than assumed to be zero:
     the chapter finishes wherever its performance parked the page. */
  const [ready, setReady] = useState(true);
  const [base, setBase] = useState(0);
  useEffect(
    () =>
      onChapterReady((next) => {
        if (next) setBase(scrollYProgress.get());
        setReady(next);
      }),
    [scrollYProgress],
  );

  /* Two segments, because the drift must not be spent during the hold.
     Across the hold the travel CANCELS the scroll exactly — the chapter
     does not move by a pixel, and its bottom edge stays welded to the
     empty runway below it, so no strip of bare page can open up under it.
     The drift is spent entirely across the cover, where there is something
     moving over the top of it for the lift to read against.

     The middle stop is the fraction of the pass the hold occupies, which
     is exactly where the next chapter's top edge reaches the bottom of the
     window — fixed by geometry, so rebasing shortens the hold and leaves
     the cover alone. A chapter that only finished once the cover had begun
     gets no hold at all rather than a negative one. */
  const handover = hold / (100 + hold);
  // vh the chapter travels across what is left of the hold
  const yHold = Math.max(0, (handover - base) * (100 + hold));
  const y = useTransform(
    scrollYProgress,
    base < handover ? [base, handover, 1] : [base, 1],
    base < handover
      ? ["0vh", `${yHold}vh`, `${yHold + 100 - drift}vh`]
      : ["0vh", `${100 - drift}vh`],
    { clamp: true },
  );

  return (
    <div className={styles.host}>
      <motion.div
        className={styles.held}
        style={reduce || !ready ? undefined : { y }}
      >
        {children}
      </motion.div>
      <div
        ref={runwayRef}
        className={styles.runway}
        style={{ height: `${hold}vh` }}
        aria-hidden
      />
    </div>
  );
}
