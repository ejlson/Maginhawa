"use client";

import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./Reservations.module.css";
import VideoBackdrop from "./VideoBackdrop";
import PillCta from "./PillCta";

/* ONE clip, not a cycle. The four that used to rotate here weigh 107MB
   combined; this is the only one the page now pays for, and VideoBackdrop
   still crossfades on a `src` change — that machinery simply never fires
   with a constant src.

   WEIGHT, stated plainly because it is the one cost this choice carries:
   mamasons-hero is 25.6MB against hero-cafemama's 12.9MB, so the section is
   ~12.7MB heavier than it was. hero-cafemama was originally picked here FOR
   that gap. If this band ever reads as slow to arrive on a cold load, a
   web-sized derivative of this clip is the fix, not a different restaurant —
   the choice of room is editorial and belongs to the page. */
const CLIP = "/videos/mamasons-hero.mp4";

export default function Reservations() {
  const ref = useRef<HTMLElement>(null);

  // Scroll choreography — the section is a plain 125svh block that scrolls
  // past 1:1 the whole way (no pin — scroll is never held). Three scrubs,
  // all riding normal continuous scrolling: entry seal on the approach, a
  // full-traversal parallax on the footage, and the exit-driven settle on
  // the departure. All three offsets are ELEMENT-relative, so none of them
  // hard-codes a viewport height.
  //
  // The APPROACH drives the entry corners only (--enter below): the
  // film arrives as a rounded plate and seals into full bleed exactly
  // at full view (section top hits the viewport top).
  const { scrollYProgress: approach } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  // PARALLAX across the FULL TRAVERSAL: the footage drifts inside its
  // overflow-hidden frame for the section's entire trip through the
  // viewport — scrub-linked, so it runs in reverse the moment the user
  // scrolls back up (classic parallax depth). [start end → end start]
  // spans from the section's top entering at the viewport's bottom edge
  // to its bottom leaving at the top.
  //
  // Held at ±4% (narrowed from the original ±8% when the foreground became
  // type to be read rather than one stretched wordmark). It also strictly
  // INCREASES the margin against `.bg`'s scale(1.2), so the video's edges
  // are further from exposure than they were, not closer.
  const { scrollYProgress: traverse } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const parallax = useTransform(traverse, [0, 1], [-4, 4]);

  // SETTLE on the DEPARTURE: the shrink the old scrollytelling pin used
  // to hold the screen for now plays as the section leaves the
  // viewport. Exit range [end end → end start]: 0 while the section's
  // bottom still sits at the viewport bottom (fully in view), 1 once it
  // has scrolled fully off. The inset math is section-relative, so the
  // plate stays centred in the section as it departs.
  const { scrollYProgress: exit } = useScroll({
    target: ref,
    offset: ["end end", "end start"],
  });
  // --settle 0→1 brings full bleed down to the container plate over the
  // first ~40% of the departure, so the plate forms while the section
  // is still mostly on screen and then simply rides off. Eased (strong
  // in-out) so the shrink starts gently and lands gently instead of
  // tracking the scroll linearly.
  const settle = useTransform(exit, [0.02, 0.38], [0, 1], {
    ease: cubicBezier(0.65, 0, 0.35, 1),
  });
  // the maroon ground switches on at the very top of the departure
  // (0–0.03, still hidden behind the full-bleed footage), so the shrink
  // only ever reveals a finished maroon surround — never a cream→maroon
  // fade in progress
  const dark = useTransform(exit, [0, 0.03], [0, 1]);

  // Push the current phase values straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });
  // Seed the drift once on mount. "change" only fires when a MotionValue
  // actually MOVES, so landing on the traverse's first frame (progress 0,
  // where the transform's initial value already IS -4) writes nothing, and
  // the CSS falls back to 0% — the MIDDLE of the sweep, not its start. The
  // other three fall back to the right value (--enter 1 is full bleed by
  // design, --settle and --dark 0 are pre-departure), so this is the only
  // one whose default is wrong where it matters.
  useEffect(() => {
    ref.current?.style.setProperty("--parallax-y", `${parallax.get()}%`);
  }, [parallax]);
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(dark, "change", (v) => {
    ref.current?.style.setProperty("--dark", String(v));
  });
  // the approach's sole job: the entry corners — the film arrives as a
  // rounded plate and seals into full bleed exactly at full view
  useMotionValueEvent(approach, "change", (v) => {
    ref.current?.style.setProperty("--enter", String(v));
  });

  return (
    <section
      ref={ref}
      className={styles.section}
      id="book"
      data-nav-theme="blend"
      data-cursor="glass"
    >
      {/* the stage fills the section exactly; the video scrolls past as one
          full-bleed scene (no pinning) and settles into the container plate
          on its way out */}
      <div className={styles.stage}>
        <div className={styles.reveal}>
          <div className={styles.bg}>
            <VideoBackdrop src={CLIP} className={styles.locVideo} />
          </div>
          <div className={styles.locScrim} aria-hidden />
        </div>

        {/* The page closes on an invitation and a single door, not an index:
            Discover, one chapter up, already BROWSES all eight venues in
            photography, and /restaurants is where a reader picks one. Naming
            the bookable four here as well would be the same restaurants a
            third time, and the third telling loses hardest.

            TWO elements, at the user's instruction, and what went was a
            live London clock above the heading and a support line under it
            ("Seven rooms. Different worlds. One table."). Both had earned
            their place by argument — the clock said something the page could
            not otherwise know and renewed itself every minute; the support
            line said why the choice was worth making rather than listing the
            menu. Neither was wrong. What they cost was the close: four
            elements make a stack a reader parses, and this frame is meant to
            ask one question and hand over one door.

            ⚠️ IF EITHER IS EVER WANTED BACK, they are in git rather than
            commented out here — a four-element lockup carried in comments is
            a fifth thing to keep true. The clock was Europe/London and h23
            (five characters always, so its box could not reflow on the
            minute) and rendered a "--:--" placeholder on the server, because
            a real time in SSR guarantees a hydration mismatch and React 19
            answers one by re-rendering this whole animation-heavy subtree.
            Anyone restoring it needs that placeholder, not just the
            formatter.

            ONE direct child by design. `.cta` is pointer-events: none with
            `.cta > *` restoring auto (it covers the whole stage and must not
            eat the cursor); keeping the whole invitation inside a single
            child keeps the link inside that one restored subtree, since auto
            inherits downward. A second top-level sibling would need the same
            rule or its links would silently stop being clickable. */}
        <div className={styles.cta}>
          <div className={styles.book}>
            {/* A QUESTION, and that is what makes the button an answer.
                "Pull up a chair." was a second invitation stacked on the one
                the pill already makes; "Where will you start?" is resolved
                by "Pick a restaurant" directly beneath it, so the lockup asks
                and answers instead of inviting twice.

                IT IS NOW THE WHOLE LOCKUP. With the clock and the support
                line gone the question and its answer are the only two things
                on the frame, which is the arrangement this note always
                described and now literally is. */}
            <h2 className={styles.title}>Where will you start?</h2>
            <MagneticCta />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The one action on the page's closing frame — and it is the house action
 * now (components/PillCta.tsx), the same pill-and-disc the journal head and
 * the About section carry.
 *
 * WHAT IT WAS: a capsule with a long arrow beside it, at --t-button rather
 * than --t-label, with the arrow stepping forward on hover and the fill
 * swapping saffron → cream. Its own object, in other words, on a page that
 * had three of them. The whole control — nesting, magnet, clip geometry —
 * moved to PillCta; what is left here is a call and a seat.
 *
 * `tone="accent"` is the ONE thing this call site varies, and it is not a
 * preference. This is the only instance standing on a photograph: the
 * default maroon fill is very nearly the film under its own scrim, so the
 * pill would read as a hole rather than an action. The accent keeps it the
 * one saturated thing on the screen, which is what it always was.
 */
/* SAFFRON AND LARGE, at the user's instruction. The tone is the retired
   annatto orange, reintroduced for this control alone — see the note on
   --annatto in globals.css for why the palette's argument against it (an
   orange blurs into maroon ink) does not reach a pill sitting on a
   photograph. `large` takes the control from 40px to 52px: this is the last
   action on the page and the only thing on its screen, and at the default
   size it read as a chip on a full-bleed film. */
function MagneticCta() {
  return (
    <PillCta
      href="/restaurants"
      className={styles.magnetHost}
      tone="saffron"
      size="large"
    >
      Pick a restaurant
    </PillCta>
  );
}
