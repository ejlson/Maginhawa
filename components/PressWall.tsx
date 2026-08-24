"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import styles from "./PressWall.module.css";
import { FEATURED_OUTLETS } from "@/lib/press";
import { asset } from "@/lib/media";
import { ARRIVAL_OFFSET, RAIL_AT } from "@/lib/drift";

/* ══════════ THE ENTRANCE IS BACK, IN A THIRD FORM — THE INK ══════════
   This section has now had an entrance three times, and the first two were
   cut at the user's instruction because they MOVED: a `whileInView` timer,
   then a 26px rise + fade scrubbed across the approach. The note that
   stood here for one pass — "there is no entrance" — argued that furniture
   shouldn't travel, and that argument still holds. What returned (option
   P1 on the "Quiet Arrivals" sheet, user-approved) travels nothing: each
   mark fades from absent to present ONCE, 400ms apiece on a 60ms stagger —
   a ~1.2s left-to-right ripple that echoes the manifesto's word-by-word
   inking two chapters up. Then the lane is exactly what it was before:
   drifting marks between two hairlines.

   ⚠️ THE OLD MOUNT-GATE WARNING APPLIES AGAIN, ANSWERED DIFFERENTLY. The
   marks once more animate FROM opacity 0, which is the state that can
   strand fourteen mastheads invisible if the trigger never fires. The old
   scrub guarded that with a mount gate around framer's SSR'd motion
   values; this version has no motion values in the DOM at all — the hidden
   state lives in the STYLESHEET, keyed off `:not([data-in])`, and the
   latch below flips one attribute. That is the journal's mechanism
   (Blog.tsx), adopted whole: same ARRIVAL_OFFSET approach, same RAIL_AT
   fold line — this band joins the page's single arrival line rather than
   inventing its own — same sessionStorage backing so a mid-page reload
   does not replay a performance the reader already sat through.

   A READER WHOSE JS NEVER RUNS SEES NO MASTHEADS. That is the same trade
   the journal's rail and Discover's title already make (see the ⚠️ over
   Blog's cascade constants): the parked state lives in CSS, and the
   content stays in the DOM for AT — every mark here keeps its role="img"
   and aria-label regardless of paint. Accepted for consistency, not
   overlooked. */

/* One tab, one performance — the journal's rule, and now this band's.
   ⚠️ A DIFFERENT KEY from the journal's "mgnhw:journal-played": the two
   chapters latch independently, and a reader who reloads between them has
   seen one performance but not the other. */
const PLAYED_KEY = "mgnhw:press-played";

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
  /* ── THE INK'S GATE — the journal's three-latch pattern, cut to one ──
     `inked` never comes back off (scrolling away and returning must not
     re-run a credential's roll call), and `instant` is the already-played
     third state: setting `inked` from storage alone would put the band in
     exactly the state that RUNS the ripple — the CSS keys off [data-in] —
     so it would replay on every reload instead of never. */
  const [inked, setInked] = useState(false);
  const [instant, setInstant] = useState(false);
  const bandRef = useRef<HTMLDivElement>(null);

  /* the band's own approach — its top edge travelling from the foot of the
     screen to the top of it, latched at RAIL_AT: the page's single arrival
     line (see the fold-line note over RAIL_AT in lib/drift.ts — "move one
     of these and move the other" now covers three gates, not two). */
  const { scrollYProgress: arriving } = useScroll({
    target: bandRef,
    offset: ARRIVAL_OFFSET,
  });
  const settle = useCallback((v: number) => {
    if (v >= RAIL_AT) setInked(true);
  }, []);
  useMotionValueEvent(arriving, "change", settle);
  useEffect(() => settle(arriving.get()), [arriving, settle]);

  /* ⚠️ READ IN AN EFFECT, NOT IN useState's INITIALISER — this component
     server-renders and sessionStorage does not exist there; see the same
     note in Blog.tsx, whose wording this defers to. */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PLAYED_KEY)) {
        setInstant(true);
        setInked(true);
      }
    } catch {
      /* private mode, or storage disabled by policy — the ripple replays,
         which is a preference miss, not a failure. */
    }
  }, []);

  /* and the write, once the marks have actually inked */
  useEffect(() => {
    if (!inked) return;
    try {
      sessionStorage.setItem(PLAYED_KEY, "1");
    } catch {
      /* see above */
    }
  }, [inked]);

  return (
    <section
      className={styles.section}
      aria-labelledby="featured-in"
      data-nav-theme="light"
      data-in={inked ? "on" : undefined}
      data-instant={instant ? "on" : undefined}
    >
      {/* the section's name, for the outline and for `aria-labelledby`.
          Visually hidden — see the note above. */}
      <h2 className={styles.srOnly} id="featured-in">
        As featured in
      </h2>

      {/* the band's two hairlines — see .band in the stylesheet for why
          they sit on --grid-gutter while the lane inside bleeds past them */}
      <div className={styles.band} ref={bandRef}>
      <div className={styles.lane}>
        {/* The track holds the line TWICE and travels exactly -50%, so the
            wrap is seamless — at the end of the pass the second copy sits
            precisely where the first began. The reader is meant to see one
            continuous lane, so the second copy is aria-hidden: it is the
            same fourteen mastheads again, and a screen reader reading the
            list twice would be reporting an implementation detail. */}
        <ul className={styles.track}>
          {[0, 1].map((copy) =>
            MARKS.map((outlet, i) => (
              <li
                key={`${copy}-${outlet.name}`}
                className={styles.logoSeat}
                data-mark={outlet.name === "Michelin Guide" ? "michelin" : undefined}
                style={
                  {
                    "--s": outlet.scale ?? 1,
                    /* the mark's seat in the ink's ripple — the ORDER index,
                       REPEATED PER COPY rather than counted across the
                       doubled track (0…13, 0…13, not 0…27). The ripple is
                       defined in lane space, and the lane has usually
                       drifted a few marks left by the time the gate fires:
                       per-copy indices mean whatever the window shows inks
                       within 840ms of the latch, where a 0…27 count would
                       hold a late-arriving reader on a dead beat while
                       nothing visible had reached its turn. The cost is the
                       copy boundary — a window straddling it briefly holds
                       two soft ripples instead of one — and at 400ms fades
                       on 60ms offsets that corner reads as texture, not as
                       a mistake. */
                    "--i": i,
                    /* the mark's own shape — a masked span has no intrinsic
                       size, so the embedded PNG's measured w/h (lib/press.ts)
                       is what keeps the box from stretching the art:
                       preserveAspectRatio="none" on the inner <image> means
                       a wrong box distorts SILENTLY. */
                    "--ar": `${outlet.w ?? 1} / ${outlet.h ?? 1}`,
                    "--press-mark": `url(${asset(outlet.logo)})`,
                  } as React.CSSProperties
                }
                aria-hidden={copy === 1}
              >
                {/* ═══ ONE INK, BY CSS MASK — with ONE exemption ═══
                    The fourteen sources are rasters in fourteen house
                    palettes (each .svg wraps a single alpha-bearing PNG —
                    no fills, no currentColor, so tinting the FILE is
                    impossible and no filter chain maps fourteen different
                    baked-in colours to one ink). The mechanism is the one
                    the venue cards already use: a span whose
                    background-color is the ink, masked by the mark's own
                    alpha (see .logo in the stylesheet).

                    MICHELIN KEEPS ITS RED, at the user's instruction — the
                    flower is the credential — so that one mark stays on the
                    raw <img> path below. Two branches in one map is honest
                    and cheaper than a filter chain.

                    The mask/img sources still route through asset(), which
                    returns .svg paths untouched — origin-served, never
                    /_next/image, static-export safe. */}
                {outlet.name === "Michelin Guide" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    className={styles.logo}
                    src={asset(outlet.logo)}
                    alt={copy === 0 ? outlet.name : ""}
                    draggable={false}
                    /* ⚠️ DEPRIORITISED, NOT LAZY, AND THE DIFFERENCE
                       MATTERS HERE. These marks are Figma exports and not
                       tiny — thesundaytimes.svg is 72,831 bytes (an older
                       note here claimed 869KB; that figure predates the
                       re-export) — and this band sits thousands of pixels
                       down the page.
                       `loading="lazy"` is the obvious answer and it is the
                       wrong one for a MARQUEE: the second copy sits a few
                       thousand pixels right of the rail, outside every
                       viewport check, so it would defer and then pop into a
                       lane that is supposed to be seamless. `fetchPriority`
                       changes only the ORDER — the mark still loads
                       eagerly, behind the things on screen. (The thirteen
                       masked marks load via CSS mask-image, which the
                       browser fetches lazily by its own rules; they share
                       the same origin path.) */
                    fetchPriority="low"
                    decoding="async"
                  />
                ) : (
                  <span
                    className={styles.logo}
                    role={copy === 0 ? "img" : undefined}
                    aria-label={copy === 0 ? outlet.name : undefined}
                    aria-hidden={copy === 1 || undefined}
                  />
                )}
              </li>
            )),
          )}
        </ul>
      </div>
      </div>
    </section>
  );
}
