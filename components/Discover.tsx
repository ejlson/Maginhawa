"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
   duplication this whole pass deletes. `.blockLarge` is the fourth: the
   expansion prints the card's BLOCK now, and the block's larger type scale
   belongs beside the block it scales. */
import card from "./VenueCard.module.css";
import VenueCard, { VenueBlock } from "./VenueCard";
import SplitWords from "./SplitWords";
import { venueCards, type VenueCardItem } from "@/lib/venueCards";
import { lenisRef } from "@/lib/SmoothScroll";
import { asset } from "@/lib/media";

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

     location   the address as ONE line, which is the expansion's form of
                it. IT IS NOT DERIVED from the card's two lines, and
                Mamasons is why: its block splits two sites across them
                ("91 Kentish Town Rd" / "& 32 Newport, Chinatown"), while
                the expansion prints the single line the canonical record
                words as "91 Kentish Town Rd · 32 Newport China Town".
                Joining road and city with a comma would be right for seven
                venues and wrong for that one, which is the same trap the
                split address itself was written to avoid.
     blurb      the story: the card's hover copy, and the expansion's own
                row above the hairline
     clip       the muted film that wipes open under the pointer

   ⚠️ TWO FIELDS ARE NO LONGER PRINTED ANYWHERE, and they are kept rather
   than deleted because they are CONTENT and only this file holds them:

     tag        a one-line descriptor. It was the expansion's, in a mono
                "EST. 1987 · FILIPINO FUSION RESTAURANT · ££" strip; the
                expansion wears the card's block now, and the card's block
                prints the canonical `tagline` from lib/restaurants.ts. The
                two had ALREADY DRIFTED, which is the argument for the
                shared block in one line: this table says Mamasons is
                "London's First Filipino Ice Cream Parlor" and the record
                says "Filipino Ice Cream Parlour". Delete `tag` when
                somebody has confirmed the record's wording is the one to
                keep for all eight.
     est        the founding year, in the same strip. There is no slot for
                it in the card's block, and inventing one would be the
                second design of the block this pass exists to delete. Note
                that four of these years (2007, 2017, 2018 and Bintang's
                1987) exist NOWHERE ELSE in the repo — deleting the field
                loses them.

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
      "A Kentish Town staple since 1987 - Chef Omar's family kitchen, blending Malay, Indonesian, Japanese, Vietnamese and Filipino cooking.",
    est: 1987,
    clip: "/videos/tile-bintang.mp4",
  },
  guanabana: {
    tag: "Caribbean Cuisine",
    location: "85 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Kentish Town's Caribbean and Latin American room, best known for its oak-smoked Island Roast - since 2007.",
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
      "The world's first Filipino-Japanese ramen joint - Originally from Kentish Town, since 2018, with our current location in Soho.",
    est: 2018,
    clip: "/videos/tile-ramo.mp4",
  },
  hoodwood: {
    tag: "Caribbean Takeaway",
    location: "81 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Oak-smoked jerk plates and handmade patties, fire-kissed over an open flame - Caribbean takeaway, done honestly.",
  },
  cafemama: {
    tag: "Filipino x Japanese Café",
    location: "83 Kentish Town Rd, London NW1 8NY",
    blurb:
      "Hand-crafted sandos, all-day pandesal breakfasts, homemade baked treats, and quality coffee - your daily escape from the ordinary.",
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
      "Bunso — 'the youngest' - is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
    clip: "/videos/bunso-bakery.mp4",
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

   DO NOT WRITE THE RATIO ANYWHERE BUT HERE. ONE place consumes it:
     · the grid tile   (.tileMedia's padding-top, still written inline —
       see below for why it does not simply live in the stylesheet)

   THE EXPANSION WAS THE SECOND CONSUMER AND IS NOT ANY MORE. It carried
   this same fraction as an inline aspect-ratio precisely so the layoutId
   morph could not deform the photograph — a flight between two rects of
   different shape is a two-axis stretch. The expansion is now a 3:4
   PORTRAIT by design (the user's instruction; see the banner on
   ExpandedCard), so the shapes differ on purpose and the deformation is
   answered where it happens instead: `.expandFrame` is a projection node
   of its own and re-crops through the flight. Changing this number no
   longer touches the expansion at all.

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

   ONE SOURCE, TWO CONSUMERS TODAY: the tile seat and the CSS fallback in
   Discover.module.css. (It was three — the expansion's media plate was the
   third until that plate went portrait; see the paragraph above.) A ratio
   stated in more than one place is a ratio that drifts. */
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
/* ── 0.785, UP FROM 0.76, AND THE HEADROOM IS MEASURED NOT GUESSED ──
   The constraint above is unchanged: all eight cards on one screen at
   900px of viewport height. What changed is the measurement. The 0.76
   derivation used an ESTIMATED 377px of fixed height above the grid; the
   real figure, read off the rendered section at 1440 × 900, is 337px, and
   the card is 345px wide there rather than the 331 that was assumed. So:

     card height ≤ (900 − 337 − 18) / 2 = 272.5px
     ratio       ≤ 272.5 / 345          = 0.790

   0.785 takes that with ~3px of margin rather than sitting on it, which is
   the direction to be wrong in when the head's own type can reflow by a
   line. Measured at 1440 × 900 the section is 897px tall against a 900px
   window, and it was 879px before.

   AND IT IS CHECKED ON THE CARDS AS WELL AS ON THE SECTION, because those
   are two different questions and the wide window separates them. At 1920
   × 1080 the section measures 1110px — it does NOT fit, and it did not fit
   at 0.76 either (1087px), because the fixed height above the grid grows
   with the width (362px there against 337px at 1440) while the cards grow
   faster still. What fits at both sizes is the thing the requirement is
   actually about: the last card's bottom edge lands 1042px below the
   section's top at 1920 × 1080 and 840px at 1440 × 900, i.e. all eight
   cards are on screen with 38px and 60px to spare. The overflow at 1920 is
   the section's closing rule and its bottom padding, not a card. A ratio
   solved against the CARDS alone would go to ~0.82; this one is solved
   against the section at 1440, which is the stricter of the two.

   IT IS THE SMALLER HALF OF WHAT THE CARD GAINED. The block under the
   photograph halved at the same time — no address, no stat, no hairline —
   so the picture's clean band grows by the ~49px the block gave back on
   top of the ~9px this ratio adds. The card is still landscape at 345 ×
   271; getting the 3 : 3.8 upright back needs fewer cards, three columns
   or a shorter head, exactly as the note above says. */
/* ── 0.82, UP FROM 0.785, AND IT IS THE NUMBER THE NOTE ABOVE ALREADY
   NAMED. That note ends: "A ratio solved against the CARDS alone would go
   to ~0.82; this one is solved against the section at 1440, which is the
   stricter of the two." This pass takes the looser of the two tests on
   purpose, at the request for a taller card, so what changes is which
   question the constant answers — not the arithmetic, which is unchanged.

   THE TWO TESTS, AND WHICH ONE IS BEING TRADED AWAY:
     · ALL EIGHT CARDS ON SCREEN — the thing the requirement is actually
       about. Still true on every window whose height matches its width.
     · THE WHOLE SECTION ON SCREEN — given up. It was already false above
       1440 (1101px against a 1080px window at 1920, and 1087px even at the
       retired 0.76). What overflows is the section's closing rule and its
       bottom padding, never a photograph.

   MEASURED AFTER THE CHANGE, last card's bottom edge against the window:

       1920 × 1080   card 465 × 381   1075   on screen, +5px
       1512 ×  982   card 363 × 298    900   on screen, +82px
       1440 ×  900   card 345 × 283    864   on screen, +36px
       1366 ×  768   card 327 × 268    819   OFF by 51px
       1280 ×  800   card 305 × 250    777   on screen, +23px
       1280 ×  720   card 305 × 250    770   OFF by 50px

   THE TWO FAILURES ARE SHORT WINDOWS AND THEY WERE ALREADY FAILING. 768px
   and 720px of height are below the 900 this constant has been solved
   against since it was 0.76; at 0.785 they were off by 29 and 28px, so this
   pass costs those two windows ~22px each rather than breaking them. Both
   still show the whole top row and most of the second.

   ⚠️ 0.82 IS THE CEILING, NOT A WAYPOINT — and the binding window is
   1920 × 1080, not the 900 the earlier notes were written against. There is
   5px of margin there. 0.83 spends 9px and puts the last row's bottom edge
   below the fold on the commonest large display there is. Do not nudge this
   number without re-running the table above.

   If the card wants to be a true upright again the answer has not changed:
   fewer cards, three columns, or a shorter head — or drive the height from
   the viewport rather than from the card's width, which is the real fix the
   0.76 note describes and the only one that stops this constant being a
   compromise between two window shapes. */
const PLATE_RATIO = 0.82;

// shared enter curve for the head's staged rise
const EASE = [0.22, 1, 0.36, 1] as const;

/* NO VARIANT PAIR HERE ANY MORE. A TITLE_RISE {parked, raised} object stood
   at this spot, unreferenced — the word's park and its release are two CSS
   rules keyed off `data-on` (Discover.module.css) and have been for a while.
   It was removed rather than re-signed when the park flipped to -115%,
   because a dead constant quoting the old number is exactly the sort of
   thing a reader later trusts. */

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
/* ══ THE ENTRANCE IS A CLIP WIPE. ══
   Each card's RECTANGLE opens from its own bottom edge. The card does not
   move, does not fade and does not scale — only the window it is seen
   through grows, bottom to top.

   THIS IS NOT THE ENTRANCE THAT WAS REMOVED. That one was the 110vw slide
   described below, taken out at the user's instruction, and nothing here
   brings it back: no cell travels, so the objection it earned — a grid
   flying in from off-screen, twice, in bands — does not apply. A wipe is
   the quiet version of the same beat.

   WHY A CLIP AND NOT A TRANSLATE. A moving card resamples its photograph
   every frame, and eight food photographs softening as they arrive is the
   one artefact this chapter cannot afford. A clip moves the window instead
   of the picture: the plate is pixel-identical at every step, and the whole
   thing composites.

   IT ANIMATES A CUSTOM PROPERTY, NOT `clipPath`, AND THAT IS THE WHOLE
   DESIGN. A landed wipe must leave the cell with NO clip at all: a resting
   `inset(0%)` is still a clip — the cell's border box exactly — and
   VenueCard's hover then lifts, scales and shadows OUTSIDE that box, so
   every pixel of the lift and the whole of --shadow-card-hover is shorn off
   at the cell's edge, on all eight cards, for the life of the page.

   Animating `clipPath` directly and clearing it afterwards is the obvious
   fix and it does not work: framer owns that inline style and re-writes it
   from its own motion value after the completion callback has run, so the
   clear is silently undone (measured — the property was back to
   `inset(0%)` on the next commit). Animating `--wipe` instead leaves framer
   writing a VARIABLE, which no stylesheet has to fight, and lets the
   stylesheet decide whether a clip exists at all: `.cell[data-wiping]`
   carries it, and Tile drops that attribute when the wipe lands. See
   Discover.module.css.

   THE `round` IS DELIBERATELY ABSENT. The visible corner belongs to
   VenueCard's .cardSurface INSIDE this box, so a square clip only ever cuts
   at or outside a corner the reader can see.

   WHAT THE OLD ENTRANCE WAS, kept because it was the page's most elaborate
   and worth having on record: rows alternated direction, each row
   travelling as ONE rigid unit from 110vw past its own edge — far enough
   that the outermost column started off-screen — with a 0.08s delay per
   row, and an exit that ran the same paths in reverse, faster.

   `exit` HOLDS THE OPEN STATE rather than reversing the wipe. The only
   thing that unmounts this list is a route change, and a grid re-clipping
   itself shut under a page transition is a second animation competing with
   the transition's own. */

/* ══ THE SWEEP'S THREE NUMBERS, IN ONE PLACE ══
   They were inline and scattered, which is how a retune ends up half-applied
   — the arithmetic is quoted in two other comments and paced by the probe.

   SLOWED TWICE AT THE USER'S INSTRUCTION: 0.72 / 0.13 / 0.05 first to
   0.92 / 0.26 / 0.11, then to the values below. Both passes put the weight
   on the COLUMN step for the reason the next paragraph gives.

   THE COLUMN STEP IS THE ONE THAT MATTERS, and the seating arithmetic is
   why. Eight cards at GRID_COLS = 4 is TWO rows, so the row step is spent
   exactly ONCE (row index tops out at 1) while the column step is spent
   three times. The wave the reader actually watches crossing the grid is
   therefore 3×COL + 1×ROW, and raising the row step alone would barely move
   it. Measured before this change: cards landed 83–92ms apart across a row
   and 209ms apart between rows, exactly as the steps predict.

   THE SPREAD IS THE FEEL, and it is worth tracking as a FRACTION OF THE
   CARD rather than in seconds. First card to last is 1×ROW + 3×COL = 0.74s
   against a 0.92s card, so the wave is about four-fifths of a card wide and
   a plate is still opening when the last one starts. The history: 0.28s
   (under a third of a card) read as too fast, 0.59s (two-thirds) was still
   too fast, 0.74s is where it sits. Below about half a card the grid stops
   reading as a cascade and starts reading as one block arriving.

   THE ROW STEP STILL LEADS THE COLUMN STEP, by a bit over 2:1, so a row
   reads as a band opening rather than as four separate cards. Preserve that
   ratio if these move again.

   The arrival closes at GRID_LEAD_S + 1×ROW + 3×COL + DURATION
   = 0.26 + 0.32 + 0.42 + 0.92 ≈ 1.92s, against the lede's ≈1.41s. The row
   term is ×1 and not ×3 because of the two-row seating above — an earlier
   version of this note had it as ×3 and overstated the close by 0.4s.

   THE TOTAL DOES NOT GROW ON NARROW SCREENS. GRID_COLS is a constant 4 even
   where the CSS grid sets one column, so the delay pattern stays two groups
   of four at every width — see the note at GRID_COLS. */
const WIPE_DURATION_S = 0.92;
const WIPE_ROW_STEP_S = 0.32;
const WIPE_COL_STEP_S = 0.14;

const cellVariants = {
  hidden: { "--wipe": "100%" },
  show: (c: { d: number }) => ({
    "--wipe": "0%",
    transition: {
      duration: WIPE_DURATION_S,
      // --ease-entrance, cubic-bezier(.22,1,.36,1), as framer's array form
      ease: [0.22, 1, 0.36, 1],
      delay: c?.d ?? 0,
    },
  }),
  exit: { "--wipe": "0%" },
};

/* ══ PARALLAX INSIDE THE FRAME ══
   The photograph travels slower than the card holding it, so the grid gains
   depth as it crosses the viewport. The card itself never moves — this is
   entirely inside the plate.

   THE PAN IS A FRACTION OF THE PLATE, NOT A COUNT OF PIXELS, and that is
   the only version of this that is correct at every width.

   The pan slides the picture inside a box that clips it, so the picture has
   to be bigger than the box or the travel drags the frame's own edge into
   shot. A scale of `s` on a plate `H` tall leaves (s−1)·H/2 of overscan
   above and the same below, so the travel is safe exactly while

       PAN ≤ (OVERSCAN − 1) · H / 2      i.e.  RATIO ≤ (OVERSCAN − 1) / 2

   With OVERSCAN 1.07 the ceiling is 0.035, and 0.024 spends 69% of it —
   margin at EVERY size, because both sides of the inequality now scale with
   H. A fixed pixel pan cannot do that, and quietly fails small: measured, a
   9px pan against these plates was fine at 1440 (H 271, room 9.5px) and
   overran by 2.6px at 1000, where the four-up grid renders an H of 184 and
   only 6.4px of room. Every card at that width showed its own frame edge.
   The taller the plate the further the picture travels, which is also the
   right look — a big plate that moves as little as a small one reads stiff.

   1.07 IS ALSO A CROP, and worth stating: the plate shows ~3.4% less of
   each photograph than it did. That is the price of the effect, not an
   oversight — a pan with no overscan is the version that shows the frame. */
const PHOTO_OVERSCAN = 1.07;
const PHOTO_PAN_RATIO = 0.024;

/* HOW LONG THE PICTURES WAIT FOR THE TYPE.
   The chapter reads top-down — label, sentence, then the grid — and all
   three now hang off one `inView`, so the order has to be spent as delay
   rather than assumed from the markup. The head's two heading words leave
   at 0 and 0.09s and the lede starts at 0.1s; the grid holding this long
   puts the first card's wipe under the lede's fourth or fifth word, which
   is late enough to read as a consequence of the sentence and early enough
   that the band is never just standing there.

   The arrival's full arithmetic lives on the WIPE_* block above, which owns
   the steps and the duration; the lede lands at 0.1 + 14×0.04 + 0.75 ≈ 1.41s
   and the last plate at ≈1.92s, so the type settles first and the pictures
   go on arriving behind it. */
const GRID_LEAD_S = 0.26;

/* ══ THE MORPH ══════════════════════════════════════════════════════
   Quick, interruptible mid-flight (a spring keeps its velocity when
   retargeted), and now carrying a SMALL bounce where it used to carry none.

   THE ZERO IS SUPERSEDED, NOT FORGOTTEN. The note that stood here read: "a
   panel that overshoots its own edges reads as elastic, not as glass," and
   that is still true of a large overshoot. What it got wrong is that a
   critically damped spring has no settle at all — it decelerates into its
   target and simply stops, which is the one thing that reads as software
   rather than as an object. 0.06 is roughly a 94% damping ratio: the plate
   passes its final edge by well under a pixel at these travel distances, so
   there is nothing to SEE overshooting, and what the eye gets instead is the
   arrival taking a moment to finish. That is the difference the request was
   asking for.

   0.55s rather than 0.62s for the same reason — the perceived length of a
   spring is dominated by its tail, and adding a settle to a 0.62 made the
   whole thing feel slow. The two changes are one change.

   ⚠️ NOT for anything that lands against a hard edge (a drawer on a
   viewport wall, a sheet at the top of the screen). This plate lands in open
   air on both axes, which is what makes even a sub-pixel overshoot safe. */
const EXPAND_SPRING = { type: "spring", duration: 0.55, bounce: 0.06 } as const;

/* ── HOW THE GRID GETS OUT OF THE WAY ──
   The room lights drop AND the shelf steps back. Doing both is the point,
   and neither half is sufficient: the backdrop alone flattens the grid into
   a wallpaper, and the recede alone leaves eight bright photographs
   competing with the one the reader pressed.

   THE PRESSED CELL IS EXEMPT, and that is load-bearing rather than
   aesthetic. Framer measures the tile's rectangle again when the expansion
   unmounts, to fly the plate home; a transform on the cell at that moment is
   a transform on the measured box, and the card would land scaled-down and
   offset. `.cell[data-open]` is how the stylesheet is told to skip it.

   NO BLUR ON THE SIBLINGS. The comp had one and it is not worth what it
   costs here: this grid is eight full-bleed photographs and several of them
   are running video on hover, so an animated `filter` on all of them is a
   per-frame re-raster of most of the viewport. Under a 55% dim the blur was
   contributing almost nothing that the scale and the opacity were not.

   THE STAGGER IS BY DISTANCE FROM THE PRESSED TILE, in grid steps rather
   than in list order — the wave has to travel outward from where the finger
   went down, and |i − active| would run it along the DOM instead. */
const RECEDE_STEP_S = 0.028;

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

  /* The title's own switch. Reduced motion gets "on" from the first paint,
     so the words never depend on `inView` ever becoming true — a reader who
     lands mid-page with the section already behind them still reads a
     heading. (The stylesheet un-parks them under the same query too; this
     is the half that does not wait for a media query to be evaluated, which
     matters because `useReducedMotion` is null on the server.) */
  const titleOn = !ordinaryTitle || inView;

  /* THE WARMING IS WELDED TO THE ARRIVAL, which is what the note above the
     latch asks for: one flag, set once, and the beat before the colour
     moves lives in the stylesheet's transition-delay rather than in a
     timer here. A one-way latch — re-entry cannot re-light a lit word. */
  useEffect(() => {
    if (inView) setLit(true);
  }, [inView]);

  /* ══ THE PANNING LOOP ══
     Writes --photo-pan on each plate seat; VenueCard's .photo consumes it.
     See PHOTO_OVERSCAN above for why the base scale goes on at the same
     time and what bounds the travel.

     WHY A CSS VARIABLE AND NOT A PROP. VenueCard is shared with
     /restaurants, which wants none of this. A variable that defaults to a
     no-op lets the card declare that it CAN pan without RestaurantsShowcase
     changing by a pixel, and keeps the per-frame write off React entirely —
     eight state updates a frame is not a thing to do.

     WHY rAF AND NOT A SCROLL LISTENER. Lenis drives scroll on this site, so
     a `scroll` event fires at its cadence rather than the compositor's; a
     frame callback reads the rects the frame is actually about to paint.

     THE LOOP ONLY RUNS WHILE THE SECTION IS ON SCREEN. Idle it costs
     nothing, and the observer that gates it is separate from the one-shot
     entrance observer above — this one has to keep firing, in both
     directions, for the life of the page.

     THE `raf = 0` ON ENTRY IS LOAD-BEARING. Cancelling an id without
     clearing it leaves `raf` truthy forever, and the `if (!raf)` guard in
     start() then refuses to ever restart the loop — the parallax dies the
     first time the section leaves the viewport and never comes back. */
  useEffect(() => {
    if (reduce) return;
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;

    const seats = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-plate]"),
    );
    if (!seats.length) return;

    for (const seat of seats) {
      seat.style.setProperty("--photo-base", String(PHOTO_OVERSCAN));
    }

    let raf = 0;
    let live = false;

    const paint = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const seat of seats) {
        const r = seat.getBoundingClientRect();
        /* +1 when the plate's centre sits at the top of the viewport, −1 at
           the bottom, 0 as it crosses the middle. Normalising by half the
           viewport PLUS half the plate means a tall card on a short screen
           still reaches both ends of the travel instead of clipping to a
           fraction of it. */
        const t =
          (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2);
        const clamped = t < -1 ? -1 : t > 1 ? 1 : t;
        /* the picture drifts DOWN inside the frame as the frame rises, so
           it covers less ground than the card does — which is what reads as
           the plate sitting behind the window rather than in it */
        // the plate's own height sets the travel — see PHOTO_PAN_RATIO
        seat.style.setProperty(
          "--photo-translate",
          `0 ${(clamped * r.height * PHOTO_PAN_RATIO).toFixed(2)}px`,
        );
      }
      if (live) raf = requestAnimationFrame(paint);
    };

    const start = () => {
      if (live) return;
      live = true;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const stop = () => {
      live = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const gate = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      // a margin either side so the pan is already correct on the first
      // frame the section is actually visible, not catching up on it
      { rootMargin: "20% 0px 20% 0px" },
    );
    gate.observe(section);

    return () => {
      gate.disconnect();
      stop();
      for (const seat of seats) {
        seat.style.removeProperty("--photo-translate");
        seat.style.removeProperty("--photo-base");
      }
    };
  }, [reduce]);

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
            full 115% CLEAR of it — above it now that the head descends, and
            below it before — so the word's VISIBLE rect is empty; and an
            IntersectionObserver intersects its target against the clip rect
            of every ancestor, not just the viewport. A `whileInView` on the
            word therefore reports a 0 ratio forever and `amount: 0.5` can
            never be met: the observer path could not raise the title at all.
            It went unnoticed for a long time because a first visit never
            used it — the retired assembly owned the title off its step
            machine, and this was only reached by a reader coming BACK to
            the homepage. Measured then: `translateY(109.7px)`, i.e. still
            parked, with the line sitting whole in a 900px viewport. (That
            reading was taken while the park was +115%; it is -115% now and
            the trap is identical — an empty rect is an empty rect whichever
            side of the clip it sits on.) It is now the ONLY path, so the bug
            would be on every visit.
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
          {/* THE TWO WORDS, each in its own clip, rising on the section's
              arrival. `data-on` is driven by `inView` — the SAME latch the
              grid takes — which is the entire point: before this the
              heading was flat text and the plates were a no-op variant, so
              there was no order to the chapter, only two things that
              happened to be there. Now the words leave first and the plates
              wipe open behind them off one observer.

              THE SPACE IS A REAL CHARACTER. `.titleSpace` sets font-size: 0
              so it has no advance and `.titleLine`'s margin stays the only
              owner of the visible gap — but it keeps the h2's textContent
              reading "Our restaurants" rather than "Ourrestaurants" for
              find-in-page, selection, copy and any AT falling back to
              content. Same fix, and same reasoning, as SplitWords' .space.

              --tw-i is the word's index, and one declaration in the
              stylesheet turns it into the stagger. */}
          <span className={styles.titleText}>
            <span className={styles.titleLine}>
              <span
                className={styles.titleWord}
                style={{ "--tw-i": 0 } as CSSProperties}
                data-on={titleOn ? "on" : undefined}
              >
                Our
              </span>
            </span>
            <span className={styles.titleSpace}> </span>
            <span className={styles.titleLine}>
              <span
                className={`${styles.titleWord} ${styles.titleRise}`}
                style={{ "--tw-i": 1 } as CSSProperties}
                data-on={titleOn ? "on" : undefined}
                data-lit={lit ? "on" : undefined}
              >
                restaurants
              </span>
            </span>
          </span>
        </h2>
        {/* ── THE DISPLAY LINE BUILDS AGAIN, at the user's instruction ──
            It was <SplitWords>, then it was flat text "at the user's
            instruction", and it is <SplitWords> again for the same reason
            the first note gave: at this size it has type worth building.
            The intervening flat version is not worth reconstructing.

            IT TAKES `on`, NOT whileInView, AND THAT IS THE WHOLE POINT.
            SplitWords' own observer would be a THIRD trigger in a chapter
            that now has exactly one — the heading's masks, this line and
            the grid's wipe all hang off `inView`, so the chapter arrives in
            an order instead of as three things that happen to be nearby.
            An independent observer here would fire on this paragraph's own
            rect and un-sequence the head from the pictures under it, which
            is the defect the whole pass exists to remove.

            THE LEAD IS SPENT ON THE TYPE. This starts a beat after the
            label and the grid waits GRID_LEAD_S behind it, so the chapter
            reads top-down: name, sentence, pictures. See GRID_LEAD_S.

            ⚠️ THE MASKS CHANGE THE MEASURE, so `.lede`'s max-width is not
            free of this. SplitWords sets the word gap as a 0.24em
            margin-right rather than a natural space (~0.25–0.28em on this
            face), so a line of masks is fractionally NARROWER than the same
            line of plain text, and .lede's measure was tuned to break at
            the clause boundary — after "stores,". Measured after this
            change: the break still lands there at every width in the sweep.
            Retune the measure and check that break, not just the height. */}
        {/* ⚠️ `down`, AT THE USER'S INSTRUCTION — this line comes down out of
            its masks, the way the label above it now does. It is the shared
            component's prop rather than a flip inside it: SplitWords is the
            site's word-mask grammar and /about, /careers and the deck's nine
            chapter bodies all still build upward. The magnitude is untouched
            (the mask's padding is symmetric); only the sign moves. */}
        <SplitWords
          as="p"
          className={styles.lede}
          text="Explore our family of restaurants and stores, where tradition is served with a modern twist."
          on={inView}
          delay={0.1}
          down
        />

        {/* THE MIDDLE HAIRLINE. It closes the head and opens the grid, which is
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
          /* THE SHELF STEPS BACK while a card is open — see RECEDE_STEP_S.
             It is an attribute on the LIST and a CSS transition on the
             cells, not a framer animation on each of them: eight springs
             that all do the same thing are eight animation loops, and this
             one has no state worth interpolating in JS. Off under reduced
             motion, where the backdrop does the whole job by itself. */
          data-dimmed={!reduce && active ? "on" : undefined}
          variants={{ hidden: {}, show: {}, exit: {} }}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          exit="exit"
        >
          {ITEMS.map((it, i) => {
            /* WHEN THIS CELL'S WIPE STARTS. Rows lead, columns follow
               within a row, so the grid opens the way the reader is already
               travelling — left to right, top to bottom.

               THE X OFFSET IS GONE. It was the slide's departure edge and
               the wipe has no departure: nothing travels, so there is no
               direction to alternate and no risk of two rows crossing. The
               row arithmetic survives it because the ROW is still what the
               eye groups by.

               STILL DIVIDING BY GRID_COLS, and that constant still has to
               be kept in step with .grid's column count (four up at
               >=981px) — a wrong count here does not cross anything any
               more, it just scrambles the reading order into a shape the
               grid does not have.

               THE COLUMN STEP IS THE SMALLER OF THE TWO, which is what keeps
               a row reading as a band opening rather than as four separate
               cards — the thing the old per-row-only delay got right. Both
               steps and the duration live on WIPE_* above; see that block
               for why they are the size they are.

               EVERY CELL CARRIES GRID_LEAD_S ON TOP, which is what makes the
               chapter read top-down rather than all at once. */
            const motionCustom = reduce
              ? { d: 0 }
              : (() => {
                  const row = Math.floor(i / GRID_COLS);
                  const col = i % GRID_COLS;
                  return {
                    d:
                      GRID_LEAD_S +
                      row * WIPE_ROW_STEP_S +
                      col * WIPE_COL_STEP_S,
                  };
                })();
            /* HOW FAR THIS CELL IS FROM THE ONE THE READER PRESSED, in grid
               steps — the recede travels outward from the finger, so the
               delay has to be a distance on the LAYOUT and not a distance in
               the array. Null while nothing is open, which is also what
               makes the return journey undelayed: the attribute goes with
               the open state and the cells all come back together. */
            const openIndex = active
              ? ITEMS.findIndex((x) => x.slug === active.slug)
              : -1;
            const step =
              openIndex < 0
                ? 0
                : Math.abs((i % GRID_COLS) - (openIndex % GRID_COLS)) +
                  Math.abs(
                    Math.floor(i / GRID_COLS) - Math.floor(openIndex / GRID_COLS),
                  );
            return (
              <Tile
                key={it.slug}
                item={it}
                index={i}
                motionCustom={motionCustom}
                onOpen={() => setActive(it)}
                open={openIndex === i}
                recedeDelay={step * RECEDE_STEP_S}
              />
            );
          })}
        </motion.ul>

      {/* THE CLOSING HAIRLINE IS GONE, at the user's instruction, and with
          it the last of this chapter's three rules to sit on open cream.
          `.topRule` went first; this was left standing alone under the last
          row of pictures, describing itself as "the partner to .topRule" to
          a partner that no longer existed. What closes the chapter now is
          the seam's own air, which is what Manifesto.module.css argued for
          in the first place: "The gap is the separator." The head's
          .headRule stays — it divides the type from the pictures, which is
          an internal division and a different job. */}

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
  open,
  recedeDelay,
}: {
  item: DiscoverItem;
  /* the tile's place in the grid. It used to be the assembly flight's SEAT
     index; what is left of it is the per-tile stagger the grid reads
     across on, and the `data-plate` attribute the probes measure the
     card's rectangle through. */
  index: number;
  motionCustom: { d: number };
  onOpen: () => void;
  /** this is the tile whose plate is currently expanded. It is EXEMPT from
   *  the recede — see RECEDE_STEP_S: framer re-measures this exact cell to
   *  fly the card home, and a transform on it at that moment is a transform
   *  on the measured box. */
  open: boolean;
  /** seconds this cell waits before stepping back, so the recede travels
   *  outward from the tile that was pressed */
  recedeDelay: number;
}) {
  const reduce = useReducedMotion();
  /* whether this cell is still being wiped open. It starts true so the card
     is clipped shut on the very first paint — including the server's, which
     is what stops eight cards flashing whole and then wiping. */
  const [wiping, setWiping] = useState(true);

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
      /* THE ATTRIBUTE IS WHAT MAKES THE CLIP EXIST. The stylesheet only
         clips a cell while this is on, so dropping it when the wipe lands
         leaves the card with NO clip-path rather than a resting `inset(0%)`
         — which would shear the hover lift and its shadow off at the cell's
         edge forever. See the note on cellVariants for why the clip is
         driven through a variable instead of animating clip-path directly.

         REDUCED MOTION NEVER TURNS IT ON, and takes no variants either, so
         the cards are simply present from the first paint and nothing about
         them waits on an observer that may never fire. */
      data-wiping={!reduce && wiping ? "on" : undefined}
      /* the recede's two hooks. `data-open` is the exemption and carries no
         style of its own; the delay is a custom property because the value
         is per-cell and a stylesheet cannot compute a distance. */
      data-open={open ? "on" : undefined}
      style={{ ["--recede-delay" as string]: `${recedeDelay}s` }}
      variants={reduce ? undefined : cellVariants}
      custom={motionCustom}
      /* `show` is the only state that lands — guarding on it stops an
         interrupted run from un-clipping a cell that is still shut. */
      onAnimationComplete={(definition) => {
        if (definition === "show") setWiping(false);
      }}
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
   swaps the morph for a plain crossfade.

   ═══ THE EXPANSION IS ONE PORTRAIT OBJECT NOW, at the user's instruction.
   It was a TRANSPARENT COLUMN: a 1.32 landscape photo plate with a separate
   cream sheet tucked under it carrying the name, the story, the address and
   the two controls — a picture and then a caption, which is the exact
   arrangement the CARD itself stopped being two passes ago (see the banner
   in VenueCard.tsx). The expansion is the card OPENED, so it is now the
   same object at size: a tall 3:4 portrait, the venue's film running
   full-bleed edge to edge, a ramp seated in the bottom edge, and every word
   and both controls standing ON that ramp.

   WHAT THAT CHANGES STRUCTURALLY, and each one is load-bearing:

   · THE SEAT IS `.expandCard`, NOT THE PLATE. The card is sized from the
     VIEWPORT'S HEIGHT (see the stylesheet) because a portrait card's
     constraint is vertical; the plate is now `inset: 0` inside it. The
     plate used to carry an inline aspect-ratio from PLATE_RATIO so the
     morph could not deform the photograph — that guarantee is gone
     DELIBERATELY, because the two rectangles are now different shapes on
     purpose. See `.expandFrame` for what replaces it.

   · THE MORPH IS AN ASPECT CHANGE, so the media takes `layout` of its own.
     A framer layout projection scales its whole subtree by (sx, sy); from a
     1.32 landscape tile to a 0.75 portrait card those differ by a factor of
     ~1.8, and an uncorrected flight would squash the picture flat and let
     it spring back. `.expandFrame` is a projection node in its own right,
     so it re-renders into the interpolated box each frame and the film
     simply re-crops through the flight instead of stretching.

   · NOTHING THE READER READS IS INSIDE THE MORPH. The mark and the whole
     block are siblings of the plate, at the card's FINAL rectangle from the
     first frame, fading up behind it. Put either inside `.expandMedia` and
     they would be scaled by the same (sx, sy) — type flying in at 1.8:1 and
     correcting itself.

   · THE RAMP IS THE EXCEPTION, AND IT WAS NOT ALWAYS. It sat with the type
     until this pass, at the final rectangle, and that is a defect the rule
     above was hiding: the ramp is not READ, it is the ground the reading
     stands on, so it belongs to the picture and not to the caption.
     Measured at 1440×900 on Belly, it became visible at t≈147ms with the
     plate 0.57 of the way across and 265px NARROWER than the ramp — 42% of
     the ramp painted on the dimmed grid rather than on the photograph, and
     still ≥20px overhanging at ≥0.5 opacity at t≈340ms. Worse than a dark
     slab, because .expandRampBlur's backdrop-filter was blurring the
     NEIGHBOURING TILES it overhung into a pale floating panel.
     It is inside `.expandMedia` now — the morphing box itself, alongside
     `.expandFrame` and not within it — so it is drawn at the plate's
     CURRENT rectangle every frame, over the film, clipped by the plate's
     own radius. A gradient has no intrinsic size, so growing with the card
     is what it should have been doing all along.
     ⚠️ NOT INSIDE `.expandFrame`, WHICH IS THE OBVIOUS PLACE AND IS WRONG.
     The frame is a COUNTER-scale, not a second projection: measured at
     1440×900, the plate's matrix and the frame's are exact reciprocals
     (0.356 × 2.808 = 1.000), so the frame paints at its FINAL 981×552 and
     the plate crops it. That is all the picture ever needed — a crop cannot
     squash — but a ramp pinned to the bottom of that box sits almost
     entirely outside the crop while the plate is small (36px of a 304px
     gradient showing at t=30ms, all of it the transparent beginning), so
     the card would fly with no ground and acquire one on landing.

   · THE RAMP'S TWO LAYERS TAKE THE FADE SEPARATELY, for the reason the
     card's do: `backdrop-filter` samples its nearest backdrop ROOT and any
     ancestor with opacity < 1 becomes one, so a wrapper carrying the fade
     would leave the blur sampling nothing and the colour would snap in at
     the end. They are siblings. Do not wrap them.
     ⚠️ THE MOVE PUTS THEM UNDER ONE MORE ANCESTOR AND THAT ANCESTOR DOES
     TAKE AN OPACITY — measured, not assumed. A `layoutId` morph is a
     crossfade, and framer writes an inline opacity on `.expandMedia` that
     ramps 0.26 → 1 over the first ~130ms of the 550ms flight (`.expandFrame`
     never gets one). So .expandMedia is a backdrop root for that window —
     and harmlessly, because it CONTAINS the photograph and the film, which
     is exactly what the blur is there to sample. A backdrop root only
     starves the filter when nothing is painted under it inside that root,
     which was the wrapper case. The ramp is at ~1% opacity anyway when the
     crossfade ends. ═══ */
function ExpandedCard({
  item,
  onClose,
}: {
  item: DiscoverItem;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  /* THE ACTION IS NOT DERIVED HERE ANY MORE. It was a local `getRestaurant`
     + `primaryAction()` read, with a comment saying the expansion and the
     tile must never disagree about what a reader can do — which is a rule a
     comment cannot enforce. <VenueBlock> does the read once for both. */

  /* THE FULL-BLEED FILM. The same clip the tile wipes open under the
     pointer — one asset, two presentations — and it is not hover furniture
     here: opening the card IS the request for it, so it needs no
     pointer-capability test. Reduced motion declines it and keeps the
     still; a venue with no clip on file (Hoodwood today) does the same.
     Seven of the eight carry one, so this is the ordinary path. */
  const film = !reduce && item.clip ? item.clip : null;

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

  /* ── THE FURNITURE'S ARRIVAL, AND IT IS TWO CLOCKS NOW ──
     IT WAS ONE, deliberately: "one clock for the ramp, the mark, the close
     and the block, so the card 'develops' as one thing rather than in four
     unrelated fades". That reasoning was sound while all four objects sat at
     the card's FINAL rectangle, because then they genuinely were one layer.
     The ramp has moved inside the plate (see the banner), so they are two
     layers now — the picture's ground, and the words on it — and one clock
     was making them share a schedule that only ever suited one of them.

     WHAT EACH CLOCK IS FOR:
       `rampFade`   the ramp, travelling with the plate. EARLY, unchanged at
                    0.12 + 0.26, because it cannot overhang anything any
                    more — it is clipped to the picture at every size. It is
                    what keeps the flying plate from being a bare photograph.
       `furniture`  the mark, the close and the block, still at the final
                    rectangle. LATE.

     WHY THE TYPE MOVED LATE. The old 0.12 + 0.26 put it at full opacity at
     ~0.38s, which was the right instinct — the type must arrive DURING the
     flight, not after it, or the card lands empty and then fills and the
     opening reads as two events. But at the final rectangle "during the
     flight" also means "over the dimmed grid": measured at 1440×900 on
     Belly, the plate is only 0.57 of the way across at t≈147ms when the
     fade begins, and 0.95 of the way across at ~335ms. So the fade was
     spending its whole first half on ink standing off the card — worst at
     t≈186–237ms, and the close button, which rides a corner, was 100%
     outside the plate for the whole of it.
     0.30 + 0.22 finishes at ~0.52s, just under the spring's 0.55s: the type
     is still arriving while the plate is visibly moving, so it is still one
     event, but it starts at travel ~0.95 where there is a card underneath it
     to arrive onto. The ramp is what buys the delay — the plate is no longer
     bare while the type waits, so the wait costs nothing.

     ⚠️ TUNED AGAINST EASE, WHICH IS FRONT-LOADED. cubic-bezier(.22,1,.36,1)
     is at half opacity a quarter of the way through, so 0.30 + 0.22 reads at
     0.5 by ~0.354s (travel ~0.986) rather than at 0.41s. Lengthening the
     duration does not delay the ink; moving `delay` does.

     The exit is quicker than the entrance and carries no delay at all — the
     system responding, not deciding. It is UNCHANGED and shared by both
     clocks: closing runs a ~470ms return against a 0.15s fade, so the ink is
     gone long before the plate is, and there was nothing to fix there. */
  const rampFade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.15, ease: "easeOut" } },
    transition: {
      duration: 0.26,
      ease: EASE,
      delay: reduce ? 0 : 0.12,
    },
  } as const;

  const furniture = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.15, ease: "easeOut" } },
    transition: {
      duration: 0.22,
      ease: EASE,
      delay: reduce ? 0 : 0.3,
    },
  } as const;

  // PORTALED to <body>: the section lives inside .afterHero's z-index: 1
  // stacking context, which would trap ANY overlay underneath the fixed
  // nav (z 80) no matter its own z-index. The portal escapes the trap.
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
        exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }}
        /* THE LIGHTS DROP FIRST. 0.28s against the plate's 0.55s spring, and
           with no delay: the dim is the room acknowledging the press, so it
           has to be underway before the card has gone anywhere. At the old
           0.35s it finished at roughly the same moment the plate landed and
           read as part of the card's arrival rather than as the response to
           the press. */
        transition={{ duration: 0.28, ease: "easeOut" }}
        onClick={onClose}
      />

      <div className={styles.expandCard}>
        {/* ── THE PLATE. The ONLY thing that morphs, and it fills the card:
            the seat above owns the 16:9, this is `inset: 0` inside it. ── */}
        <motion.div
          className={styles.expandMedia}
          layoutId={reduce ? undefined : `card-${item.slug}`}
          style={{
            /* the same token the tile's .cardSurface takes — the morph
               lands on this box, and a flight that changes radius mid-air
               reads as the corner "growing" independently of the card */
            borderRadius: "var(--radius-tile)",
          }}
          transition={EXPAND_SPRING}
          initial={reduce ? { opacity: 0 } : undefined}
          animate={reduce ? { opacity: 1 } : undefined}
          exit={reduce ? { opacity: 0 } : undefined}
        >
          {/* THE COUNTER-PROJECTION. See the banner: tile and expansion are
              deliberately different shapes now, so the flight is a
              two-axis scale and everything inside it would squash. This
              box is a projection node of its own, so it lands in the
              interpolated rectangle each frame and the picture RE-CROPS
              through the flight rather than deforming.
              `layout` is dropped under reduced motion because there is no
              morph to correct — the plate crossfades. */}
          <motion.div className={styles.expandFrame} layout={!reduce}>
            {item.image ? (
              <Image
                // `card`, not `styles` — see the import note: the
                // photograph's rule belongs to the card and moved to its
                // stylesheet
                className={card.photo}
                style={item.focal ? { objectPosition: item.focal } : undefined}
                src={item.image}
                alt=""
                fill
                // the card is height-driven; at its tallest it is ~640px
                // wide on desktop and the full column on a phone
                sizes="(max-width: 700px) 100vw, 680px"
                priority
              />
            ) : (
              <div className={card.fallback} aria-hidden />
            )}

            {/* THE FILM, FULL BLEED — the same muted clip the tile wipes
                open under the pointer, running edge to edge behind
                everything. It sits OVER the photograph rather than
                replacing it, and reveals itself on `playing` and not a
                moment before: the morph starts from a tile showing the
                still, so cutting to an unbuffered <video> would blank the
                card on the exact frame it opens. A clip that never loads
                simply never appears and the photograph is what shipped.
                No React state anywhere in that — this subtree is inside a
                layout projection and a re-render mid-flight is a
                re-measure mid-flight. */}
            {film ? (
              <video
                className={styles.expandFilm}
                // the CDN URL when one is configured; `film` stays the raw
                // path, which is what the record carries and what the tile's
                // hover clip is keyed on
                src={asset(film)}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onPlaying={(e) => {
                  e.currentTarget.dataset.playing = "true";
                }}
              />
            ) : null}
          </motion.div>

          {/* ── THE RAMP, INSIDE THE PLATE AND OUTSIDE THE COUNTER-
              PROJECTION. Both halves of that are measured, and the second
              is the half that is easy to get wrong.
              INSIDE THE PLATE, so it travels: it is the picture's own
              bottom material, not something the reader reads, and at the
              card's final rectangle it was a slab of dark standing off the
              flying plate (see the banner).
              OUTSIDE .expandFrame, because the frame is a COUNTER-scale and
              not a re-projection — measured at 1440×900, the plate's
              matrix and the frame's are exact reciprocals (0.356 × 2.808 =
              1.000), so the frame renders at its FINAL 981×552 and the
              plate simply crops it. A ramp in there would be pinned to the
              bottom of a box that is almost entirely outside the crop:
              36px of a 304px gradient visible at t=30ms, i.e. its
              transparent beginning, and the card would fly with no ground
              at all and gain one at the end.
              Here it is a plain child of the morphing box, so it takes the
              plate's own (sx, sy). A gradient has NO INTRINSIC SIZE — a
              vertical ramp scaled non-uniformly is still the same vertical
              ramp over the same box — which is exactly why this is the one
              thing that may be scaled by the morph.
              LAST, so it paints over the photograph and the film; the type
              is a layer up in .expandOverlay and still sits on top of it.
              The two layers are faded SEPARATELY — a shared wrapper with an
              opacity on it would starve the blur's backdrop. */}
          <motion.div className={styles.expandRampBlur} aria-hidden {...rampFade} />
          <motion.div className={styles.expandRampScrim} aria-hidden {...rampFade} />
        </motion.div>

        {/* ── EVERYTHING THE READER READS. Outside the morph, at the card's
            final rectangle from the first frame — see the banner. Clipped
            to the card's own corner so the ramp cannot square off the
            plate's curve underneath it. ── */}
        <div className={styles.expandOverlay} aria-hidden={false}>
          {/* THE RAMP IS NOT IN HERE ANY MORE — it moved into .expandFrame,
              inside the plate, so it travels with the picture instead of
              waiting at the destination and overhanging it. See the banner.
              What is left in this layer is only what the reader READS. */}

          {/* the crown, exactly as the unpressed card wears it: the venue's
              own lettering top-left on the picture, the credential stuck
              on at the top-right. The close control is the third corner
              object, so the sticker keeps clear of it (see the rule). */}
          <motion.div className={styles.expandCrown} {...furniture}>
            {item.logo ? (
              <span className={styles.expandMark} role="img" aria-label={item.name}>
                <span
                  className={styles.expandMarkInk}
                  style={
                    { "--ov-logo-url": `url(${asset(item.logo)})` } as React.CSSProperties
                  }
                />
              </span>
            ) : (
              // no mark on file (Bunso): the venue's name in the display
              // face does the same job
              <span className={styles.expandWordmark}>{item.name}</span>
            )}

            {item.badge ? (
              <span className={styles.expandSticker} title={item.badgeLabel}>
                <Image
                  src={item.badge}
                  alt={item.badgeLabel ?? ""}
                  width={128}
                  height={128}
                  sizes="128px"
                  draggable={false}
                />
              </span>
            ) : null}
          </motion.div>

          {/* ── THE BLOCK, AND IT IS THE CARD'S BLOCK ──
              <VenueBlock> is the same component the tile prints, so the
              expansion cannot disagree with the card it opened out of: the
              venue's name at 700 with its tagline under it, price and hours
              closing that row, the hairline, then the address and the same
              two pills. It used to be a SECOND design of the same facts —
              the name in the display face, a mono "EST. 1987 · FILIPINO
              FUSION RESTAURANT · ££" strip, no stats, no hairline, a green
              pill and an underlined text link — and the two had already
              drifted apart on the copy (see the banner over there).

              WHAT THIS CARD PASSES THAT THE TILE DOES NOT, and both are the
              extra HEIGHT being spent:
                · `story`, printed as a row ON TOP OF THE RULE. The tile has
                  no room for it and shows the same copy on hover.
                · ONE address line rather than two. `location` is this
                  chapter's single-line form of the address and exists
                  precisely because the card's two-line split is a
                  consequence of a ~163px column, which this card is not.
              `.blockLarge` is the third: the block's own stylesheet carries
              the larger type scale, so the two sizes stay one description
              of one block. */}
          {/* `.blockLarge` IS DELIBERATELY NOT APPLIED ANY MORE. It scaled
              every line of the block up for a big modal — the name to 26px,
              the tagline to 19px, the pills to 44px tall — and that is the
              one thing this card must not do: a pressed card has to look
              like the card that was pressed, in the same faces at the same
              sizes and weights. The expansion earns its room by printing
              MORE (the story, the address, the hours), not by printing the
              same two lines louder. The variant stays in the stylesheet —
              /restaurants or a future full-bleed surface may still want it. */}
          <motion.div
            className={styles.expandBody}
            {...furniture}
            /* THE RISE, AND IT IS NOW DECLINED UNDER REDUCED MOTION — the
               defect the stylesheet's own note flagged and could not fix
               from a stylesheet, because an inline transform from framer
               beats any rule. 10px rather than 16: the type is arriving
               DURING the flight now (see `furniture`), and a rise that ran
               longer than the fade left the block still climbing under a
               plate that had already stopped. Still 10px on the later
               0.30 + 0.22 clock: the rise takes its timing from the same
               transition, so it lands at ~0.52s with the fade, and a longer
               throw over a shorter tween would only make it faster. */
            initial={{
              opacity: 0,
              transform: reduce ? "translateY(0px)" : "translateY(10px)",
            }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{
              opacity: 0,
              transform: reduce ? "translateY(0px)" : "translateY(6px)",
              transition: { duration: 0.15, ease: "easeOut" },
            }}
          >
            <VenueBlock
              item={item}
              /* THE PLATE FORM — story, then place and room, then the
                 hairline, then the name on one baseline with the controls.
                 See the prop's note in VenueCard.tsx; the arrangement is
                 the card's, this page only says which surface it is. */
              plate
              story={item.blurb}
              addressLines={[item.location]}
              /* the venue's own page, which opens the same pages through
                 <MenuOverlay> — the tile sends the reader to exactly the
                 same place, for the reasons set out where it does so. */
              menuHref={`/restaurants/${item.slug}`}
            />
          </motion.div>
        </div>

        {/* the close control — a sibling of the plate rather than a child
            of it, so it is neither scaled by the morph nor buried under
            the overlay's pointer-transparent layer */}
        <motion.button
          ref={closeRef}
          type="button"
          className={styles.expandClose}
          onClick={onClose}
          aria-label="Close"
          {...furniture}
        >
          <svg viewBox="0 0 16 16" aria-hidden focusable="false">
            <path
              d="M3 3 L13 13 M13 3 L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>
      </div>
    </div>,
    document.body,
  );
}
