"use client";

import {
  cubicBezier,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./Reservations.module.css";
import VideoBackdrop from "./VideoBackdrop";

// ONE clip, not a cycle. The four that used to rotate here weigh 107MB
// combined (belly 25.2 / mamasons 25.6 / bintang 44.0); this one is 12.9MB,
// lighter than the next by 3.4x, and it is the only one the page now pays
// for. VideoBackdrop still crossfades on a `src` change — that machinery
// simply never fires with a constant src.
const CLIP = "/videos/hero-cafemama.mp4";

/* ---------- the magnetic button ----------

   Three numbers, all derived from the button's own box so the effect stays
   proportional if the pill's type or padding ever changes.

   REACH — the activation radius as a multiple of the button's HALF-DIAGONAL
   (not a pixel constant, which would mean something different on every
   breakpoint). The rendered pill measures ~290x47 at 1440, half-diagonal
   ~147, so the magnet wakes at ~235px from centre: roughly one button-width
   of approach, close enough that it never reaches across the column for a
   pointer that is plainly going somewhere else.

   PULL + the QUADRATIC falloff together shape the curve. Displacement is
   `PULL * offset * (1 - dist/radius)^2`: zero at the centre (there is no
   offset to follow), zero at the boundary (so nothing snaps when the pointer
   crosses in or out), peaking in between. Squaring the falloff is what keeps
   the far half of the radius quiet — with a LINEAR falloff the same peak
   forced a 15px shove while the pointer was still 200px away, which read as
   the button lunging at people walking past. At 1440 the curve measures:
   200px away -> 3px, 150 -> 15px, 100 -> 23px (capped), 50 -> 23px, 20 -> 13px.

   CAP — half the button's own height (~23px). The ceiling the spec asks for:
   at full pull the pill still overlaps its rest rect by better than 75% of
   its area, so it never separates from the space the reader saw it occupy.
   It binds only in a narrow band around dist ~78px, which is exactly where
   the raw curve would otherwise overshoot. */
const REACH = 1.6;
const PULL = 0.75;
// Damping 22 against 2*sqrt(stiffness*mass) = 22.8 puts this at zeta ~= 0.96 —
// just inside critical, so the button returns home without crossing its rest
// position. Overshoot here is not merely cosmetic: this section is
// data-cursor="glass", and CustomCursor resolves its mode from
// elementFromPoint every frame, so an edge swinging back across a stationary
// pointer would flip button<->zone mode repeatedly on the way to rest.
const MAGNET_SPRING = { stiffness: 260, damping: 22, mass: 0.5 };

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
            <h2 className={styles.title}>Pull up a chair.</h2>
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

                Every claim here is checkable against lib/restaurants.ts:
                eight entries, of which Bunso (L181) carries
                `comingSoon: true` (L191) — so seven trading and an eighth
                on the way; every `location` is a London one (L48, 73, 91,
                104, 130, 143, 163, 186); and the four cuisines named are
                Bintang/Ramo/Belly/Bunso "Filipino" (L45, 101, 160, 183),
                Guanabana/Hoodwood "Caribbean" (L70, 127), Ramo "Ramen"
                (L101) and Mamasons "Ice Cream Parlour" (L88). No founding
                year, no covers count, no award — the Michelin line is
                already carried five times higher up this page. */}
            <p className={styles.support}>
              Seven places across London. Filipino, Caribbean, ramen, ice cream
              — with an eighth on the way.
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
 * The one action on the page's closing frame — a pill that drifts toward the
 * pointer as it approaches and springs home when it leaves.
 *
 * The three-element nesting is load-bearing, not decoration:
 *
 *   .magnetHost   NEVER transformed — its border box is the button's REST
 *                 rect, which is what the offset math has to measure from.
 *                 Measuring the moving element instead makes the magnet its
 *                 own input and it walks away from the pointer.
 *   .magnet       carries the spring transform.
 *   .action       the <Link>. Rides inside the transform, so the hit area and
 *                 the focus ring travel with the glyphs and the button is
 *                 pressable at rest and at full pull alike.
 */
function MagneticCta() {
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLSpanElement>(null);
  // false until an effect proves otherwise: SSR has no matchMedia, and a
  // static button is the correct thing to render for touch and for reduced
  // motion, so the safe default is also the fallback.
  const [magnetic, setMagnetic] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, MAGNET_SPRING);
  const y = useSpring(my, MAGNET_SPRING);

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    setMagnetic(true);

    /* ONE pass per animation frame, every read before every write.

       CustomCursor.tsx:86-102 records what the other shape of this costs: a
       handler that measured on every pointer event burned ~47% of frames over
       32ms while scrolling, because a trackpad emits pointermove at ~120Hz
       and Lenis's lerp of 0.032 turns one wheel notch into seconds of scroll
       events. So the listeners below do nothing but store two numbers and ask
       for a frame; the single getBoundingClientRect lives inside the frame,
       and even there it is skipped unless something has actually invalidated
       the cached rect. */
    const pointer = { x: 0, y: 0 };
    let rect: DOMRect | null = null;
    let stale = true;
    let raf = 0;
    // the last value written, so a pointer resting outside the radius stops
    // touching the MotionValues entirely instead of re-setting 0 at 120Hz
    let px = 0;
    let py = 0;

    const write = (tx: number, ty: number) => {
      // sub-tenth-pixel changes are below what the spring can render; skipping
      // them keeps a stationary pointer from waking the animation loop
      if (Math.abs(tx - px) < 0.1 && Math.abs(ty - py) < 0.1) return;
      px = tx;
      py = ty;
      mx.set(tx);
      my.set(ty);
    };

    const frame = () => {
      raf = 0;
      const host = hostRef.current;
      if (!host) return;

      // ---- reads ----
      if (stale || !rect) {
        rect = host.getBoundingClientRect();
        stale = false;
      }
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      const radius = (Math.hypot(rect.width, rect.height) / 2) * REACH;

      // ---- writes ----
      if (dist >= radius) {
        write(0, 0);
        return;
      }
      const falloff = (1 - dist / radius) ** 2;
      let tx = dx * PULL * falloff;
      let ty = dy * PULL * falloff;
      const cap = rect.height / 2;
      const mag = Math.hypot(tx, ty);
      if (mag > cap) {
        tx = (tx / mag) * cap;
        ty = (ty / mag) * cap;
      }
      write(tx, ty);
    };

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      queue();
    };
    // The pointer can leave the window mid-pull; without this the button
    // would hold that displacement until the cursor came back.
    const onLeave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
      queue();
    };
    // Scroll and resize only INVALIDATE the rect — a boolean write, no layout.
    // A frame is requested as well, but only while the button is actually
    // displaced: that is the one state where scrolling changes the answer, and
    // it bounds the per-frame measurement to the moments the reader is on the
    // pill rather than paying for it down the whole page.
    const onShift = () => {
      stale = true;
      if (px || py) queue();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onShift, { passive: true });
    window.addEventListener("resize", onShift);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onShift);
      window.removeEventListener("resize", onShift);
      if (raf) cancelAnimationFrame(raf);
      mx.set(0);
      my.set(0);
    };
  }, [reduce, mx, my]);

  return (
    <span ref={hostRef} className={styles.magnetHost}>
      {/* no style prop at all when the magnet is off, so the computed
          transform stays `none` rather than an identity matrix */}
      <motion.span
        className={styles.magnet}
        style={magnetic ? { x, y } : undefined}
      >
        <Link href="/restaurants" className={styles.action}>
          <span className={styles.actionLabel}>Choose a restaurant</span>
          {/* the same long arrow the Blog head's CTA carries — the site's
              grammar for "further in", as against the diagonal glyph that
              means "off to somebody else's site" */}
          <svg
            className={styles.actionArrow}
            viewBox="0 0 32 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H26" />
            <path d="M22 1 L26 5 L22 9" />
          </svg>
        </Link>
      </motion.span>
    </span>
  );
}
