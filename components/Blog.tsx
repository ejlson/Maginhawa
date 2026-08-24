"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import styles from "./Blog.module.css";
/* THE VENUE CARD'S RAMP, IMPORTED RATHER THAN COPIED. The lede's type is
   set ON the photograph and this is what makes it legible: two stacked
   layers over the plate's bottom edge — a 34px backdrop blur that hands
   back the picture's own colour, then a neutral scrim over it.

   ⚠️ THE ORDER IS LOAD-BEARING. `backdrop-filter` samples whatever is
   painted below it, so a scrim painted first would be blurred into the
   result and the ramp would darken itself recursively down the plate.
   `.rampBlur` must precede `.rampScrim` in the DOM — the banner in
   VenueCard.module.css has the full argument.

   ONLY `--vc-ramp-h` CROSSES THE FILE BOUNDARY, declared on `.frontPhoto`
   in Blog.module.css, because a class can be imported and a variable
   cannot. The crown's `--vc-wash-*` are NOT needed: the mark below is
   local and carries its own ground. */
import card from "./VenueCard.module.css";
import PillCta from "./PillCta";
import { BLOG, entryLinkProps, headline, type BlogEntry } from "@/lib/blog";
import ActionBand from "./ActionBand";
import PlateDate from "./PlateDate";
import { getRestaurant } from "@/lib/restaurants";
import { asset } from "@/lib/media";
import {
  ARRIVAL_IN,
  ARRIVAL_OFFSET,
  ARRIVAL_VH,
  ARRIVAL_SLOT,
  DRIFT_OFFSET,
  DRIFT_SLOT,
  HEAD_AT,
  PLATE_AT,
  RAIL_AT,
  DRIFT_VH,
  PARALLAX_OFFSET,
  PARALLAX_PCT,
  PARALLAX_SCALE,
} from "@/lib/drift";

/* ── THE FIRST ENTRY'S SEAT IN THE CASCADE ──
   One beat runs down the chapter, mark to last story, and every element's
   place in it is declared in Blog.module.css beside the rules that read
   it — except these, whose seats are `STRIP_BEAT + index` and so have to be
   computed. The cadence itself is --cascade-beat over there; this is only a
   position in it, carried as --i exactly the way Discover carries --tw-i.

   ⚠️ THE ENTRIES COUNT FROM THEIR OWN GATE NOW, AND THE NUMBER FELL 3 → 1.
   The history: one queue of 0-6 behind the head, then a count of 3 behind
   the featured plate, and now this. The plate's cascade and the rail's are
   two separate runs on two separate triggers — see the block over the
   three gates in Blog.module.css for the measurement that separated them —
   so a rail seated at 3 would spend 210ms of its own gate waiting for
   elements that are not in it. The only thing above the entries inside
   THIS cascade is the "Earlier Entries" label, which takes seat 0.

   IT WAS 7, THEN 3. Adding an element above the entries means moving this
   number too, not just adding a line in the stylesheet. */
/* WHERE THE CHAPTER REMEMBERS HAVING PERFORMED, and it is sessionStorage
   rather than a ref because the requirement is explicitly that a RELOAD
   cannot replay it: a ref dies with the page, and localStorage would mean
   the chapter never animated again on any later visit, which is a
   different promise from the one being made. One tab, one performance.

   ⚠️ THE KEY IS WRITTEN WHEN THE PICTURES OPEN, not when the head does.
   What the user asked to be unrepeatable is the images' sweep; a reader
   who turns back after seeing only the head has not seen that yet. */
const PLAYED_KEY = "mgnhw:journal-played";

const STRIP_BEAT = 1;
const seat = (i: number) => ({ "--i": i }) as CSSProperties;

/* THE HOME JOURNAL IS A CHOSEN FEW, not the newest twelve.

   It used to be `BLOG.slice(0, 12)` — whatever happened to sit at the top of
   the feed. These are picked, each with its own commissioned still, and
   the order is the order they are listed in. `/blog` is untouched and still
   shows the full feed; this is the shop window, not the archive.

   Looked up by slug rather than spliced by index so that adding an entry to
   lib/blog.ts cannot silently change what the home page shows, and a slug
   that stops existing drops out loudly (filter(Boolean)) instead of shifting
   every card along by one. */
const HOME_SLUGS = [
  "olive-best-new-restaurants",
  "the-sauce-cny",
  "forbes-valentines",
  "my-london-valentines",
  "observer-filipino-pastries",
  "ham-and-high-michelin",
  "msn-valentine-croissants",
  "time-out-michelin-january",
] as const;

/* ═══ WHICH STORY LEADS, AND WHAT FOLLOWS IT ═══
   THE NEWEST BY DATE LEADS, not the first slug in the list above. The
   curated order is an editorial ordering of a set; "the latest entry" is a
   fact about the data, and the two agree today (olive-…, 14 Feb 2026) only
   by coincidence. Sorting on the ISO `date` field — which exists precisely
   because `dateLabel` cannot be sorted — means adding a newer entry
   promotes it without anyone having to remember to reorder the list.

   ⚠️ THE LEDE NO LONGER APPEARS TWICE. It used to be repeated as the first
   row of the column beneath it, deliberately, because that column was
   headed "Latest" and a reader scanning it reported the newest story
   missing. The column is headed "Earlier Entries" now — /blog's own words —
   and under that heading the repeat is not just redundant, it is wrong.

   ⚠️ FIVE, AND THEY FILL THE MEASURE EXACTLY. At the user's instruction.
   The card's width is solved rather than clamped — (100% − 4 gaps) / 5 —
   so at a full-width window the five sit flush edge to edge and the rail
   has nowhere to scroll. Below about 1300px the same expression falls under
   the 178px floor, the row overflows, and the drag earns itself. So the
   gesture is real on most windows and inert on the widest, which is the
   honest trade for a row that was asked to be a row. */
/* ⚠️ COMPUTED FROM THE FEED PASSED IN, NOT AT MODULE SCOPE, which is where
   all three of these lived until our own posts joined the journal. The feed
   is no longer knowable when this module is evaluated: content/posts/*.mdx
   is read on the server at build time and arrives as a prop (see the note on
   the component below), so a chapter built from the imported BLOG could
   never feature a post we wrote — a slug added to HOME_SLUGS above would
   simply fall out at the `filter(Boolean)`, silently, exactly the failure
   that filter was chosen to make loud. */
function buildChapter(journal: BlogEntry[]) {
  const pool = HOME_SLUGS.map((s) =>
    journal.find((b) => b.slug === s),
  ).filter((b): b is BlogEntry => Boolean(b));

  const featured = [...pool].sort((a, b) => b.date.localeCompare(a.date))[0];

  return {
    featured,
    strip: pool.filter((p) => p.slug !== featured?.slug).slice(0, 5),
  };
}

/* THE VENUE'S MARK ON THE PHOTOGRAPH — whose story this is, told in their
   own lettering.

   THE DATA WAS ALREADY HERE. Every entry in lib/blog.ts carries a
   `restaurant` slug and every restaurant carries a `logo`.

   TWO SIZES, ONE OBJECT. Both are /blog's `.cardMark` — the same flex box,
   the same cream mask, the same radial wash under it — at two scales, and
   the wash is not decoration: a bare cream mark on the brightest
   photograph in the set measures ~1.16:1, i.e. it is not there. The mark
   sits top-left and the ramp is at the bottom, so the two never overlap and
   the mark cannot borrow the ramp's ground.

   ⚠️ THE TWO ARE NOT ONE CLAMP WITH A DIFFERENT CEILING. Both size
   themselves in `cqi`, against their own plate; /blog's coefficients are
   set for a ~330px card and would give a 127px-tall mark on this chapter's
   1416px lede. Blog.module.css carries a separate pair for each.

   `role="img"` + the venue's name, for the reason VenueCard states: the
   mark is a logotype a reader recognises, and the accessible name is the
   string a screen reader needs. An entry with no restaurant (or a slug
   with no mark on file) renders nothing rather than an empty corner. */
function VenueMark({ slug, small }: { slug?: string; small?: boolean }) {
  const venue = slug ? getRestaurant(slug) : undefined;
  if (!venue?.logo) return null;

  const url = {
    "--ov-logo-url": `url(${asset(venue.logo)})`,
  } as CSSProperties;

  return (
    <span
      className={small ? styles.entryMark : styles.frontMark}
      role="img"
      aria-label={venue.name}
    >
      <span
        className={small ? styles.entryMarkInk : styles.frontMarkInk}
        style={url}
      />
    </span>
  );
}

/* ═══ THE FRONT — the newest story, as one plate ═══
   A photograph running the full measure, the venue's mark bare in the
   top-left, the photo-derived ramp seated in the bottom edge, and the type
   ON the ramp: "Latest · date · outlet", the headline at display size, and
   the house pill.

   ⚠️ THE TYPE IS ON THE PICTURE, AT THE USER'S INSTRUCTION, and it is worth
   recording that this reverses a pass that moved it off. The argument for
   moving it off was that whitespace around a headline seated inside a crop
   is not whitespace, it is more picture. That is still true — and it is
   answered here by the chapter being SHORTER rather than airier: the type
   costs no height of its own, the standfirst is gone with the second
   column, and what was a 200px block of cream under the plate is now zero.

   NO STANDFIRST. It went with the two-column type block and it should have:
   at this width the headline is set at up to 48px on a ramp about 250px
   deep, and a paragraph under it would be a third voice competing with the
   picture it is standing on. /blog's featured lede keeps its excerpt
   because it sets its type on the cream, beside the photograph rather than
   inside it. Different ground, different budget.

   24:9 AND FULL-BLEED TO THE PAGE MARGIN, which is the seam argument: the
   film in <AboutSplit> directly above runs edge to edge on the same 12px
   inset, so the chapter opens by rhyming with the band it follows.

   THE WHOLE PLATE IS THE LINK, so nothing inside it is separately
   focusable and the pill is presentational — see below. */
function Front({
  post,
  pan,
  hostRef,
}: {
  post: BlogEntry;
  pan?: MotionValue<string>;
  /** the plate measures its OWN approach — see PLATE_AT in lib/drift.ts */
  hostRef?: React.Ref<HTMLAnchorElement>;
}) {
  return (
    <a
      ref={hostRef}
      className={styles.front}
      href={post.url}
      {...entryLinkProps(post)}
      /* ⚠️ THIS IS WHAT CLOSES THE PILL. `.cta:hover` never fires for a
         span the pointer only passes near, so the CARD's hover drives the
         merge from one level out — see the rules at the foot of
         PillCta.module.css, and /blog's featured lede, which carries the
         same attribute for the same reason. */
      data-cta-hover
    >
      <div className={styles.frontPhoto}>
        {/* the pan is its own box: `.frontPhotoImg` already carries the
            entrance's drift keyframe, and one element cannot hold two
            independent transforms */}
        <motion.div
          className={styles.frontPan}
          style={pan ? { y: pan, scale: PARALLAX_SCALE } : undefined}
        >
        <Image
          className={styles.frontPhotoImg}
          src={post.image}
          // DECORATIVE — the headline on the ramp names the story in real
          // text and the mark above announces the venue. A third
          // description of the same thing is noise on a screen reader.
          alt=""
          fill
          sizes="calc(100vw - 24px)"
          priority={false}
        />
        </motion.div>

        {/* the ramp — blur first, then scrim; see the import note */}
        <div className={card.rampBlur} aria-hidden />
        <div className={card.rampScrim} aria-hidden />

        <VenueMark slug={post.restaurant} />

        <div className={styles.frontBlock}>
          {/* THE TAG CARRIES THE CATEGORY PILL'S OLD JOB. An outlined
              "Feature" chip used to stand here; three facts on one line —
              in the order /blog states them — say more and take less. The
              outlet is the part a reader of a press feed actually wants. */}
          <span className={styles.frontTagMask}>
            <span className={styles.frontTag}>
              Latest · {post.dateLabel} · {post.source}
            </span>
          </span>

          <span className={styles.frontTitleMask}>
            <h3 className={styles.frontTitle}>{post.title}</h3>
          </span>

          {/* THE HOUSE ACTION — the same control as the archive pill in the
              head above, About's "Read our story" and the closing frame's
              "Choose a restaurant" (components/PillCta.tsx). It renders
              PRESENTATIONALLY because this whole plate is an anchor and an
              <a> inside an <a> is invalid — the browser closes the outer
              one and the plate silently stops being one link. /blog's
              featured lede makes exactly the same trade.

              `tone="cream"` because it is standing on the ramp: the default
              maroon fill is the darkest thing in the palette and the ramp
              is already dark, so the two would read as one shape. Cream
              fill, maroon ink — the same inversion the type above it
              already makes. */}
          <PillCta presentational tone="cream" className={styles.frontCta}>
            Read the story
          </PillCta>
        </div>
      </div>
    </a>
  );
}

/* ═══ AN EARLIER ENTRY — /blog's grid card, compact ═══
   A 4:5 plate with the venue's mark on it, then the type beneath on the
   cream: headline, a hairline, and the outlet leading the date.

   WHAT IT DROPS FROM /blog's CARD, and why. The standfirst and the "Read
   article →" button are gone: these cards are ~230px wide against /blog's
   ~330, and a two-line excerpt plus a button is another 90px of type on a
   card whose whole job is to be glanced at on the way past. The structure
   that survives — plate, headline, rule, outlet · date, down to the 3px dot
   — is /blog's, in /blog's order, and the two still read as the same card.

   THE OUTLET LEADS, the date follows — /blog's note is the reason and it
   transfers unchanged: "Forbes" earns attention; "11 Feb 2026" does not.

   THE WHOLE CARD IS THE LINK. `draggable={false}` on the picture is what
   stops a native image-drag hijacking the strip's gesture. */
function Entry({ post, beat }: { post: BlogEntry; beat: number }) {
  return (
    <a
      className={styles.entry}
      href={post.url}
      {...entryLinkProps(post)}
      draggable={false}
      /* the seat is declared once on the card and INHERITED by everything
         inside it, so the plate's sweep and the type's settle cannot drift
         apart — they are two moves on one beat, not two beats. */
      style={seat(beat)}
    >
      <div className={styles.entryMedia}>
        <Image
          className={styles.entryPhoto}
          src={post.image}
          alt=""
          fill
          sizes="(max-width: 640px) 62vw, (max-width: 980px) 34vw, 20vw"
          draggable={false}
        />
        <VenueMark slug={post.restaurant} small />
        {/* THE DATE, ON THE PICTURE — shared with /blog's archive card, which
            makes the same move for the same reason. See PlateDate.tsx. */}
        <PlateDate>{post.dateLabel}</PlateDate>
      </div>

      {/* ⚠️ THE MASK WRAPS THE WHOLE BODY, NOT THE HEADLINE. A clip has to
          be a wrapper — one on the type itself would travel with the type
          it is meant to be hiding — and the question is only what it wraps.
          Masking the headline alone would leave the rule and the meta
          appearing from nothing while the headline descended past them.

          SO THE BODY SWEEPS AND SETTLES rather than descending, which
          follows the rule the stylesheet states over blogSettle: type
          descends when its travel is bounded by a line or two, and sweeps
          when its height is a function of the measure. */}
      <span className={styles.entryBodyMask}>
        <span className={styles.entryBody}>
          <h3 className={styles.entryTitle}>{headline(post)}</h3>
          {/* the two rules are real elements, not ::before/::after on the
              body, because each has to sit BETWEEN two things */}
          <span className={styles.entryRule} aria-hidden />

          {/* THE ACTION, BETWEEN THE RULES. The meta line that stood here
              is gone: its outlet leads the headline now and its date is on
              the picture, which left the band holding nothing.

              aria-hidden because the card's accessible name is already the
              headline — announcing "Read More" after it would offer the
              same link twice — and it is a <span> because the whole card is
              the anchor and nesting anchors is invalid. */}
          {/* THE ACTION, BETWEEN THE RULES. The meta line that stood here
              is gone: its outlet leads the headline now and its date is on
              the picture, which left the band holding nothing.

              ⚠️ IT READS --entry-gap AND --entry-band OFF .entryBody. The
              band's own margin is computed from them — see the contract in
              ActionBand.tsx — so those two declarations are load-bearing
              for a stylesheet this file does not import. */}
          <ActionBand />

          <span className={styles.entryRuleFoot} aria-hidden />
        </span>
      </span>
    </a>
  );
}

/**
 * Blog chapter on the cream page — a hairline opening the chapter, the
 * head lockup (the group's mark set into a standing label, the display
 * sentence under it, the archive pill hung off its bottom edge, then a
 * full-width rule), and beneath it the newest story as one full-measure
 * 24:9 plate with its type on the ramp, then /blog's own "Earlier Entries"
 * divider, then a DRAGGABLE STRIP of the remaining stories as compact
 * /blog cards.
 *
 * ⚠️ THE STRIP'S PHYSICS ARE RECOVERED FROM GIT, NOT REWRITTEN — they were
 * deleted in 28be922 when this chapter became a lede card and a rail, and
 * the arm-then-claim capture contract below is exactly the kind of thing
 * that gets re-derived wrong. What did NOT come back is the card counter
 * and the prev/next discs: the strip has no chrome now, and a counter that
 * reads "03 / 07" is a second control for a gesture that already shows the
 * reader where it is.
 */
export default function Blog({ journal = BLOG }: { journal?: BlogEntry[] }) {
  /* ── THE FEED ARRIVES FROM app/page.tsx, THROUGH <Experience> ──
     This is a client component; our own posts are read off the filesystem,
     which only a server component can do. The default keeps the chapter
     rendering on press alone if a route ever forgets to pass it — see the
     architecture note at the top of lib/posts.ts. */
  const { featured: FEATURED, strip: STRIP } = useMemo(
    () => buildChapter(journal),
    [journal],
  );

  /* ══════════ WHAT STARTS THE CASCADE ══════════
     ⚠️ THE ARRIVAL'S OWN PROGRESS, NOT AN INTERSECTION OBSERVER, and the
     change is a fix for a defect that made the lede's sweep invisible.

     It was `useInView` on the head with a 12% bottom margin. Two things
     went wrong once the head gained a scroll-linked arrival:

       · AN OBSERVER SEES THE TRANSFORMED BOX. The column sits 16vh above
         its layout position for most of the approach, so it crossed the
         threshold ~144px of scroll EARLY — and the negative margin pulled
         it 12vh earlier again.
       · SO THE CHAPTER INTRODUCED ITSELF WHILE IT WAS STILL INVISIBLE.
         Measured: the cascade fired around 0.14 of the approach and the
         column does not begin inking in until 0.58. The picture's 1.15s
         sweep and 1.7s drift had both finished before the reader could see
         anything, which is why the gesture read as absent rather than as
         fast.

     Latching off the arrival ties the two to one clock, so the sweep
     always happens in front of someone. SWEEP_AT sits just past
     ARRIVAL_SLOT's end: the head lands first and the plate opens under it,
     at the user's instruction — see the note on that constant for why the
     crossing it describes cannot be measured literally.

     ⚠️ IT NEVER COMES BACK OFF, AND THAT IS THE THIRD TIME THIS HAS BEEN
     DECIDED. It latched, then it was made to REVERSE so the pictures would
     sweep on every approach the way AboutSplit's film does, and it is a
     latch again at the user's instruction: once the images have opened,
     scrolling back up and returning must not reopen them. `undefined`
     rather than "off" keeps the parked rules writable as :not([data-in]).

     ⚠️ AND A RELOAD MUST NOT REPLAY IT EITHER, which a latch alone does not
     give you: a refresh anywhere below this chapter restores the scroll
     position, the mount effect finds the approach already complete, and the
     whole cascade runs from nothing while the reader is looking straight at
     it. So the latch is backed by PLAYED_KEY above, and the already-played
     path lands in `instant` below rather than in the animation. */
  /* TWO LATCHES, NOT ONE — see HEAD_AT in lib/drift.ts for the fault that
     split them. `seen` runs the head's cascade as the column inks in;
     `plated` opens the picture and the row beneath it a third of the
     approach later, once the archive pill has landed. */
  const [seen, setSeen] = useState(false);
  const [plated, setPlated] = useState(false);
  /* ⚠️ AND A THIRD LATCH FOR THE RAIL, measured on the RAIL'S OWN approach
     rather than the section's. The two are 787px apart in the document, so
     one progress cannot serve both: latching the rail off the section's
     approach opened it while it was still sitting on the fold, and its last
     cards finished sweeping 369px after it had left the top of the screen.
     The arithmetic is in Blog.module.css over the three-gate block. */
  const [railed, setRailed] = useState(false);
  /* ⚠️ THE ALREADY-PLAYED PATH IS A THIRD STATE, NOT `plated` ON ITS OWN.
     Setting the two latches from storage would put the chapter in exactly
     the state that RUNS the cascade — the CSS keys off [data-plate] — so it
     would replay on every reload instead of never. `instant` is what tells
     the stylesheet to skip to the end. */
  const [instant, setInstant] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  /* ── THE PLATE'S OWN APPROACH ──
     ⚠️ IT USED TO BE SWEEP_AT ON THE SECTION'S, AND THAT BROKE WHEN THE
     SEAM ABOVE MOVED. `data-plate` latched at 0.88 of the SECTION's
     approach — a fixed fraction, which is only ever the right place for the
     PLATE while the distance from the section's top edge to the plate stays
     put. It did not: the chapter's top padding was cut by 224px in a
     separate pass, and the gate that had been opening the picture at 45% of
     the way down the screen started opening it at 20% — the photograph was
     already past the middle of the window before it began to sweep.
     scripts/probe-blog-blocks.mjs prints exactly that and is what caught it.

     Measured on the plate itself, the gate cannot drift again whatever the
     seam does; it is the same correction RAIL_AT already applies below, and
     the order the old note cared about survives by geometry — the voice
     column is above the plate, so the reader reaches it first at any
     spacing. */
  const frontRef = useRef<HTMLAnchorElement>(null);
  const { scrollYProgress: plating } = useScroll({
    target: frontRef,
    offset: ARRIVAL_OFFSET,
  });
  const plateSettle = useCallback((v: number) => {
    if (v >= PLATE_AT) setPlated(true);
  }, []);
  useMotionValueEvent(plating, "change", plateSettle);
  useEffect(() => plateSettle(plating.get()), [plating, plateSettle]);

  /* ⚠️ GATED ON MOUNT, for the reason PressWall.tsx spells out: these
     columns animate FROM a transparent, offset state, framer server-renders
     a motion value at its progress-0 value, and a scrub that failed to
     attach would leave the chapter's whole voice invisible with no error to
     notice. Holding the styles off until after mount makes the resting
     state the visible one. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── THE ARRIVAL, then the drift ──
     Two ranges on one column, and they hand over cleanly because the first
     ENDS exactly where the second BEGINS: the approach closes when the
     section's top reaches the top of the screen, which is the same instant
     the passage opens. The column descends into its seat, and then keeps
     lagging the page by DRIFT_VH for the rest of the chapter. Nothing
     stops, nothing restarts.

     THE ARRIVAL IS AboutSplit's HEADING GESTURE, at the user's instruction
     that the two read the same — blurred and transparent and sitting high,
     then sharp and opaque and descending. See lib/drift.ts for why the lift
     is 16vh here and 32vh there. */
  const { scrollYProgress: arriving } = useScroll({
    target: sectionRef,
    offset: ARRIVAL_OFFSET,
  });
  /* ⚠️ ARRIVAL_SLOT, NOT [0, 1]. The approach range this rides and
     AboutSplit's drift range are the SAME stretch of scroll — that chapter
     is one screen tall, so its bottom is this section's top — which meant
     the two gestures ran on top of each other. Confining the arrival to the
     last 42% lets the reading column above finish settling first, at the
     user's instruction, and the small overlap with DRIFT_SLOT is what keeps
     the hand-off from reading as a stall. */
  /* ⚠️ GATES, NOT LATCHES, AND THAT IS THE FIX FOR "IT IS NOT THE SAME
     ANIMATION AS THE ABOUT PICTURE". Both of these used to be one-way —
     `setSeen(true)`, never false — so the chapter performed once per page
     load and was simply present ever after. AboutSplit's film answers to a
     STATE evaluated in both directions, so it sweeps again every time it is
     approached; matching its keyframes was never going to close the gap
     while this stayed a latch. See GATE_SLACK in lib/drift.ts for the
     measurements and for why the dead band is not optional.

     UPDATER FORM, NOT A COMPARISON AGAINST THE RENDERED VALUE: the handler
     closes over one render's `seen`, and a gate has to see the current
     one. */
  const settle = useCallback((v: number) => {
    if (v >= HEAD_AT) setSeen(true);
  }, []);
  useMotionValueEvent(arriving, "change", settle);
  /* the deep-link case: the section can already be in view on first paint,
     where no `change` will ever fire because nothing has changed */
  useEffect(() => settle(arriving.get()), [arriving, settle]);


  /* ⚠️ READ IN AN EFFECT, NOT IN useState's INITIALISER, because this
     component server-renders: `sessionStorage` does not exist there, and an
     initialiser that read it would either throw on the server or hand the
     client a first paint that disagrees with the HTML it was sent. Running
     it after mount costs one frame and hydrates cleanly. */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PLAYED_KEY)) {
        setInstant(true);
        setSeen(true);
        setPlated(true);
        setRailed(true);
      }
    } catch {
      /* private mode, or storage disabled by policy. The chapter animates,
         which is the state it shipped in for years — this is a preference,
         not a correctness requirement, and it must not take the section
         down with it. */
    }
  }, []);

  /* and the write, once the pictures have actually opened */
  useEffect(() => {
    if (!plated) return;
    try {
      sessionStorage.setItem(PLAYED_KEY, "1");
    } catch {
      /* see above */
    }
  }, [plated]);

  const arriveY = useTransform(arriving, ARRIVAL_SLOT, [-ARRIVAL_VH, 0]);
  const introOpacity = useTransform(arriving, ARRIVAL_IN, [0, 1]);
  /* ⚠️ NO BLUR ON THE ARRIVAL ANY MORE. An `introBlur` ran here —
     blur(8px) → blur(0) across ARRIVAL_IN — and it is deleted rather than
     zeroed, because `filter: blur(0px)` is not `none`: it still installs a
     filter, a containing block and a composited layer for nothing. The
     editorial argument is in the motion crit (Finding 02): the fade's last
     third runs while the column is being READ, and type that is legible but
     defocused mid-read looks broken, not atmospheric. Blur is spent ONCE on
     this page now — the Passage → Reservations focus pull — and the descend
     + ink here carry the arrival on their own. */

  const { scrollYProgress: passing } = useScroll({
    target: sectionRef,
    offset: DRIFT_OFFSET,
  });
  const driftAway = useTransform(passing, DRIFT_SLOT, [0, DRIFT_VH]);

  /* the two terms, summed. One element, one transform, one projection node
     — the alternative is two nested motion divs for what is arithmetically
     one number. */
  const introY = useTransform(
    [arriveY, driftAway],
    ([arrive, drift]: number[]) => `${arrive + drift}vh`,
  );
  /* the lede's own pan — the same gesture and the same budget as
     AboutSplit's film; see lib/drift.ts */
  const { scrollYProgress: onScreen } = useScroll({
    target: sectionRef,
    offset: PARALLAX_OFFSET,
  });
  const panY = useTransform(
    onScreen,
    [0, 1],
    [`${-PARALLAX_PCT}%`, `${PARALLAX_PCT}%`],
  );

  const drifting = mounted && !reduce;

  /* ═══════════ THE STRIP'S GESTURE ═══════════
     Native scroll and swipe do the work on touch; this adds MOUSE
     drag-to-scroll on top, and it is one frame-synced physics loop rather
     than a write per pointer event — an eased FOLLOW while the pointer is
     held, then a velocity COAST with friction and boundary damping on
     release. Writing scrollLeft once per frame is what makes it glide
     instead of judder.

     All the per-frame state lives in refs. `dragging` is the one piece of
     React state because it drives an attribute (the grab cursor, and
     lifting scroll-snap for the duration of the gesture) — everything else
     would re-render sixty times a second for nothing. */
  const stripRef = useRef<HTMLDivElement>(null);
  /* ── THE RAIL'S OWN APPROACH ──
     Same shape as the section's: the strip's top edge travelling from the
     foot of the screen to the top of it. RAIL_AT is a position in THAT, so
     the row opens when the row arrives, at any window height, with no
     document coordinate written down anywhere. */
  const { scrollYProgress: railing } = useScroll({
    target: stripRef,
    offset: ARRIVAL_OFFSET,
  });
  const railSettle = useCallback((v: number) => {
    if (v >= RAIL_AT) setRailed(true);
  }, []);
  useMotionValueEvent(railing, "change", railSettle);
  useEffect(() => railSettle(railing.get()), [railing, railSettle]);
  const [dragging, setDragging] = useState(false);

  const draggingRef = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const travel = useRef(0);
  const suppressClick = useRef(false);
  const pos = useRef(0); // eased scroll position (float)
  const targetPos = useRef(0); // where the held drag wants it
  const vel = useRef(0); // px/frame at release
  const lastX = useRef(0);
  const lastT = useRef(0);
  const rafRef = useRef(0);
  const activeRef = useRef(false);

  // stop the physics loop on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const runLoop = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    const frame = () => {
      const strip = stripRef.current;
      if (!strip) {
        activeRef.current = false;
        return;
      }
      const max = Math.max(0, strip.scrollWidth - strip.clientWidth);

      if (draggingRef.current) {
        // eased follow — responsive, but glides instead of jittering
        pos.current += (targetPos.current - pos.current) * 0.3;
        strip.scrollLeft = pos.current;
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // released → a long, smooth inertial coast; gentle friction eases the
      // velocity toward zero so it slows continuously and never yanks to a
      // stop. It settles only once the drift is imperceptible.
      pos.current += vel.current;
      vel.current *= 0.95;
      // soft boundaries — ease back in rather than hitting a wall
      if (pos.current < 0) {
        pos.current += (0 - pos.current) * 0.12;
        vel.current *= 0.4;
      } else if (pos.current > max) {
        pos.current += (max - pos.current) * 0.12;
        vel.current *= 0.4;
      }
      strip.scrollLeft = pos.current;
      // asymptotic stop — end only when the motion is sub-pixel per frame
      if (
        Math.abs(vel.current) < 0.08 &&
        pos.current > -0.5 &&
        pos.current < max + 0.5
      ) {
        activeRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const strip = stripRef.current;
    if (!strip) return;
    cancelAnimationFrame(rafRef.current); // interrupt any coast, then grab
    activeRef.current = false;
    pos.current = strip.scrollLeft;
    targetPos.current = strip.scrollLeft;
    startX.current = e.clientX;
    startScroll.current = strip.scrollLeft;
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
    vel.current = 0;
    travel.current = 0;
    /* CLEAR THE SUPPRESSION LATCH HERE, at the start of the gesture that
       could earn it — not only when a click arrives to consume it.

       onPointerEnd raises `suppressClick` after a real drag so the card the
       pointer happened to stop over does not open, and onClickCapture
       lowers it again when it eats that click. But a drag does not reliably
       PRODUCE a click: the strip takes pointer capture, so the release can
       land with no click synthesised on the anchor at all. When that
       happened the flag stayed raised, and the next honest click on a card
       — a whole separate gesture — was the one that got eaten. The symptom
       was that the blog links worked until you dragged the strip once, and
       never again.

       Resetting it on pointerdown bounds the flag's life to exactly one
       gesture, which is all it was ever meant to cover. */
    suppressClick.current = false;
    draggingRef.current = true;
    /* NO CAPTURE HERE — this is why the cards were dead links.
       setPointerCapture retargets the whole gesture at the strip, and a
       `click` is dispatched to the capture target rather than to the
       element under the pointer. Taking it on pointerdown meant EVERY press
       was captured, including a plain click on a card, so the click never
       reached the <a> and the browser never followed the href. Capture is
       claimed in onPointerMove instead, once the travel proves the gesture
       is a drag — the same arm-then-claim contract the restaurants wheel
       runs (see the drag block in RestaurantsShowcase.tsx). */
    setDragging(true);
    runLoop();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const strip = stripRef.current;
    if (!strip) return;
    const dx = e.clientX - startX.current;
    travel.current = Math.max(travel.current, Math.abs(dx));
    /* CLAIM THE POINTER ONLY ONCE THIS IS A DRAG. Past the same 6px that
       decides suppression, the gesture is no longer a click and capture is
       safe — it keeps tracking if the pointer leaves the strip. Below it
       the pointer is left alone, so a plain press still produces a real
       `click` on the <a> and the link opens. */
    if (travel.current > 6 && !strip.hasPointerCapture(e.pointerId)) {
      strip.setPointerCapture(e.pointerId);
    }
    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    let t = startScroll.current - dx;
    // rubber-band past the ends (damping, not a wall)
    if (t < 0) t *= 0.4;
    else if (t > max) t = max + (t - max) * 0.4;
    targetPos.current = t;
    // sample the fling velocity (px/frame; scroll moves opposite the drag)
    const dt = e.timeStamp - lastT.current;
    if (dt > 0) {
      const v = (-(e.clientX - lastX.current) / dt) * 16;
      vel.current = Math.max(-90, Math.min(90, v));
    }
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const strip = stripRef.current;
    if (strip?.hasPointerCapture(e.pointerId)) {
      strip.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    // a real drag must not fire the card link it happened to end over —
    // flag the next click for suppression (6px separates wobble from intent)
    if (travel.current > 6) suppressClick.current = true;
    // hand off to the coast (the loop is already running from pointerdown)
    runLoop();
  };

  /* ══════════ HORIZONTAL WHEEL, AND THE SCROLL BUG IT REPLACES ══════════
     ⚠️ THIS RAIL USED TO CARRY `data-lenis-prevent` AND THAT WAS THE BUG.
     That attribute makes Lenis skip the wheel event entirely — no
     preventDefault, no target update — so a VERTICAL scroll with the
     pointer over the rail fell through to the browser's native scroll while
     Lenis's own target stayed where it was. The page moved, Lenis did not
     agree, and the next event over any other element yanked it back. The
     symptom is a page that jumps or refuses to move whenever the cursor
     happens to be over the journal's cards.

     The attribute is right for a VERTICAL inner scroller — RestaurantsShowcase
     has two — because there Lenis and the inner box genuinely compete for
     the same axis. This rail only scrolls sideways, so there is nothing to
     compete over: vertical wheel belongs to the page and Lenis should keep
     owning it, smoothing and all.

     So the attribute is gone and this handler takes the other half: when
     the gesture is more horizontal than vertical it is meant for the rail,
     and we move the rail. Anything else is left alone and reaches Lenis
     untouched. `pos` is resynced because the physics loop in this file
     writes scrollLeft from its own float — leave it stale and the next
     drag snaps back to wherever the last one ended. */
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const strip = stripRef.current;
    if (!strip) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (strip.scrollWidth - strip.clientWidth <= 0) return;
    cancelAnimationFrame(rafRef.current);
    activeRef.current = false;
    vel.current = 0;
    strip.scrollLeft += e.deltaX;
    pos.current = strip.scrollLeft;
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      /* everything inside this chapter that hides itself for an entrance is
         restored by the <noscript> block in app/layout.tsx — see the note on
         the attribute in components/Reveal.tsx */
      data-entrance="scope"
      id="blog"
      data-nav-theme="light"
      /* THE ONE SWITCH. Everything the cascade does hangs off this
         attribute, and it never comes back off — the latch above only
         ever sets, so a reader scrolling back up does not replay the
         chapter.
         `undefined` rather than "off" so the parked rules can be written
         as :not([data-in]) and the released state needs no selector. */
      data-in={seen ? "on" : undefined}
      /* the picture and the archive row, one gesture behind the head */
      data-plate={plated ? "on" : undefined}
      data-rail={railed ? "on" : undefined}
      /* "this chapter has already performed in this tab" — the stylesheet
         parks every entrance at its finished state off this. It is written
         alongside the two latches rather than instead of them so that the
         resting rules keyed to [data-in] / [data-plate] still apply. */
      data-instant={instant ? "on" : undefined}
    >
      {/* ── ONE WRAPPER, AND IT IS LOAD-BEARING ──
          `.section` is a flex column whose `gap` sets the distance to its
          first child. Everything the chapter has now lives inside this box
          so that one gap is spent once and every distance below is owned
          here — see the ladder on `.body` in Blog.module.css. */}
      <div className={styles.body}>
        {/* ═══ THE ROW — the chapter's voice on the left, the newest story
            on the right, and the voice STAYS while the story scrolls past.

            ⚠️ THE EYEBROW IS INSIDE THE LEFT COLUMN NOW, at the user's
            instruction, and the chapter's opening hairline is gone with it.
            It used to be a full-width lockup across the top — mark, word,
            display sentence, pill, rule — with a second hairline drawn 18px
            above it by `.section::before`. Both rules are deleted: the
            eyebrow no longer spans anything that needs closing, and a
            chapter that opens on a rule and closes its head with another
            was spending two hairlines to introduce one sentence. What is
            left is the archive's own rule, which is the only one in the
            chapter that separates two different kinds of thing. ═══ */}
        <div className={styles.top}>
          <motion.div
            className={styles.intro}
            style={
              drifting
                ? { y: introY, opacity: introOpacity }
                : undefined
            }
          >
            {/* THE MARK IS DECORATIVE, hence alt="". 1024×1024 is the file's
                real size — maginhawa.png is a SQUARE mark, not a horizontal
                lockup; see the same note in Discover.tsx. */}
            <h2 className={styles.chapterLabel}>
              {/* `sizes` — see the fuller note in Discover.tsx. Without it
                  the srcset is the declared 1024/2048 and the browser takes
                  2048 for a mark `.labelMark` sizes at 2.6em. */}
              <Image
                className={styles.labelMark}
                src="/logo/maginhawa.png"
                alt=""
                width={1024}
                height={1024}
                sizes="48px"
                aria-hidden
              />
              {/* the word is wrapped because it has to be masked separately
                  from the mark beside it: the lockup's own box is as tall as
                  the 2.6em mark, so a clip on <h2> would be nowhere near the
                  word's line box and the descent would show above it. */}
              <span className={styles.labelWordMask}>
                <span className={styles.labelWord}>Blog</span>
              </span>
            </h2>

            {/* ⚠️ THIS ONE INKS IN PLACE — it neither sweeps nor descends.
                It swept for a long time (the mask ran blogSweepDown while
                the type drifted 0.22em against it), and the reason it could
                never DESCEND still stands and still bounds any future
                gesture here: a block hidden behind a top-tight mask has to
                travel its own height, and this one's is not knowable — three
                lines in this column at 1440 and five at 390, a ~190px fall
                on a phone for a gesture that is 20px on the label above it.
                The sweep went at the user's instruction that the chapter
                heads take the manifesto statement's ink bleed (blur → sharp,
                in place; see ScrubWord in Manifesto.tsx), and Finding 01 of
                the motion crit is the argument that supports it: a
                travelling display line has no baseline while the eye is on
                it. Focus changes in place, so this one keeps its baseline
                the whole way.
                THE WRAPPER STAYS BUT NO LONGER CLIPS — it owns the lockup
                gap above the sentence and nothing else now. It must never
                clip again: a blurred glyph paints its halo OUTSIDE its own
                box by the blur radius, and any clip here would shear the
                soft edge into hard rectangular sides mid-entrance. The
                keyframes are blogInkBleed in Blog.module.css. */}
            <div className={styles.ledeMask}>
              <p className={styles.lede}>
                Stories, openings, and ideas shaping the Maginhawa Group.
              </p>
            </div>

            {/* THE ARCHIVE LINK — the house action, shared with About's
                "Read our story" and the closing frame's "Choose a
                restaurant" (components/PillCta.tsx). `styles.ctaHost` is the
                SEAT only, and the seat is now simply "under the sentence":
                it used to be `justify-self: end` in a head that spanned the
                page, hung off the display line's last baseline at the far
                right. In a column there is nothing to hang off and nothing
                to the right, so it sits in the stack.

                ⚠️ THE LABEL READS "All Stories" AND IT USED TO READ "Read
                More", which failed two checks on the live site for one
                reason. "read more" is on Lighthouse's blocklist of
                non-descriptive link text and that audit reads the anchor's
                TEXT CONTENT, so no aria-label could satisfy it; separately,
                axe's `label-content-name-mismatch` fires when the visible
                text is not contained in the accessible name, so someone
                driving the page by voice matched nothing. Naming the
                destination fixes both, and it is the honest label anyway. */}
            {/* ⚠️ THE SWEEP GOES ON THE HOST, WHICH IS WHAT `className`
                LANDS ON — never on the magnet inside it. PillCta writes the
                cursor spring's x/y to `.magnet`'s inline style, so anything
                this file put there would be overwritten every frame without
                erroring. */}
            <PillCta
              href="/blog"
              className={styles.ctaHost}
              aria-label="Read all stories"
            >
              All Stories
            </PillCta>
          </motion.div>

          {FEATURED ? (
            <Front
              post={FEATURED}
              pan={drifting ? panY : undefined}
              hostRef={frontRef}
            />
          ) : null}
        </div>

        {/* /blog's divider, word for word: a hairline with the archive's
            own caption on it. It is the single strongest tie between the
            two pages, and it is also what retired the duplicated lede —
            see buildChapter above. */}
        <div className={styles.divider}>
          <span className={styles.dividerLabelMask}>
            <span className={styles.dividerLabel}>Earlier Entries</span>
          </span>
          <span className={styles.dividerRule} aria-hidden />
        </div>

        {/* `tabIndex` + `role="region"` because a scroll container that only
            a pointer can reach is unreachable by keyboard: with these the
            rail is a focus stop and the arrow keys drive it.

            ⚠️ NO `data-lenis-prevent` — see onWheel above for why it was
            here and why it was the scrolling fault. */}
        <div
          ref={stripRef}
          className={styles.strip}
          tabIndex={0}
          role="region"
          aria-label="Earlier entries"
          data-dragging={dragging || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onWheel={onWheel}
          onClickCapture={onClickCapture}
        >
          {STRIP.map((post, i) => (
            <Entry key={post.slug} post={post} beat={STRIP_BEAT + i} />
          ))}
        </div>
      </div>
    </section>
  );
}
