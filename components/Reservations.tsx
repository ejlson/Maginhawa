"use client";

import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
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

/* ---------- the live clock ----------

   EUROPE/LONDON, never the visitor's zone. A reader in Manila told "it's
   4:12am" about a London restaurant group has been handed a fact about
   themselves, not about us; the whole point of the device is that it is
   addressed to the reader ABOUT this place, now.

   24-HOUR, and that is a layout decision as much as a register one. `h23`
   always yields five characters (`00:07`, `16:12`), so the token's box never
   changes width between one minute and the next — where a 12-hour clock
   swings between `4:12 pm` (7) and `12:34 pm` (8) and would jiggle the
   sentence around it twice a day. en-GB reads 24-hour natively anyway.

   Built once at module scope: an Intl formatter is expensive to construct
   (~0.1ms) and this one is stateless, so re-making it every tick would be
   pure waste. */
const LONDON_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// What the SERVER renders. It must be the same five-character shape as a real
// value (see `.clockTime`'s reserved box) so the sentence does not reflow when
// the real time lands after mount.
const CLOCK_PLACEHOLDER = "--:--";

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

            Four elements now, and the line above the heading is back — but
            it is a different KIND of thing from the "Reservations" eyebrow
            that was removed. That label captioned a sentence which already
            said what it was; a live London clock states something the page
            could not otherwise know, changes every minute, and is addressed
            to whoever is reading at that minute. A static label earns its
            line once; this one earns it continuously.

            ONE direct child by design. `.cta` is pointer-events: none with
            `.cta > *` restoring auto (it covers the whole stage and must not
            eat the cursor); keeping the whole invitation inside a single
            child keeps the link inside that one restored subtree, since auto
            inherits downward. A second top-level sibling would need the same
            rule or its links would silently stop being clickable. */}
        <div className={styles.cta}>
          <div className={styles.book}>
            <LondonClock />
            {/* A QUESTION, and that is what makes the button an answer.
                "Pull up a chair." was a second invitation stacked on the one
                the pill already makes; "Where will you start?" is resolved by
                "Choose a restaurant" directly beneath it, so the lockup asks
                and answers instead of inviting twice. */}
            <h2 className={styles.title}>Where will you start?</h2>
            {/* ON the centre line, deliberately — NOT splayed into the bottom
                corners the way the reference CTA does it. That reference can
                afford corners because its wash is uniform; ours is a centred
                pool that releases toward the edges (see `.locScrim`), so copy
                in the corners would drag the dark back out to the frame edges
                and undo the one change that gives the photograph back.

                ABOVE the pill, not below it. Measured at 1920x1080 the block
                ran 17 / 43 / 34px between its four elements, which left the
                button with 43px over it and 34px under — near-symmetrical, so
                it read as centred INSIDE the lockup rather than as its last
                move, and the section ended on an explanation after handing the
                reader the action. Ordering it context → hook → why → action
                puts the stack's largest gap under the heading where it belongs
                and gives the pill the bottom of the block to itself.

                The punctuation is load-bearing too: as one 470.4px
                (--measure-tight) em-dashed sentence this broke INSIDE the
                clause, splitting "Caribbean," from "ramen, ice cream". A full
                stop after the first claim gives the line a natural place to
                turn.

                THREE THINGS CAME OUT OF THIS LINE, each for its own reason.

                "across London" went because the clock directly above already
                says IN LONDON, and the heading is now a question about WHICH
                OF OURS. Naming the city twice in a four-element stack answered
                a question nobody asked at the expense of the one that was. The
                claim is still true and still made — once, by the element whose
                whole job is to make it.

                "Seven kitchens" went because the Interlude, two sections up
                this same page, is the line "One family, seven kitchens." A
                support line opening on the same two words read as an echo of a
                heading the reader had just passed. "Rooms" is the site's own
                other word for them — the About intro runs "seven distinct
                dining rooms" — so it is a synonym the page already owns rather
                than a new coinage.

                THE EIGHTH WENT BY INSTRUCTION, not by argument: no forthcoming
                opening is to be mentioned here. Bunso is still surfaced on the
                page — the Discover grid and /restaurants both carry it as a
                coming-soon card — so nothing is being hidden; this line simply
                no longer previews it. If it is ever to be announced again, the
                claim is `comingSoon: true` on Bunso (lib/restaurants.ts L191).

                IT IS NO LONGER AN INVENTORY. The line used to list the four
                cuisines, which answered "where will you start?" by handing the
                reader the menu. This answers it by saying why the choice is
                worth making at all — three short sentences that widen and then
                close: seven of them, each unlike the others, all the same
                family. The turn from "different" to "one" is the whole line.

                What that costs is the cuisine names, which were this block's
                most concrete claim; what it buys is a line that reads as the
                group's voice rather than as a specification. If the concrete
                version is ever wanted back, it was: "Filipino, Caribbean,
                ramen, ice cream." — all four checkable at lib/restaurants.ts
                L45/101/160/183, L70/127, L101 and L88.

                "Seven rooms" is still the checkable one and still true: seven
                trading, with Bunso (L181) carrying `comingSoon: true` (L191)
                and deliberately not counted here. Every `location` is a London
                one (L48, 73, 91, 104, 130, 143, 163, 186), which is what lets
                the clock above carry the city alone. For reference the four
                cuisines are
                Bintang/Ramo/Belly/Bunso "Filipino" (L45, 101, 160, 183),
                Guanabana/Hoodwood "Caribbean" (L70, 127), Ramo "Ramen"
                (L101) and Mamasons "Ice Cream Parlour" (L88). No founding
                year, no covers count, no award — the Michelin line is
                already carried five times higher up this page. */}
            <p className={styles.support}>
              Seven rooms. Different worlds. One table.
            </p>
            <MagneticCta />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The live line above the invitation: "IT'S 16:12 IN LONDON".
 *
 * It says the TIME and nothing else. `lib/restaurants.ts` carries no opening
 * hours — only `bookable`, `bookingUrl`, `addresses` and `comingSoon` — so any
 * sentence about a kitchen being open, still serving, or holding a table
 * tonight would be invented. The time itself is the one temporal fact this
 * repo can actually stand behind, and it is enough: it makes the close read as
 * addressed to a person who is here now rather than to nobody in particular.
 *
 * HYDRATION. The server's clock is not the reader's, so rendering a real time
 * during SSR guarantees a text mismatch on hydration — and React 19 recovers
 * from one by re-rendering the whole subtree client-side, which on a section
 * this animation-heavy is a visible blank. So the server renders a placeholder
 * of the SAME character count and the real value only ever arrives in an
 * effect. Nothing about the markup differs between the two passes except the
 * five characters inside a box that is sized to hold them either way.
 */
function LondonClock() {
  const [clock, setClock] = useState(CLOCK_PLACEHOLDER);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setClock(LONDON_CLOCK.format(new Date()));
      // Re-arm ON the next minute boundary rather than polling every 60s from
      // mount: a fixed interval starts wherever the page happened to load, so
      // half the time the displayed minute would be up to 59s stale. Chasing
      // the boundary keeps it under a second wrong, for the same one wake-up
      // per minute. The 250ms cushion covers timer coarsening — firing a hair
      // EARLY would format the minute we are leaving and then sit on it for
      // another full minute.
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 250);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <p className={styles.clock}>
      {/* Not a <time> element: its `datetime` attribute would have to be
          absent (or wrong) for the placeholder, and a valid <time> demands a
          parseable machine value, which "--:--" is not. The live region is
          also deliberately absent — a clock that announced itself to a screen
          reader every sixty seconds would interrupt the page for a fact
          nobody asked for. */}
      It’s <span className={styles.clockTime}>{clock}</span> in London
    </p>
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
