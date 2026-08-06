"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Discover.module.css";
/* THE CARD'S OWN STYLESHEET, imported beside this chapter's — TWO modules
   on one component, deliberately.
   The card is <VenueCard> now and it took its rules with it, which is what
   lets /restaurants wear the same object. But the EXPANSION left behind
   still paints a photograph, still falls back to a maroon field on the
   venue with no picture, and still presses a Michelin sticker into its
   top-right corner — `.photo`, `.fallback` and `.stickerBadge` are card
   rules and they live over there now. Importing the card's sheet is the
   honest way to keep using them; copying the three back here would be the
   duplication this whole pass deletes. */
import card from "./VenueCard.module.css";
import VenueCard from "./VenueCard";
import { getRestaurant, primaryAction } from "@/lib/restaurants";
import { venueCards, type VenueCardItem } from "@/lib/venueCards";
import { lenisRef } from "@/lib/SmoothScroll";
import SplitWords from "./SplitWords";

/* ══════════════════════════════════════════════════════════════════════
   THE ASSEMBLY INTRO IS GONE, and this note is here so nobody rebuilds it
   by accident.

   Until this pass the chapter opened with a once-per-session performance:
   an overlay pasteboard of eight editorial prints scrubbed past the camera
   on a CSS-3D dolly, the title "Our Restaurants." splitting into two words
   that prised a deck of photo plates open between them, and the deck then
   fanning out so every plate flew onto the exact seat its grid tile already
   occupied underneath. It held the page (`lenis.stop()` plus an overflow
   lock on the root), ran off a STEP enum and a CUE sheet of millisecond
   offsets, travelled the whole chapter under a transform and exchanged that
   transform for real scroll on one frame at the end.

   All of it is deleted — the stage, the deck, the flight geometry, the step
   machine, the page hold, the settle travel, the per-word split measurement
   and the fitted title size that only existed so the two words could clear a
   centred deck. What is left is a grid that scrolls in like every other
   chapter on the site (see `cellVariants`) and a heading that rises out of
   its own word masks on an observer.

   WHAT SURVIVES IT, and why, because each one looks orphaned otherwise:
     · PLATE_RATIO   still the card's aspect and still consumed in three
                     places (the tile, the expansion, and the note at its
                     declaration). The deck was the fourth.
     · data-plate    was the flight's landing seat; it is now purely the
                     probe hook for the card's own rectangle, which a dozen
                     scripts under scripts/ measure through it.
     · `lit`         "restaurants" still warms to saffron when the heading
                     arrives — it used to be cued off the step machine AND
                     off an observer; only the observer is left.
   ══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   WHAT THIS CHAPTER ADDS TO THE CARD RECORD, AND NOTHING ELSE.

   THE EIGHT RECORDS ARE GONE FROM HERE. Name, photograph, mark, the
   three-line address, price, hours, the Michelin sticker, the menu pages
   and the off-centre focal all come from lib/venueCards.ts now, which
   reads them from lib/restaurants.ts and adds only what the card needs on
   top. This file used to declare a second copy of all of it, under a
   banner warning that a fact changed in one place had to be changed in the
   other; that banner is what the join below retires.

   WHAT IS LEFT IS THIS CHAPTER'S PRESENTATION COPY — five fields the card
   record does not carry because nothing but the homepage prints them:

     tag        the one-line descriptor in the expansion's head row
     est        the founding year, likewise. The card's block stopped
                printing it two passes ago (it prints an address and two
                stats); the expansion still wants it.
     location   the address as ONE line, which is the expansion's form of
                it. IT IS NOT DERIVED from the card's three lines, and
                Mamasons is why: its block splits two sites across lines 2
                and 3 ("91 Kentish Town Rd" / "& 32 Newport, Chinatown"),
                while the expansion prints the single line the canonical
                record words as "91 Kentish Town Rd · 32 Newport China
                Town". Joining road and city with a comma would be right
                for seven venues and wrong for that one, which is the same
                trap the three-line address itself was written to avoid.
     blurb      the story: the card's hover copy and the expansion's body
     clip       the muted film that wipes open under the pointer

   ⚠️ THE `hours` WARNING MOVED WITH THE DATA. Every venue still carries an
   invented "12–11" and no real opening times exist anywhere in this repo.
   The full note is at the top of lib/venueCards.ts, where the string now
   lives — read it before shipping.
   ═══════════════════════════════════════════════════════════════════════ */
type DiscoverDisplay = {
  tag: string;
  location: string;
  blurb: string;
  est?: number;
  clip?: string;
};

/** a card record joined to this chapter's display copy */
type DiscoverItem = VenueCardItem & DiscoverDisplay;

const DISPLAY: Record<string, DiscoverDisplay> = {
  bintang: {
    tag: "Filipino Fusion Restaurant",
    location: "93 Kentish Town Rd, London NW1 8NY",
    blurb:
      "A Kentish Town staple since 1987 — Chef Omar's family kitchen, blending Malay, Indonesian, Japanese, Vietnamese and Filipino cooking.",
    est: 1987,
    clip: "/videos/tile-bintang.mp4",
  },
  guanabana: {
    tag: "Caribbean Cuisine",
    location: "85 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Kentish Town's Caribbean and Latin American room, best known for its oak-smoked Island Roast — since 2007.",
    est: 2007,
    clip: "/videos/tile-guanabana.mp4",
  },
  mamasons: {
    tag: "London's First Filipino Ice Cream Parlor",
    // the one venue with two sites — see the note on `location` above for
    // why this line is written out rather than joined from the address
    location: "91 Kentish Town Rd · 32 Newport China Town",
    blurb:
      "London's first Filipino ice cream parlour — Manila-style dirty ice cream, scooped fresh across two sites.",
    est: 2017,
    clip: "/videos/tile-mamasons.mp4",
  },
  ramo: {
    tag: "Filipino-Japanese Ramen",
    location: "28 Brewer St, Soho, London W1F 0SR",
    blurb:
      "The world's first Filipino-Japanese ramen joint — Originally from Kentish Town, since 2018, with our current location in Soho.",
    est: 2018,
    clip: "/videos/tile-ramo.mp4",
  },
  hoodwood: {
    tag: "Caribbean Takeaway",
    location: "81 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Oak-smoked jerk plates and handmade patties, fire-kissed over an open flame — Caribbean takeaway, done honestly.",
  },
  cafemama: {
    tag: "Filipino x Japanese Café",
    location: "83 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Hand-crafted sandos, all-day pandesal breakfasts, homemade baked treats, and quality coffee — your daily escape from the ordinary.",
    clip: "/videos/tile-cafemama.mp4",
  },
  belly: {
    tag: "Modern Filipino Bistro",
    location: "157 Kentish Town Rd, London NW1 8PD",
    blurb: "A modern Filipino bistro drawing on French technique.",
    clip: "/videos/belly-hero.mp4",
  },
  bunso: {
    // the coming-soon room: no film, no founding year, and the card takes
    // the maroon field venueCards() gives it in place of a photograph
    tag: "The Youngest of the Family",
    location: "1a Hawley Rd, London NW1 8RP",
    blurb:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
  },
};

/* THE EIGHT CARDS, in the canonical order venueCards() presents them in,
   each joined to its display copy. A venue added to lib/restaurants.ts
   with no entry above still renders: it carries no story and no film, and
   its one-line location falls back to its own address. That is the honest
   state for a room nobody has written copy for yet — better than dropping
   it out of the grid silently. */
const ITEMS: DiscoverItem[] = venueCards().map((v) => {
  const d = DISPLAY[v.slug];
  return {
    ...v,
    tag: d?.tag ?? "",
    location: d?.location ?? `${v.address.road}, ${v.address.city}`,
    blurb: d?.blurb ?? "",
    est: d?.est,
    clip: d?.clip,
  };
});

/* ── THE PLATE'S SHAPE ─────────────────────────────────────────────────
   ONE NUMBER FOR ALL EIGHT. Height as a fraction of width: 5/4, the
   portrait 4:5 the grid has always worn.

   THIS WAS A PER-VENUE TABLE and the field was ragged on purpose — the
   two anchor rooms stood tallest (5/4), the dining rooms took 9/8, the
   counters sat square. It was reversed on sight, 2026-08-04: the card is
   now ONE object (a full-bleed photograph with an ink panel seated in
   its bottom edge, not a picture with a caption block under it), and a
   grid of one object at eight different heights reads as a masonry wall
   rather than as a collection. Uniform, the eight rooms are presented as
   equals, which is the chapter's actual argument.

   3 : 4.3 AS OF THIS PASS, up from 5/4 (i.e. 3:3.75). The card is a
   taller portrait now because the bottom ~58% of it is a photo-derived
   ramp carrying an address, two stats and two controls: at 5/4 that ramp
   left the photograph a 110px-tall strip on the 4-up column and the card
   stopped being a picture.

   DO NOT WRITE THE RATIO ANYWHERE BUT HERE. TWO places consume it:
     · the grid tile   (.tileMedia's padding-top, still written inline —
       see below for why it does not simply live in the stylesheet)
     · the expansion   (.expandMedia's aspect-ratio, set inline — a
       layoutId morph between two boxes of different aspect is a two-axis
       stretch, and the photograph would visibly deform mid-flight)

   THERE WAS A THIRD, and it is worth recording what it wanted, because it
   is the strictest constraint this number ever had: the retired assembly
   intro's deck seat was `plateW × PLATE_RATIO`, and its flight was a
   translate plus ONE UNIFORM SCALE from that seat onto the tile's
   rectangle — a scale that is only uniform while the two boxes agree in
   shape. That consumer is gone with the intro, so a future change to this
   ratio can no longer stretch eight photographs in mid-air; it only has
   to keep the tile and the expansion in step, which is what the layoutId
   morph needs.

   Kept as a named constant rather than inlined at the call sites for
   exactly that reason: one source, two consumers, no drift. */
/* 3 : 3.8, DOWN FROM 3 : 4.3. Two reasons, and the one usually given is the
   weaker of them.

   The weak reason is fit: at 1440×900 the section measured 1022px against a
   900px viewport — 122px over, or 61px per row — and shortening the card by
   that much closes it. But "fits one screen" is true at 1440×900, false at
   1280×720 and wasteful at 2560×1440, so it is not a thing to design to.

   The real reason is the photographs. The card lays out at 274px wide on
   desktop; at 4.3 that is a 274×392 box, a narrower portrait than almost any
   of the source images, most of which are wide shopfronts being cropped hard
   to fit. 3.8 gives 274×347 — still portrait, still taller than the square
   the /restaurants grid uses, and considerably kinder to the crop.

   ONE SOURCE, THREE CONSUMERS. The same fraction sizes the tile seat, the
   expansion's media plate and the CSS fallback in Discover.module.css; a
   ratio stated in more than one place is a ratio that drifts, and a drifted
   ratio deforms the expand morph rather than merely looking wrong. */
/* SHALLOWER, so the chapter can fit one screen — from 3.8 / 3 (1.267).
   THE ARITHMETIC, because this number is not a taste decision and cannot be
   nudged without redoing it. Measured at 1440 wide, four-up:
     card width      (1360 − 3 × 12) / 4        = 331px
     card height     331 × ratio
     grid height     2 × card + 18px row gap
     fixed above     section padding + head + head-to-grid gap  = 377px
                     (108 padding + 234 head + 34 gap — MEASURED, not
                     estimated; a first pass guessed 310 and was 67px out,
                     because the head grew with the larger logo)
   For the section to fit a viewport of height H:
     ratio ≤ (H − 377 − 18) / 2 / 331
   which gives 1.035 at H = 1080, 0.914 at 1000, and 0.763 at 900.

   0.76 IS THE SHORTEST OF THOSE, AND THAT IS WHY IT IS THE VALUE. The
   requirement is that all eight fit on one screen — not on one 1080px
   screen — and a ratio tuned to a tall window silently fails on a laptop.
   Sized for 900 the chapter fits every window at or above it, and simply
   leaves air below itself on taller ones, which is the correct direction to
   be wrong in.

   THE COST IS THE CARD SHAPE. These were 3 : 3.8 uprights by explicit
   choice; at 0.76 they are 331 × 252 landscape. That is not a preference,
   it is what eight cards in two rows plus a 377px head leave room for.
   Fewer cards, three columns, or a shorter head would each buy the upright
   back.

   AND NO SINGLE RATIO CAN FIT EVERY HEIGHT, because this one is derived
   from the card's WIDTH while the constraint is on the page's HEIGHT.
   Making the fit exact rather than merely safe means driving the card
   height from the viewport instead — a flex-column section, `.grid { flex:
   1 }`, and plates on `height: 100%` rather than the padding-top ratio.
   That is a real change to VenueCard and is the right fix; this constant
   is the near-miss version. */
const PLATE_RATIO = 0.76;

// shared enter curve for the head's staged rise
const EASE = [0.22, 1, 0.36, 1] as const;

/* The title's two resting states, as variants so the CLIP can own the
   observer while the word inside it owns the motion — see the <h2>. */
const TITLE_RISE = {
  parked: { transform: "translateY(115%)" },
  raised: { transform: "translateY(0%)" },
};

/* THE GRID'S ONLY ENTRANCE, now that the assembly is gone.
   Each cell gets a custom {x, d}: its slide-from offset in vw — PAST the
   viewport edge, so tiles genuinely arrive from off screen (the section
   clips horizontally, see .section) — and its stagger delay.
   The top row arrives from the LEFT, the bottom row from the RIGHT. Each
   ROW moves as one rigid unit (shared delay), so cards hold their spacing
   in flight and never overlap; a per-cell stagger would concertina them.
   Opacity stays 1 while sliding — the travel IS the reveal.
   Exits run the same paths in reverse, faster and accelerating (ease-in):
   the system responding, not deciding. Reduced motion passes x: 0 and gets
   a plain crossfade.

   THE `d < 0` BRANCH IS GONE WITH THE INTRO. It meant "appear in place,
   instantly" and had exactly one caller: the first grid render after the
   assembly, where the flying plate's layoutId morph WAS the cell's
   entrance and any slide of the cell underneath it would have fought the
   flight. With no flight, every cell takes the slide. */
/* ══ THE ENTRANCE IS REMOVED, at the user's instruction. ══
   The cards are simply present. Every state below is the resting state, so
   nothing slides, fades, staggers or leaves.

   WHAT IT WAS, because it was the page's most elaborate entrance and the
   description above is worth keeping against the day someone wants it back:
   rows alternated direction, each row travelling as ONE rigid unit from
   110vw past its own edge — far enough that the outermost column started
   off-screen — with a 0.08s delay per row so the grid assembled in bands
   rather than as one block, and an exit that ran the same paths in reverse,
   faster and accelerating.

   THE MACHINERY AROUND IT IS DELIBERATELY LEFT STANDING: `inView`, the
   variant names, `motionCustom` and the GRID_COLS row arithmetic. It is
   inert while these variants are constant, and it is what a future entrance
   would need. Ripping it out would mean unpicking the <motion.ul>'s
   variants plumbing and the Tile's `custom` prop for no behavioural gain —
   the animation is off either way. If it is still unused a release from
   now, THAT is the moment to delete it.

   NOT DELETED EITHER: framer still owns these elements. `exit` has to
   resolve to something for AnimatePresence, and the layoutId morph that
   opens a card is a separate mechanism entirely — it is untouched. */
const cellVariants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
  exit: { opacity: 1 },
};

// the App Store morph — quick, critically damped, and interruptible
// mid-flight (a spring keeps its velocity when retargeted). Zero bounce:
// a panel that overshoots its own edges reads as elastic, not as glass.
const EXPAND_SPRING = { type: "spring", duration: 0.62, bounce: 0 } as const;

/* How many tiles a desktop grid row holds. It mirrors .grid's
   `repeat(4, 1fr)` at >=981px and exists only so the entrance choreography
   can group cells BY ROW — CSS owns the layout, this owns which cells fly
   together. Keep the two in step. */
const GRID_COLS = 4;

export default function Discover() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();

  // the App Store expansion — which tile's plate is currently open as the
  // full detail card (null = none)
  const [active, setActive] = useState<DiscoverItem | null>(null);

  /* NO VIEW MODE, AND THE HEIGHT MACHINERY WENT WITH IT.

     There were two layouts — an editorial grid and a horizontal reel — and
     a segmented switch between them. Both are gone; the grid is the only
     view. What that retires is worth recording, because it was most of the
     complexity in this file:

       · an AnimatePresence with mode="wait" keyed on the view
       · a listBox that ANIMATED ITS OWN HEIGHT, because the two layouts
         differed by 262px and swapping them moved the document (and every
         chapter below) in a single frame
       · a ResizeObserver on a callback ref, needed because under
         mode="wait" the incoming list mounts ~450ms after the mode changes,
         so an effect keyed on the mode measured the outgoing one
       · pointer-drag and wheel handlers for the reel
       · `layoutId`s namespaced per mode, so the switch could not run a
         cross-mode morph from an old grid rect to a new reel rect

     A plain ref is enough now: one list, one height, nothing to swap. */
  const setGridEl = useCallback((el: HTMLUListElement | null) => {
    gridRef.current = el;
  }, []);

  /* one-shot entrance reveal. It watches the SECTION rather than the ul —
     inherited from the assembly, where the ul could be absent, but still
     the right target: the section is the box that is always mounted and
     never transformed, and the rootMargin below is written against it. */
  useEffect(() => {
    if (inView) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -16% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  /* NAMING THE CHAPTER. "restaurants" warms from maroon to saffron as the
     heading arrives.

     A one-way latch rather than a mirror of anything, and it is lit by the
     SAME observer that raises the second word out of its mask — so the
     colour change is welded to the arrival it belongs to. It used to have
     two owners (the assembly's step machine and this observer); with the
     assembly gone the observer is the only path and the latch is what stops
     a re-entry from re-lighting a word that is already lit.
     The warming belongs to the type, so it is a CSS colour transition on
     the word rather than a value React re-renders — see
     .titleRise[data-lit]. */
  const [lit, setLit] = useState(false);

  /* Reduced motion takes NEITHER the rise nor the observer — it renders the
     title already standing (see the <h2> below). Everything else on this
     chapter now takes one path, which is the whole point of the deletion:
     there is no "did the intro own this element" question left to ask. */
  const ordinaryTitle = !reduce;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="restaurants"
      data-nav-theme="light"
    >
      {/* 12-column editorial head seated on the inset span: display heading
          across columns 1–9 as ONE line, and the small caption closing the
          band from column 9, its right edge on the band's own right edge,
          sharing the heading's bottom baseline band. Both rise once on
          scroll-in — heading first, caption a beat behind. */}
      <div className={styles.head}>
        {/* The heading BUILDS OUT OF ITS OWN WORDS, on the manifesto's
            word-mask grammar — the same one the caption beside it uses. */}
        {/* THE OBSERVER GOES ON THE CLIP, NOT ON THE THING BEING CLIPPED.
            `.titleLine` is `overflow: hidden` and the word starts parked a
            full 115% below it, so the word's VISIBLE rect is empty — and an
            IntersectionObserver intersects its target against the clip rect
            of every ancestor, not just the viewport. A `whileInView` on the
            word therefore reports a 0 ratio forever and `amount: 0.5` can
            never be met: the observer path could not raise the title at all.
            It went unnoticed for a long time because a first visit never
            used it — the retired assembly owned the title off its step
            machine, and this was only reached by a reader coming BACK to
            the homepage. Measured then: `translateY(109.7px)`, i.e. still
            parked, with the line sitting whole in a 900px viewport. It is
            now the ONLY path, so the bug would be on every visit.
            The line box is unclipped, so observing it works; the word rides
            the parent's variant. */}
        {/* NO INLINE SIZE ANY MORE. This heading used to be handed a
            measured `titlePx` — the size the intro's two words had to come
            down to for the deck to open between them (78px against the
            stylesheet clamp's 104px at 1440) — because the chapter could
            not afford to change size in front of the reader as the sequence
            armed. With no split to agree with, the heading takes the
            stylesheet's clamp at every width, which is what the media
            block's nine-column arithmetic was written for. That also
            retires the resize handling `fitTitle` needed: a stale fitted px
            was measured wrapping the line at 1100 and overflowing the
            band's right edge by 125px at 390. */}
        {/* ── THE CHAPTER LABEL. Small, sans, with the group's mark set into
            the line before the words.

            THE SIZE HIERARCHY IS INVERTED FROM WHAT IT WAS, and the
            SEMANTICS ARE NOT. This used to be the biggest type in the
            chapter — "Our collection of restaurants" at 3.9rem — with the
            description beneath it as a caption. It is now the smallest, and
            the description carries the display size instead. That is the
            editorial move (a standing label, then the sentence that does the
            work), and it changes nothing about the document outline: this is
            still the <h2>, because it is still the section's NAME. Visual
            size and heading level are separate systems and conflating them
            is how a page ends up with an h2 that says "Explore our family".

            THE MARK IS DECORATIVE, hence alt="". The words beside it already
            say what it is, and a screen reader announcing "Maginhawa —
            Our restaurants" would be reading the logo twice.

            1024×1024 IS THE FILE'S REAL SIZE, checked rather than assumed —
            maginhawa.png is a SQUARE mark, not a wordmark. It was first
            written here as 512×96 on the assumption it was a horizontal
            lockup, which next/image would have used to reserve a 5.33:1 box
            for a 1:1 picture. The CSS below happened to render it correctly
            anyway (height in em, width auto, object-fit contain), which is
            exactly how a wrong intrinsic ratio survives review — it only
            shows up as a layout shift on a slow connection.

            .labelMark sizes it in em so it tracks the label's own type
            rather than the viewport. */}
        <h2 className={styles.chapterLabel}>
          <Image
            className={styles.labelMark}
            src="/logo/maginhawa.png"
            alt=""
            width={1024}
            height={1024}
            aria-hidden
          />
          Our restaurants
        </h2>
        {/* The standfirst BUILDS word by word rather than sliding in — the
            same grammar as the statement under the hero and as the heading
            beside it. It sits right-ranged against the band's right edge
            (the edge the retired view switch used to close — see the
            stylesheet's .caption seat), so the head reads the chapter's
            name on the left and its description on the right. Nothing in
            this band travels from off screen any more: the switch that
            arrived that way went with the reel it selected.
            NO `on` PROP. It used to be driven off the assembly's captions
            cue, because an observer would have been racing the step
            machine; with no step machine it takes SplitWords' own
            whileInView, like every other caller on the site. */}
        {/* THE LINE THAT NOW CARRIES THE DISPLAY SIZE. Freight Light, two
            lines, ranged left under the label — the Jonite arrangement.
            It keeps SplitWords: the word-by-word build is the same grammar
            the statement under the hero uses, and at this size it finally
            has type worth building. */}
        <SplitWords
          as="p"
          className={styles.lede}
          text="Explore our family of restaurants and stores, where tradition is served with a modern twist."
          amount={0.5}
          stagger={0.03}
          duration={0.65}
        />

        {/* HAIRLINE 1 OF 3. It closes the head and opens the grid, which is
            the one place on this chapter a rule earns its keep: it is INSIDE
            a section, organising the section's own parts, rather than
            between two sections. globals.css records the rule for the other
            case — "The gap is the separator. Do not put the line back." —
            and this does not contradict it. Presentational, so aria-hidden
            and a div rather than an <hr>, which would announce a thematic
            break the document does not have. */}
        <div className={styles.headRule} aria-hidden />

        {/* NO VIEW TOGGLE. A GRID ⟷ STRIP segmented switch sat here, and the
            horizontal reel it selected has gone with it. Two reasons it was
            not carrying its weight: the reel showed FEWER rooms than the grid
            in the same space while asking for a gesture the rest of the page
            never asks for, and every plate carrying a `layoutId` inside a
            sideways-scrolling box made the expansion morph measure short by
            the scrollLeft (the workaround for which is the longest comment
            this file used to have). One editorial grid, no control to learn. */}
      </div>

      {/* ONE LIST, so no wrapper. The listBox that used to sit here animated
          its own height between the two layouts; with a single grid its
          height is just the grid's, and a box animating to a value that
          never changes is a frame budget spent on nothing.

          `layoutScroll` went with the reel too. It existed because a plate's
          `layoutId` projection measures in viewport coordinates and had no
          idea its ancestor carried a scrollLeft — so a re-measure taken while
          the reel was scrolled came back short by exactly that scroll,
          throwing the plate off screen and scaling it with the delta. The
          grid does not scroll on either axis, so projection is right by
          default. */}
        <motion.ul
          ref={setGridEl}
          className={styles.grid}
          aria-label="Our restaurants"
          variants={{ hidden: {}, show: {}, exit: {} }}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          exit="exit"
        >
          {ITEMS.map((it, i) => {
            /* slide-from offset + group delay for this cell: 110vw
               guarantees even the far column starts past the edge.
               ROWS ALTERNATE, and the row divides by GRID_COLS because that
               constant is kept in step with .grid's column count (four up
               at >=981px). Dividing by the wrong count puts tiles from two
               different visual rows into one flight group — they set off
               together from opposite edges and cross. Every cell in a row
               shares ONE delay, so the row moves as a rigid unit and cards
               keep their spacing in flight; the delay is per row rather
               than a single 0.08 for "the second one", since more than two
               rows need more than two departures. */
            const motionCustom = reduce
              ? { x: 0, d: 0 }
              : (() => {
                  const row = Math.floor(i / GRID_COLS);
                  return { x: row % 2 === 0 ? -110 : 110, d: row * 0.08 };
                })();
            return (
              <Tile
                key={it.slug}
                item={it}
                index={i}
                motionCustom={motionCustom}
                onOpen={() => setActive(it)}
              />
            );
          })}
        </motion.ul>

      {/* the expanded detail card + backdrop — mounted only while open, so
          AnimatePresence can run the morph back into the grid on close */}
      <AnimatePresence>
        {active && (
          <ExpandedCard
            key={active.slug}
            item={active}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/* THE STAT GLYPHS WENT WITH THE CARD. PriceGlyph and HoursGlyph were
   declared here and drawn into the block's two stats; they live in
   VenueCard.tsx now, next to the stats they label. */

function Tile({
  item,
  index,
  motionCustom,
  onOpen,
}: {
  item: DiscoverItem;
  /* the tile's place in the grid. It used to be the assembly flight's SEAT
     index; what is left of it is the per-tile stagger the grid reads
     across on, and the `data-plate` attribute the probes measure the
     card's rectangle through. */
  index: number;
  motionCustom: { x: number; d: number };
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();

  /* ═══════════════════════════════════════════════════════════════════
     THE CARD IS <VenueCard> NOW, AND EVERYTHING THIS FUNCTION USED TO DO
     INSIDE IT IS GONE.

     What left: the photograph and its maroon fallback, the hover film and
     the three DOM handlers that wipe it open from the cursor, the hover
     shade, the two ramp layers, the pressable, the crown with its mark and
     Belly's sticker, and the whole block — the three-line address, the two
     stats and their glyphs, the hairline, and the two control pills. All
     of it was declared here AND again in components/VenueCard.tsx, which
     is what this pass deletes. The derivations that fed it went too: the
     canonical `primaryAction()` read, the `menuPages` gate, the address
     fallback and the stats filter are the card's own business and it does
     all four itself.

     WHAT STAYED, AND WHY IT HAD TO. The SEAT below is this page's, not the
     card's, because the two grids need different things from it: this one
     carries the `layoutId` the expansion morphs out of, a `data-plate`
     index the probes measure the rectangle through, and PLATE_RATIO's
     3 : 4.3 padding; /restaurants' seat is a plain square. A component
     owning the seat would have to own both.

     AND THE TRANSFORM MUST NOT REACH IT. The hover lift and the press
     scale live on `.cardSurface`, INSIDE this box — a transform on the
     measured box pollutes the rect Framer reads for the morph, which is a
     bug this card has already shipped once, when the lift lived on a
     <button> wrapping the plate and a morph opened mid-hover measured a
     1%-too-big rectangle. So nothing here animates.

     NOTHING IS STAGED. <VenueCard> takes `furnitureMotion`, `glassMotion`
     and `actionMotion` for a page that builds the card in beats; that was
     the retired assembly intro's job and it is not passed, so the card's
     three prop objects stay at their `{}` default and the whole card
     simply renders. The entrance it does take is the CELL's — see
     cellVariants; the card travels in from the screen edge as one object,
     which is what an unstaged card should do.
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <motion.li
      className={styles.cell}
      variants={cellVariants}
      custom={motionCustom}
    >
      {/* NO HOVER HANDLERS ON THIS ELEMENT ANY MORE. They opened the film
          and they sat here because the CSS keyed off `.cell:hover`; both
          moved inside the card, onto `.cardSurface`. The cell, the seat and
          the card are one rectangle, so a pointer over any of them is a
          pointer over all three — which is exactly what lets one stylesheet
          serve a grid that has cells and a grid that has none. */}
      <motion.div
        className={styles.tileMedia}
        /* THE CARD'S RECTANGLE, as a probe hook. This was the assembly
           flight's landing seat; with no flight it is kept because a dozen
           scripts under scripts/ measure the card's box, its clip, its
           ramp and its crown through `[data-plate]`. Removing it would
           break every one of them silently. */
        data-plate={index}
        layoutId={reduce ? undefined : `card-${item.slug}`}
        /* padding-top carries the plate's aspect from PLATE_RATIO — the
           stylesheet's 143.33% is only the fallback. Inline because the
           same number must also size the expansion, and a value stated in
           the stylesheet AND in the component is a value that drifts. */
        style={{
          /* --radius-tile, matching the story band, at the user's request.
             This box is `overflow: visible`, so its own corner paints
             nothing — the visible curve is VenueCard's .cardSurface inside
             it. It is set anyway because this is the box carrying the
             layoutId, and framer interpolates the RADIUS OF THE ANIMATING
             BOX during the morph: leave it at 2px and the flight starts
             from a corner the reader never saw. Keep this, .cardSurface
             and .expandMedia on the same token. */
          borderRadius: "var(--radius-tile)",
          paddingTop: `${PLATE_RATIO * 100}%`,
        }}
      >
        <VenueCard
          item={item}
          /* the column count this grid actually produces, in the order the
             media queries fire — see .grid in the stylesheet. The card does
             not know its own column count and a wrong `sizes` is a 4K
             decode on a 274px box. */
          sizes="(max-width: 460px) 100vw, (max-width: 700px) 50vw, (max-width: 980px) 34vw, 25vw"
          onPress={onOpen}
          pressLabel={`Open ${item.name}`}
          // the press expands the card in place rather than navigating
          pressHasPopup="dialog"
          /* passed unconditionally: the card is what knows whether there
             are menu pages behind the control, so the rule lives in one
             place for both grids. WHERE IT GOES is this page's decision —
             the venue's own page, which opens the same pages through
             <MenuOverlay>. Deliberately NOT a local overlay: mounting one
             here would put a second modal in a component that already
             portals an expansion. And deliberately not a deep link that
             auto-opens it either, because RestaurantDetail has no URL
             contract for that today (`menuOverlayOpen` is plain local
             state). Give it one and this gains a `#menu`. */
          menuHref={`/restaurants/${item.slug}`}
          clip={item.clip}
          blurb={item.blurb}
        />
      </motion.div>
    </motion.li>
  );
}

/* CaptionWords is GONE. It split the old in-photo caption's meta line into
   per-word masks, and the metadata strip it served went with the card's
   redesign — the block prints an address and two stats now, and neither
   the strip nor the `.metaClip` motion this note used to point at exists
   anywhere. The manifesto's word-mask grammar still runs this chapter's
   heading and its standfirst; see the <h2> and <SplitWords> above. */

/* The App Store morph: the plate's rectangle becomes a centred detail card.
   The card element shares the plate's layoutId, so Framer Motion FLIPs it
   from the tile's bounds to the card's — transform-only, spring-driven,
   interruptible — while the body content fades up a beat behind. Closing
   (backdrop, ×, or Escape) runs the same morph in reverse. Reduced motion
   swaps the morph for a plain crossfade. */
function ExpandedCard({
  item,
  onClose,
}: {
  item: DiscoverItem;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  // same derived action as the tile — the expansion is the tile opened, so
  // the two must never disagree about what a reader can do here
  const action = (() => {
    const r = getRestaurant(item.slug);
    return r ? primaryAction(r) : null;
  })();

  // modal housekeeping: hold the page still underneath, close on Escape,
  // and land keyboard focus on the close control
  useEffect(() => {
    const lenis = lenisRef.current;
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [onClose]);

  // PORTALED to <body>: the section lives inside .afterHero's z-index: 1
  // stacking context, which would trap ANY overlay underneath the fixed
  // nav (z 80) no matter its own z-index. The portal escapes the trap.
  //
  // Only the MEDIA plate carries the layoutId morph — tile and expansion
  // are both 3:2, so the FLIP is pure scale + translate with zero content
  // distortion. The cream body sheet fades up beneath it a beat later,
  // echoing the tile's own plate-above-caption grammar at full size.
  return createPortal(
    <div
      className={styles.expandRoot}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <motion.div
        className={styles.expandBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // exits quicker than it enters — the system responding, not deciding
        exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeOut" } }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onClick={onClose}
      />

      <div className={styles.expandCard}>
        <motion.div
          className={styles.expandMedia}
          layoutId={reduce ? undefined : `card-${item.slug}`}
          /* the SAME aspect as the tile, from the same constant — a morph
             between two rects of different aspect is a two-axis stretch
             that visibly deforms the photograph mid-flight. Written from
             PLATE_RATIO rather than left to the stylesheet's 4/5 so the
             pair provably cannot drift; the stylesheet value is the
             fallback for a stylesheet-only render. */
          style={{
            /* the same token the tile's .cardSurface takes — the morph
               lands on this box, and a flight that changes radius mid-air
               reads as the corner "growing" independently of the card */
            borderRadius: "var(--radius-tile)",
            aspectRatio: String(1 / PLATE_RATIO),
          }}
          transition={EXPAND_SPRING}
          initial={reduce ? { opacity: 0 } : undefined}
          animate={reduce ? { opacity: 1 } : undefined}
          exit={reduce ? { opacity: 0 } : undefined}
        >
          {item.image ? (
            <Image
              // `card`, not `styles` — see the import note: the photograph's
              // rule belongs to the card and moved to its stylesheet
              className={card.photo}
              style={item.focal ? { objectPosition: item.focal } : undefined}
              src={item.image}
              alt=""
              fill
              sizes="(max-width: 780px) 100vw, 720px"
            />
          ) : (
            <div className={card.fallback} aria-hidden />
          )}
          <div className={styles.scrim} aria-hidden />
          <div className={styles.center}>
            <div className={styles.brandGroup}>
              {item.logo ? (
                <span
                  className={styles.logo}
                  style={
                    {
                      "--ov-logo-url": `url(${item.logo})`,
                    } as React.CSSProperties
                  }
                  role="img"
                  aria-label={item.name}
                />
              ) : (
                <span className={styles.wordmark}>{item.name}</span>
              )}
            </div>
          </div>
          {item.badge ? (
            <span className={card.stickerBadge}>
              <Image
                src={item.badge}
                alt=""
                width={128}
                height={128}
                sizes="128px"
                draggable={false}
              />
            </span>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            className={styles.expandClose}
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" aria-hidden focusable="false">
              <path
                d="M3 3 L13 13 M13 3 L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </motion.div>

        <motion.div
          className={styles.expandBody}
          initial={{ opacity: 0, transform: "translateY(14px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{
            opacity: 0,
            transform: "translateY(8px)",
            transition: { duration: 0.2, ease: "easeOut" },
          }}
          transition={{
            duration: 0.4,
            ease: EASE,
            // the body lands a beat after the morph has mostly settled
            delay: reduce ? 0 : 0.14,
          }}
        >
          <div className={styles.expandHeadRow}>
            <h3 className={styles.expandName}>{item.name}</h3>
            <span className={styles.expandTag}>
              {item.est ? `Est. ${item.est} · ` : null}
              {item.tag}
              {item.priceRange ? ` · ${item.priceRange}` : null}
            </span>
          </div>
          <p className={styles.expandBlurb}>{item.blurb}</p>
          {item.badge ? (
            <p className={styles.expandCredential}>
              <Image
                className={styles.expandCredentialMark}
                src={item.badge}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                draggable={false}
              />
              {item.badgeLabel}
            </p>
          ) : null}
          <p className={styles.expandLocation}>{item.location}</p>
          <div className={styles.expandActions}>
            {action ? (
              <a
                href={action.href}
                {...(action.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                /* .panelAction, the tile panel's own control — the
                   expansion IS the tile opened, so the two must not
                   disagree. They no longer sit on the same ground
                   (the tile's panel is ink now, this sheet is still
                   cream), which is exactly why the class carries its
                   hover target as custom properties and this block
                   overrides them: the RESTING annatto pill is identical
                   on both, and only the inversion differs.
                   This was .pillBook, which the caption-on-photo era
                   inverted to a cream ring with cream text: correct
                   over a photograph, INVISIBLE on this cream sheet
                   (measured: ring and label both var(--cream) on
                   var(--cream)). That failure is the reason the hover
                   colour here is not simply hard-coded to cream. */
                className={styles.panelAction}
              >
                {/* the expansion has room for the longer form of the same
                    action the tile abbreviates */}
                {action.label === "Book" ? "Book a Table" : action.label}
              </a>
            ) : null}
            <Link
              href={`/restaurants/${item.slug}`}
              className={styles.viewLink}
            >
              View Restaurant
            </Link>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
