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

/* ══════════ WHERE THE GROWTH IS ALLOWED TO START ══════════
   ⚠️ THIS WAS A FLAT 0.58 AND IT WAS COSTING THE DESKTOP HALF ITS RUNWAY.
   The plate must still be a small card at the frame the reader first sees
   it, which is the frame it is seated under the sentence — and that frame
   is `--pin-peep` as a fraction of the viewport, which <Passage> derives
   per screen and now publishes on documentElement. Measured, it runs 0.30
   at 1920 to 0.52 on a phone.

   A single constant therefore has to clear the PHONE, and 0.58 did. On a
   1440 desktop, where the card is seated at 0.334, that spent 0.25 of the
   approach — 225px of scroll — holding a card still that had been sitting
   there since it appeared, and left the growth itself only 0.42 to run in.
   That is why the plate opened out as fast as it did: not because the
   animation was quick, but because it was starting late.

   POST_SEAT IS THE BEAT THAT REMAINS, and it is deliberately not zero. The
   card holding its small size for a moment AFTER it has begun to cross the
   sentence is the composition study 12 showed; deriving the start without
   it would delete that beat rather than shorten it. 0.14 keeps about 126px
   of it at 1440 where there used to be 225.

   ⚠️ THE CAP IS WHAT MAKES THIS SAFE, AND IT IS THE OLD CONSTANT. On a
   narrow screen the seat is already at 0.52 and 0.52 + 0.14 would push the
   hold PAST where it is now, i.e. make the phone's growth faster — the
   opposite of what was asked. Clamping to the old value means no screen
   can come out worse than it was: the phone lands exactly where it did,
   the desktop gets the runway back, and the fallback below (used if the
   fraction never arrives) is the old behaviour exactly. */
const ENTER_HOLD_MAX = 0.58;
const POST_SEAT = 0.14;

export default function Reservations() {
  const ref = useRef<HTMLElement>(null);

  // Scroll choreography — the section is a plain 125svh block that scrolls
  // past 1:1 the whole way (no pin — scroll is never held). Three scrubs,
  // all riding normal continuous scrolling: entry seal on the approach, a
  // full-traversal parallax on the footage, and the exit-driven settle on
  // the departure. All three offsets are ELEMENT-relative, so none of them
  // hard-codes a viewport height.
  //
  // The APPROACH drives the plate's arrival: --enter below takes the film
  // from a small rectangular card to full bleed, sealing exactly at full
  // view (section top hits the viewport top).
  //
  // ⚠️ THE APPROACH IS ALSO THE PIN'S CLOCK, WHICH IS NOT OBVIOUS FROM HERE.
  // <Passage /> above pulls this section up by a viewport and holds its own
  // type while this one climbs, so progress 0 lands just before that pin
  // engages and progress 1 lands exactly as it releases. Every number below
  // is really a position on that pin.
  const { scrollYProgress: approach } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  /* ⚠️ --enter IS NOT THE APPROACH ANY MORE, AND THE REMAP IS THE WHOLE
     REASON THE CARD CAN BE SMALL. --enter drives the clip-path's insets, so
     it is the plate's SIZE; the approach is the plate's POSITION, because
     the film travels 1:1 with the scroll and is not pinned. Wiring size
     directly to position means the two cannot be chosen independently — by
     the time the card has risen far enough to sit below the passage's last
     line it has already spent that much of its inset, so a card small
     enough to be a card at that moment has to start absurdly small, and one
     that starts at a sane size is most of the screen by the time you see
     it. That is exactly what the section looked like.

     Holding --enter at 0 for the first stretch separates them: the plate
     keeps its full inset — a genuinely small rectangle — while it rises
     into the cream beneath the sentence, and only then begins to open out.

     ⚠️ 0.58 IS SET BY THE SEATING, NOT BY TASTE, AND IT MOVED ONCE ALREADY.
     Progress runs 0 at the frame before the pin and 1 at the frame it
     releases, so where the PIN STARTS on this scale is `--pin-peep` as a
     fraction of the viewport — and Passage.tsx derives that per viewport
     now, in order to seat this card under the sentence at the moment the
     type locks. Measured, it runs from 0.23 on a short laptop to 0.52 on a
     phone.

     The hold therefore has to end AFTER the largest of those, or the card
     is already growing at the frame the reader first sees it. It was 0.45,
     tuned when the peep was a flat 12svh, and on a phone that put the card
     at 349x319 at rest — very nearly a square, and not the shape anyone
     designed. 0.58 clears the 0.52 ceiling on the peep (see PEEP_MAX in
     Passage.tsx) with a little to spare, so the plate is at its small size
     when it is seated on every screen measured.

     What it costs on a big screen, stated so it is a decision and not a
     surprise: the card also stays small for a stretch AFTER it has begun
     to cross the sentence — about 20svh at 1920 — and only then opens out.
     That is the composition study 12 showed and it reads well; it is not
     an oversight. Seal it earlier and the plate is already growing while
     it is still the thing being looked at. */
  /* ⚠️ READ AFTER PAINT, NOT DURING THE EFFECT. <Passage> writes the
     fraction from its own layout effect and the two components' effects
     are not ordered, so a synchronous read here can miss the first write.
     A rAF defer puts this after the frame that write lands in, and the
     resize path is deferred the same way for the same reason. Until it
     lands the fallback is ENTER_HOLD_MAX, which is the behaviour this
     section shipped with. */
  const [holdEnd, setHoldEnd] = useState(ENTER_HOLD_MAX);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      const seat = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--pin-peep-frac"
        )
      );
      setHoldEnd(
        Number.isFinite(seat) && seat > 0
          ? Math.min(seat + POST_SEAT, ENTER_HOLD_MAX)
          : ENTER_HOLD_MAX
      );
    };
    const defer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    };
    defer();
    window.addEventListener("resize", defer);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", defer);
    };
  }, []);

  const enter = useTransform(approach, [0, holdEnd, 1], [0, 0, 1]);

  /* ⚠️ THE SIDES SEAL EARLY, ON THEIR OWN RAMP. The plate's bottom edge
     crosses the foot of the screen at approach 0.819 and cannot be made to
     do otherwise — see the note over --side-inset in the stylesheet for the
     arithmetic. Sealing the sides by 0.82 means the plate is already full
     width by then, so the reader never sees a frame with the picture flush
     against the bottom of the screen and cream still showing either side of
     it, which is what this fixes. Same flat first segment as --enter, and
     the same seeding requirement because of it.

     ⚠️ IT IS NOT ONLY THE SIDES ANY MORE — THIS RAMP NOW CLOSES THE TOP AS
     WELL, and the name is the only thing left saying otherwise. --top-inset
     rides it too, spending 18svh of stage headroom (--head) over the same
     0.58 → 0.82 stretch. The two numbers are locked to one another:
     head = 100svh × (1 − 0.82), because the section's top sits exactly
     100svh × (1 − approach) down the viewport, so this endpoint is where
     the plate's top edge reaches the viewport's top. MOVE 0.82 AND --head
     IN Reservations.module.css MUST MOVE WITH IT, or the top will seal
     early (leaving the plate's top edge off-screen while cream still shows
     at the sides) or late (the band this whole arrangement removes). */
  const sealX = useTransform(approach, [0, holdEnd, 0.82], [0, 0, 1]);

  /* ══════════ THE INVITATION'S ENTRANCE ══════════
     "Where will you begin?" and its pill are sized for full bleed and
     cannot be read on a 460px card, so they are withheld while the plate is
     small and arrive once it has sealed.

     ⚠️ IT IS A ONE-SHOT NOW AND IT USED TO BE A SCRUB. This was
     `useTransform(approach, [0.72, 0.9], [0, 1])` written into a --cta
     custom property — an opacity DRAGGED BY THE WHEEL. Three things were
     wrong with that and only the third is a matter of taste:

       · it played at whatever speed the reader happened to be scrolling,
         so it had no tempo of its own and never read as an entrance;
       · it ran BACKWARDS on a scroll up, which is not something an
         invitation does;
       · it finished at 0.9, i.e. while the plate was still growing, so the
         heading arrived onto something that had not finished moving.

     What replaces it is an attribute latch: the section carries
     data-cta="in" from the frame the plate is fully bled, and the CSS runs
     a timed entrance off that. See .cta in Reservations.module.css for the
     animation itself.

     ⚠️ THE BAND BETWEEN THE TWO THRESHOLDS IS HYSTERESIS, NOT SLOP. It
     turns on at 0.995 and off at 0.85, and holding the state in between is
     what stops a reader parked at the seam from strobing the entrance with
     small wheel movements. Coming back DOWN below 0.85 does clear it, and
     that is deliberate too: the alternative is a full-bleed invitation
     sitting on top of a 460px card, which is the defect this whole change
     exists to remove.

     ⚠️ AN ATTRIBUTE RATHER THAN REACT STATE, for the same reason every
     other value on this element is written with setProperty: this fires
     mid-scroll, and re-rendering an animation-heavy subtree on a scroll
     frame is a cost with nothing to show for it. */
  const setCta = (el: HTMLElement | null, v: number) => {
    if (!el) return;
    const now = el.getAttribute("data-cta");
    if (v >= 0.995) {
      if (now !== "in") el.setAttribute("data-cta", "in");
    } else if (v < 0.85) {
      if (now !== "off") el.setAttribute("data-cta", "off");
    }
  };

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
  /* --settle 0→1 brings full bleed down to the container plate over the
     departure, so the plate forms while the section is still on screen and
     then simply rides off. Eased (strong in-out) so the shrink starts
     gently and lands gently instead of tracking the scroll linearly.

     ⚠️ 0.38 → 0.60, AND IT IS THE PAGE'S LAST DEAD RUN THAT MOVED IT.
     Measured at 1440×900 (scripts/probe-home-flow.mjs), the departure used
     to finish at scrollY ≈ 6120 and the footer's own type has no arrival at
     all, which left the band 6200 → 6400 scoring a mean motion energy of
     1.7 against a page mean near 300 — the flattest 200px anywhere below
     the hero, and the last thing the reader passes before the end of the
     page. The pixel probe (scripts/probe-scroll-feel.mjs) found the same
     stretch independently: a 360px flat run, the only one on the page.

     0.60 carries the shrink to scrollY ≈ 6320, which is still 338px of
     plate on screen — the reader watches the film's last third resolve its
     side margins and its corner radius rather than watching a finished
     rectangle slide away. Nothing else moves: the endpoints are unchanged,
     the ramp is still monotone, and --settle still reaches 1 with a
     third of the departure to spare.

     ⚠️ IT CANNOT GO MUCH PAST ~0.75. Past that the plate is still resolving
     when its bottom edge leaves the top of the screen, which is the same
     class of fault the journal's rail had — a reveal finishing after the
     thing it reveals has gone. */
  const settle = useTransform(exit, [0.02, 0.6], [0, 1], {
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
  // the CSS falls back to 0% — the MIDDLE of the sweep, not its start.
  //
  // ⚠️ --enter NEEDS THE SAME SEED NOW, AND IT DID NOT BEFORE. This comment
  // used to say the other three fell back to the right value, "--enter 1 is
  // full bleed by design". That was true while --enter WAS the approach: it
  // moved on the first pixel of scroll, so the fallback lasted no time at
  // all. It is a remap with a FLAT FIRST SEGMENT now — 0 for the whole of
  // the hold — and a MotionValue whose output does not change does not
  // emit, so nothing was written across the entire stretch the hold exists
  // to serve and the CSS default stood. The plate arrived full bleed with
  // square corners and the small card never appeared once.
  //
  // The flat segment is the point of the remap, so the seed is the fix
  // rather than the remap. Note the fallbacks are still the correct no-JS
  // values — this writes over them after mount, it does not replace them.
  // ⚠️ AND THE INVITATION'S STATE HAS THE SAME PROBLEM FOR THE SAME REASON,
  // which is worth stating separately because its wrong default is the LOUD
  // one. No attribute at all means the CSS default applies, and that
  // default is VISIBLE — deliberately, so a reader without script still
  // gets the page's only booking control. On a scripted page that default
  // would then stand until the plate first moved, which is most of the way
  // up the approach: the heading and the pill would sit at full size across
  // the whole stretch where the plate is a small card, which is the one
  // thing they are withheld from. Seeding on mount writes the real state.
  useEffect(() => {
    ref.current?.style.setProperty("--parallax-y", `${parallax.get()}%`);
    ref.current?.style.setProperty("--enter", String(enter.get()));
    ref.current?.style.setProperty("--seal-x", String(sealX.get()));
    setCta(ref.current, enter.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parallax, enter, sealX]);
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(dark, "change", (v) => {
    ref.current?.style.setProperty("--dark", String(v));
  });
  // the plate's size, remapped off the approach so it stays a small card
  // while it rises and opens out only once it is past the held type
  // ⚠️ THE PLATE'S SIZE AND THE INVITATION'S STATE COME OFF THE SAME VALUE,
  // and they have to: "once the plate is full bleed" is a statement about
  // --enter, so reading it anywhere else would be a second definition of
  // the same moment. An invisible link still takes a tap, and while this
  // one is hidden it lies across the passage's held sentence — a reader
  // dragging that text would be navigated — so the attribute drives
  // pointer-events as well as the entrance. See .cta in the stylesheet.
  useMotionValueEvent(enter, "change", (v) => {
    ref.current?.style.setProperty("--enter", String(v));
    setCta(ref.current, v);
  });
  useMotionValueEvent(sealX, "change", (v) => {
    ref.current?.style.setProperty("--seal-x", String(v));
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
                the pill already makes; "Where will you begin?" is resolved
                by "Pick a restaurant" directly beneath it, so the lockup asks
                and answers instead of inviting twice.

                IT IS NOW THE WHOLE LOCKUP. With the clock and the support
                line gone the question and its answer are the only two things
                on the frame, which is the arrangement this note always
                described and now literally is. */}
            {/* "begin" rather than "start", at the user's instruction.
                It is the same question and a quieter verb: "start" is what
                you do to an engine, "begin" is what you do to an evening —
                and this heading sits on a film of a dining room. */}
            <h2 className={styles.title}>Where will you begin?</h2>
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
 * The tone is the ONE thing this call site varies, and it is not a
 * preference. This is the only instance standing on a photograph: the
 * default maroon fill is very nearly the film under its own scrim, so the
 * pill would read as a hole rather than an action.
 */
/* CREAM AND LARGE, at the user's instruction — and the third tone this
   seat has carried. It shipped as the green accent, then as saffron (the
   retired annatto orange, argued back in for one pill on a photograph).
   The button-grammar pass ended that: this was the page's only orange, so
   `tone="cream"` removes annatto from the home page entirely. On the dark
   film under its scrim the cream fill is the only opaque object on the
   frame, the same argument the hero's CTA makes — see the surface rule in
   PillCta.module.css. The fused pill-and-disc close is untouched: it is
   the house hover, here as everywhere. `large` takes the control from
   40px to 52px: this is the last action on the page and the only thing on
   its screen, and at the default size it read as a chip on a full-bleed
   film. */
function MagneticCta() {
  return (
    <PillCta
      href="/restaurants"
      className={styles.magnetHost}
      tone="cream"
      size="large"
    >
      Pick a restaurant
    </PillCta>
  );
}
