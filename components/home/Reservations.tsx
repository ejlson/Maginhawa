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
import VideoBackdrop from "@/components/ui/VideoBackdrop";
import PillCta from "@/components/ui/PillCta";

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

/* ══════════ WHERE THE GROWTH RUNS — A WINDOW ON THE APPROACH ══════════
   ⚠️ THE START USED TO BE KEYED TO THE SEAT, AND THAT PUT THE GROWTH IN THE
   WRONG PLACE ON THE SCREEN. It was derived as seat + POST_SEAT under an
   ENTER_HOLD_MAX = 0.58 cap — a number about where <Passage>'s SENTENCE
   ends, not about where the PLATE is. The film travels 1:1 and is never
   pinned, so the un-grown plate's centre sits at exactly 112.5 − 100a svh;
   a start that moves with the seat is a start at a different screen height
   on every viewport. Measured at the first growing frame: centre 67.8%
   down the screen at 1920×1080, 64.8% at 1440×900, 55.9% at 390×844 — and
   83.3% at 1440×620, the bottom sixth of the screen. The expansion this
   section is built around never once began near the middle of the screen,
   and at 1440×900 its centre ran 65% → 54% over the whole growth.

   THE WINDOW IS ONE CONSTANT AND ONE DERIVED VALUE — both positions on
   the approach itself, because the approach IS screen position:

     growStartFor(drop) ⇒ the a at which the un-grown plate's centre
                          sits at CENTRE_AT_START = 57.5% of the screen,
                          just under the middle. The un-grown plate runs
                          from 100(1 − a) down to 225 − 100a − drop, so

                            centre(a) = (325 − 200a − drop) / 2
                            centre = 57.5  ⇒  a = (210 − drop) / 200

                          = 0.550 at drop 100, 0.565 at the ≤980px
                          branch's drop 97.
     GROW_END = 0.90    ⇒ all four margins reach 0 here (see the derived
                          `enter` below for how the bottom is made to
                          agree). The eased centre track between the two
                          dips to 47.8% and lands at 50.0% at drop 100.

   ⚠️ THE START WAS A FLAT 0.55 FOR ONE ROUND, AND THAT WAS A DROP-100
   SPECIAL CASE WEARING A CONSTANT'S CLOTHES. 0.55 solves the centre
   equation only while the card is 25svh tall; under the phone branch's
   97svh drop the card is 28svh, and the same start put its centre at
   59.0% — measured 58.96% at a = 0.550 on 390×844, a 1.5-point miss,
   and WORSE than the seat-keyed scheme it replaced had managed at that
   width (55.9%). Deriving the start from the drop the same effect below
   already reads is what makes 57.5% a property of the design rather
   than of one viewport. The phone pays 0.015 of runway for it
   (0.350 → 0.335), which is the right trade: runway spent on starting
   in the right place.

   ⚠️ GROW_END IS HALF OF A PAIR, AND IT STAYS A CONSTANT. The plate's
   top edge reaches the viewport's top exactly when 100(1 − a) = head, a
   relation with no drop in it — so --head in Reservations.module.css
   MUST equal 100 × (1 − GROW_END) svh = 10svh, and neither number moves
   with the breakpoint. Move either and the other moves with it, or the
   top seals early (edge off-screen while cream still shows at the
   sides) or late (a cream band along the top of an otherwise sealed
   film).

   ⚠️ THE SEAT IS A SAFETY FLOOR NOW, NOT THE DRIVER. The card must still
   be at rest at the frame the reader first sees it seated under the
   sentence, so the growth may never start before the seat lands.
   <Passage> clamps the seat at PEEP_MAX = 0.52 of the viewport, and the
   derived start never falls below 0.550 (drop never exceeds 100svh as
   shipped), so it clears the seat by construction and the floor below
   never binds in practice — it exists so a change over THERE cannot
   silently start the growth under a still-arriving card. The floor is
   seat + MIN_SEAT_HOLD, capped at GROW_START_MAX so a bad reading can
   delay the start by at most 0.07 of the approach (0.055 under drop
   97), never swallow the runway. */
const CENTRE_AT_START = 57.5;
const growStartFor = (drop: number) =>
  (325 - 2 * CENTRE_AT_START - drop) / 200;
const GROW_END = 0.9;
const MIN_SEAT_HOLD = 0.03;
const GROW_START_MAX = 0.62;

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

  /* ⚠️ --enter IS NOT THE APPROACH, AND THE SEPARATION IS THE WHOLE REASON
     THE CARD CAN BE SMALL. The insets are the plate's SIZE; the approach is
     its POSITION, because the film travels 1:1 with the scroll and is not
     pinned. Wiring size directly to position means the two cannot be chosen
     independently — by the time the card has risen far enough to sit below
     the passage's last line it has already spent that much of its inset, so
     a card small enough to be a card at that moment has to start absurdly
     small, and one that starts at a sane size is most of the screen by the
     time you see it. Holding the size ramps flat until growStart keeps the
     plate a genuinely small rectangle while it rises into the cream beneath
     the sentence, and only then opens it out.

     ⚠️ READ AFTER PAINT, NOT DURING THE EFFECT. <Passage> writes
     --pin-peep-frac from its own layout effect and the two components'
     effects are not ordered, so a synchronous read here can miss the first
     write. A rAF defer puts this after the frame that write lands in, and
     the resize path is deferred the same way for the same reason. Until it
     lands the state seeds are the desktop pair — drop 100 and
     growStartFor(100) = 0.550 — and the first read replaces both with the
     derived values for the real drop, one frame after mount.

     ⚠️ --card-drop IS READ HERE TOO, AND IT IS LOAD-BEARING TWICE. The
     derived `enter` below divides by the drop, and the CSS spends
     `--card-drop × (1 − enter)` on the bottom inset — if the two disagreed,
     the bottom edge would miss the foot at the seal. And growStart is
     DERIVED from the drop now, so this read also decides where the growth
     begins. Reading the property off the section keeps one source of
     truth, and the fallback is exact rather than lenient: above 980px the
     stylesheet never DECLARES --card-drop (the CSS leans on the 100svh
     fallback inside its var()), so getComputedStyle returns "" — parseFloat
     gives NaN and the 100 here IS the value the CSS is using, not a guess
     at it. The ≤980px query's 97svh parses to 97. Crossing 980px in either
     direction fires the resize listener, and the deferred read re-derives
     BOTH drop and growStart against the newly matching styles. The parse
     takes the leading number and ASSUMES svh, which is the unit the whole
     derivation runs in — do not put a px length in that property. */
  const [growStart, setGrowStart] = useState(growStartFor(100));
  const [drop, setDrop] = useState(100);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      const dropRead = ref.current
        ? parseFloat(
            getComputedStyle(ref.current).getPropertyValue("--card-drop")
          )
        : NaN;
      const d = Number.isFinite(dropRead) && dropRead > 0 ? dropRead : 100;
      setDrop(d);
      const base = growStartFor(d);
      const seat = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--pin-peep-frac"
        )
      );
      setGrowStart(
        Number.isFinite(seat) && seat > 0
          ? Math.min(Math.max(base, seat + MIN_SEAT_HOLD), GROW_START_MAX)
          : base
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

  /* ══════════ ONE EASED RAMP FOR THE PLATE'S GEOMETRY ══════════
     ⚠️ THE OLD PIECEWISE-LINEAR RAMP HAD INFINITE ACCELERATION AT BOTH
     ENDS, and that — not the four layout-dirtying insets, which cost a
     measured ~0.18ms/frame — was the visible pop. [0, hold, end] → [0, 0, 1]
     takes the plate from stationary-relative-to-the-page to full growth
     speed in ONE frame and back to zero in one frame: measured at 0.35px/ms
     of scroll, the width deltas ran 0 0 0 21.9 42.2 … 42.2 3.5 0 — two hard
     velocity steps bracketing a constant-velocity slab. The fix is a curve
     whose ENDPOINT SLOPE IS ZERO, so the plate's velocity matches the
     page's at both ends of the growth.

     cubicBezier(0.33, 0, 0.67, 1): symmetric, zero slope at entry and exit,
     peak speed only 1.49× linear. If the middle ever reads too fast, step
     DOWN to (0.25, 0, 0.75, 1) (peak ~1.36×); never past (0.42, 0, 0.58, 1)
     (1.72×); and never back to linear — that reinstates both kinks.

     ⚠️ THIS IS THE OPPOSITE CASE TO --ease-entrance, deliberately. An
     entrance curve arrives fast and settles, so on a scrubbed edge its
     start IS a velocity step — the exact trap the journal rail paid for.
     A scrub whose endpoints must match the page needs zero-slope ENDS,
     which no entrance curve has.

     The identity function is the flat first segment's "easing": this
     framer-motion exports no `linear`, the ease array must be one item
     shorter than the range, and any curve on a 0 → 0 segment is a no-op
     anyway. clamp holds the output at 1 past GROW_END — it is the option's
     default, stated because the derived tail below RELIES on it. */
  const grow = useTransform(approach, [0, growStart, GROW_END], [0, 0, 1], {
    clamp: true,
    ease: [(v: number) => v, cubicBezier(0.33, 0, 0.67, 1)],
  });

  /* ⚠️ THE SIDES AND THE TOP ARE THE GROWTH ITSELF — sealX IS grow, not a
     second ramp that happens to agree. The stylesheet spends the side clamp
     and --head on --seal-x, so publishing the one eased progress under this
     name means those margins cannot drift from the growth by construction.

     ⚠️ THE COMMENT THAT STOOD HERE DOCUMENTED A DEFECT AS AN INVARIANT. It
     said the plate's bottom edge crosses the foot of the screen "at
     approach 0.819" and that this was a constant, independent of
     --pin-peep — and sealed the sides at a flat 0.82 to stay ahead of it.
     That was wrong: with the bottom on its own linear ramp the crossing was
     a_foot = 1.25 − 0.25 / holdEnd, a FUNCTION of the seat, and the seat
     moves per viewport. Measured against that relation: crossing at 0.692
     on 1920×1080 (predicted 0.688), 0.725 at 1440×900 (0.723), 0.375 at
     1440×620 (0.372) — all well before 0.82, so every screen showed the
     exact frame the two-ramp scheme exists to forbid: the film flush
     against the foot with cream still showing either side (249px a side at
     1920×1080, 151px at 1440×900, 455px at 1440×620). The repair is not a
     better constant — it is deriving the bottom from this same progress,
     which `enter` below does. */
  const sealX = grow;

  /* ══════════ THE BOTTOM EDGE, DERIVED RATHER THAN TIMED ══════════
     The plate's visible bottom is `film box top + 125svh − bottom inset`,
     the CSS spends `drop × (1 − enter)` on that inset (drop = --card-drop
     in svh), and the section's top sits at 100(1 − a)svh, so the bottom
     edge is at

         B(a) = 225 − 100a − drop + drop·enter          [svh]

     Ask for the one thing that matters — that the bottom travel from its
     un-grown track B0(a) = 225 − 100a − drop to the foot of the screen on
     exactly the eased progress g the other three margins ride,
     B = B0 + (100 − B0)·g — and solve for enter:

         enter(a) = g(a) · (100a + drop − 125) / drop

     That lands the bottom on the foot at PRECISELY a = GROW_END, with zero
     velocity (g's endpoint slope is zero), under ANY easing and ANY
     --card-drop — the desync between the bottom and the sides is exact
     now, not a pair of hand-tuned endpoints. At the seal enter has reached
     (100·GROW_END + drop − 125) / drop = 0.65 at drop 100 and 0.639 at
     drop 97; the tail then runs linearly to 1 by a = 1, so everything
     still spending --enter (the bottom inset — 35svh of it, all below the
     fold — and the last 0.7px of corner radius) finishes exactly at full
     view. enter is strictly increasing across the whole approach — g and
     the bracket both rise over the growth and the bracket is positive
     wherever g is — so nothing riding it can ever run backwards on the
     way in.

     ⚠️ THE TOP CLOSES LAST, BY 3–5px OF SCROLL, AND THAT IS THE FLOOR —
     DO NOT TUNE AT IT. Measured at every viewport: the sides and the
     bottom arrive together within 0.6px, then the top's last 3.1–5.2px
     close over the following frame or two (rows y = 0–3 still cream at
     1440×620 while the other three edges are flush). Structural, not a
     miss: the top edge is 100(1 − a) − head·g, so it approaches the seal
     at 100 + head·g′ — the PAGE's own speed plus a term that has died by
     the endpoint, because g′ → 0 there is exactly what removes the
     growth's exit kink. Landing the top with zero velocity would need
     g′ = −100/head at the seal — a DECREASING seal, on a value that also
     carries the scrim and must stay monotone. So the sides and bottom
     close asymptotically, the top closes at page speed, and page speed
     means last. Growing --head to start the top earlier only trades a
     3–5px sliver for a longer window of flush-top-with-inset-sides — the
     mirror of the 151–455px cream-band defect this derivation removed —
     and the same straggle existed under the old 0.82 seal. It is the
     price of a top edge that must travel with the page. */
  const enterAtSeal = (100 * GROW_END + drop - 125) / drop;
  const enter = useTransform([approach, grow], ([a, g]: number[]) =>
    a <= GROW_END
      ? (g * (100 * a + drop - 125)) / drop
      : enterAtSeal + ((1 - enterAtSeal) * (a - GROW_END)) / (1 - GROW_END)
  );

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
