"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import styles from "./AboutSplit.module.css";
import PillCta from "./PillCta";
import { asset } from "@/lib/media";
import { getRestaurant } from "@/lib/restaurants";

/**
 * The group's story, as a 50/50 split — photograph left, text right.
 *
 * Laid out after the reference: heading and its call to action at the TOP
 * of the text column, a deliberate void, then the reading block low in the
 * column — a paragraph, a row of small prints, and a smaller footnote
 * paragraph under them. The picture carries its own line at bottom-left.
 */

/* WHERE THIS SITS, AND WHY IT IS ON THE HOME PAGE.
   /about already opens with a long scroll-scrubbed sequence of its own —
   "About Us" centred, the two words travelling apart, a film opening in the
   gap and growing to fill the screen. That is deliberate, hand-built work
   and this would either replace it or fight it.
   The home page, by contrast, had NO About presence at all: the AboutIntro
   chapter was removed, then the story strip's "Learn more about us" went
   with the masthead rewrite, leaving no editorial route to the group's
   story whatsoever. This fills exactly that hole. */

/* THE HEADING SAYS WHAT THE GROUP BELIEVES, not what it is.
   It read "A London family, cooking since 1987" — a label, and one whose
   two facts are both already on this screen: the masthead above says London
   and Est. 1987, and the caption on the photograph says Camden 1987. It was
   the third telling of the same thing.
   Hospitality-as-inheritance is the claim underneath the whole section, and
   it is what the paragraphs below actually elaborate. */
const HEADING = "Everything we know about hospitality, we learned at home.";

/* THE PICTURE. Third choice, and the pool is now empty.
   omar.jpg was a 16.5MB single portrait illustrating "Chef Omar" beside a
   sentence about a family. careers-team.jpg was rejected. This is the last
   unused photograph in public/images at a sane weight (221KB) — everything
   else is either a venue hero (all seven are the Discover cards, one
   chapter above), one of the ten `ourrestaurants` prints (eight in the
   story band, two in the doors below), or a multi-megabyte source.
   A FOURTH CHANGE NEEDS A NEW ASSET, or a swap out of the story band. */
const PORTRAIT = "/images/careers-hero.jpg";

/* THE PANEL IS A LOOPING CLIP NOW, with the photograph kept as its poster
   and as the reduced-motion still.

   WEIGHT IS THE STANDING CONSTRAINT ON THIS SLOT, whatever fills it. The
   panel has held three films now — tile-guanabana.mp4 (2.8MB), then
   mamasons-hero.mp4 (25.6MB), now this — on a page that already carries
   eight band prints and three doors. Whatever comes fourth: check the
   megabytes before the content, and run anything over ~5MB through
   scripts/compress-media.mjs first. */
/* about-big.mp4 IS THE PANEL'S FILM, at the user's instruction — and it is a
   COMPRESSED DERIVATIVE, not the file that was handed over.
   The source is public/videos/aboutbig.mov: 12.9MB, h264 1080×1920, with a
   pcm_s24le audio track. That track is 3.5MB of uncompressed sound shipped
   to an element that is `muted`, and Chromium ships no decoder for PCM in a
   QuickTime container — so pointing at the .mov directly is a gamble the
   weight argument already told us not to take.
   Through the house recipe (scripts/compress-media.mjs: `-an`, scale to a
   1920 long edge, x264 preset slow crf 24, +faststart) it is 5.0MB, and
   1080 wide still has room over a frame that renders around 660.
   THIS IS THE DERIVATIVE THE PREVIOUS NOTE ASKED FOR. The panel was
   mamasons-hero.mp4 at 25.6MB — "by far the heaviest thing on this page",
   with "a compressed derivative (~3–5MB at this display size)" named as the
   fix. It is now a fifth of that, and no longer this page's heaviest asset.
   ⚠️ THE .mov IS STILL IN public/videos AND STILL DEPLOYS. Nothing reads
   it; move it out of `public/` and the page stops shipping 12.9MB nobody
   fetches. */
const VIDEO = "/videos/about-big.mp4";

/* ── AND IT IS NOT FETCHED UNTIL THE CHAPTER IS APPROACHING ──
   The film used to carry `preload="metadata"`, above a comment claiming that
   kept "the frames off the wire until something asks to play". MEASURED
   against the production export (scripts/probe-about-film-gate.mjs, cold
   pass), that claim was WRONG IN BOTH DIRECTIONS and worth stating precisely,
   because the wrong half of it is the half that looks alarming:

     · `metadata` does NOT mean the header alone. Chrome opened one
       open-ended range on about-big.mp4 at 1.3s — with the chapter still
       2,606px below a 900px fold — and took the moov atom plus the first
       0.81 seconds of frames: 393,216 B written by the server, 265,907 B
       actually consumed by the client. Frames, on the wire, for an
       aria-hidden decoration most readers never reach.
     · It is NOT the 5.0MB it first appeared to be. That number is an
       artefact of summing `content-length` across a `bytes=0-` response the
       client abandoned: the server truthfully announced 4,985,905 bytes
       remaining, and the client took half a megabyte of them and hung up.
       See the probe's own banner — it now counts what moved, not what was
       promised.

   SO THE COST IS ~0.4MB AND NOT ~5MB, AND IT IS STILL WORTH NOTHING HERE.
   Every other deferred film on this site already costs exactly zero until it
   is wanted: Reservations' backdrop (VideoBackdrop's warm gate), the venue
   cards' hover clips (no `src` at all until a pointer arrives), the hero's
   second clip (promoted at WARM_AT). This panel was the last `preload
   ="metadata"` on the site — the one place still paying a fraction of a
   megabyte for a picture the reader may never scroll to.

   150% OF THE VIEWPORT, WHICH IS THE HOUSE NUMBER AND NOT A NEW ONE. It is
   VideoBackdrop's WARM_MARGIN, chosen there for the same job and reasoned out
   at length in that file's banner: at a 900px fold this starts the fetch
   1,350px out, which is a couple of seconds of ordinary scrolling, and the
   film only needs its opening frames by the time the entrance hands over.
   A partly-buffered film is not a failure mode either — `play()` starts when
   it can and the poster is the same photograph, so the panel is never empty.

   ⚠️ THE OBSERVER WATCHES THE SECTION AND NOT THE FILM, AND THAT IS NOT A
   PREFERENCE. `.mediaFrame` animates a clip-path, and a clip-path zeroes its
   own subtree's intersection ratio — the panel is clipped to nothing until
   `swept` latches, so an observer on the <video> would report 0 forever and
   the film would never be fetched at all. The section is never clipped. */
const FILM_WARM_MARGIN = "150% 0px";

/* TWO LINES, DELIBERATELY. The caption was one sentence ("One room in
   Camden, 1987."); it is now a statement and its location, set larger, so
   it reads as the picture's title rather than as a note under it. The break
   is hard-coded rather than left to wrapping — the two halves are doing
   different jobs and a measure-dependent break would sometimes put "Camden"
   on the first line. */
const PORTRAIT_LINE = ["Where it began.", "Camden, 1987."];

/* THE COPY. Two paragraphs doing different jobs, which is why the second is
   set smaller and lighter (see .paraFine): the first is what the group
   believes, the second is the record that backs it. The reference does the
   same — an argument, then a quieter elaboration under the prints.
   Every fact is already on the site: the 1987 Camden kitchen and Chef Omar
   are in /about's metadata and structured data, the three kitchens are the
   site's own description. No venue count — TODOS.md item 7 still records
   "seven rooms vs eight tiles" as unreconciled. */
const PARA_LEAD =
  "We cook the food we grew up on, for people we treat like family. A table you are not hurried from, a room that is easy to be in, and a plate that tastes like somebody's home. It is the only way we have ever known how to do this, and it is the reason the same faces come back year after year.";
const PARA_FINE =
  "From one Camden kitchen in 1987 to a family of dining rooms across North London - Filipino, Filipino-Japanese and Caribbean, each with its own character - still run by the same family, and still led by Chef Omar. Every room keeps its own menu, its own regulars and its own way of doing things. What they share is the standard they are held to, and the people who set it.";

/* ══════════ THE THREE PRINTS DO SOMETHING NOW ══════════
   They were decorative. Each one is now a door into one of the three
   kitchens the paragraph beneath them names, which is the cheapest possible
   way to make a visual footnote earn its place: the copy says "Filipino,
   Filipino-Japanese and Caribbean" and the pictures immediately above it
   are those three, in that order, each linking to a room that serves it.

   ONE VENUE STANDS FOR EACH KITCHEN rather than a filtered index, because
   /restaurants has no cuisine filter to link to — building one to serve
   three thumbnails would be the tail wagging the dog. The venue chosen for
   each is the clearest example of its kitchen in lib/restaurants.ts.

   THE VISIBLE LABELS ARE GONE at the user's instruction, and that costs
   something worth stating rather than burying. Nothing about a 148px
   photograph announces that it is a link, and the label was the only
   sighted affordance these had. What is left is a hover lift and a cursor
   — both of which require the reader to already be pointing at the picture
   to discover it, and neither of which exists on touch.
   Screen-reader users are unaffected: each link still carries a real
   accessible name ("Filipino — see the restaurant"), so the target is never
   announced as a filename. The loss is purely visual discoverability. If
   these turn out to go unclicked, the label is the first thing to put back. */
const DOORS = [
  { slug: "bintang", label: "Filipino", src: "/images/ourrestaurants/print-09-web.jpg" },
  { slug: "ramo", label: "Filipino-Japanese", src: "/images/ourrestaurants/print-10-web.jpg" },
  { slug: "guanabana", label: "Caribbean", src: "/images/manifesto/group-web.jpg" },
];

/* Each door's destination, read from the canonical record rather than
   written out here — the slug is the only thing this file should have to
   know about a venue. `/restaurants` is the floor: a venue with no site of
   its own still has the index, and a door that opens onto nothing is worse
   than one that opens onto the grid it belongs to. */
const SITE_BY_SLUG: Record<string, string> = Object.fromEntries(
  DOORS.map((d) => [d.slug, getRestaurant(d.slug)?.website ?? "/restaurants"]),
);

/* ══════════ THE ENTRANCE ══════════
   This chapter had NO entrance at all — the only motion in the file was the
   doors' hover lift. What follows is "the frame opens, then the two titles
   answer each other", and both halves of that phrase are load-bearing.

   THE PICTURE LEADS, AND THE TYPE DOES NOT SPLIT INTO WORDS. This is the
   one decision to read before changing anything here. The chapter directly
   above is Manifesto (see Experience.tsx for the order), which already
   spends the eyebrow's spring pop and the masked WORD-BY-WORD statement.
   (It spent the band's stagger wave too, until StoryStrip was removed from
   that chapter — the argument survives without it.) A third word-mask
   reveal in a row stops reading as a house grammar and starts reading as a
   tic — so the heading
   arrives as a SINGLE BLOCK and the caption as TWO LINE MASKS, and the
   gesture carrying the chapter is the wipe on the photograph instead.
   If someone later "upgrades" the heading to SplitWords, this is what they
   are undoing.

   THE TWO TITLES SHARE A BEAT. The stylesheet calls .mediaLine and .heading
   "a title facing a title across the split" and sets them from one shared
   --split-title-size so they cannot drift. They start together at 0.55s for
   the same reason: the facing pair is the idea, and staggering them would
   make one the caption of the other. */

// the site's shared enter curve, in the form Motion wants it. Same shape as
// --ease-entrance in globals.css, written twice because neither runtime can
// read the other's spelling (the precedent is SplitWords' EASE/EASE_CSS).
const EASE = [0.22, 1, 0.36, 1] as const;

/* WHEN THE PICTURE STARTS, and the one place to change it.
   The panel's arrival is four animations, not one — the mask (MEDIA), the
   counter-drift under it (DRIFT), the card shadow around it (MOUNT) and the
   caption's two line masks (LINE) — and the last two are timed AGAINST the
   sweep rather than against the gate. Their notes derive +0.4s and +0.55s
   from where the front-loaded curve has uncovered the frame, so those two
   offsets are the load-bearing numbers and this is only where the cluster
   begins. Moving it late (0.1 → 0.45, at the user's instruction: the
   picture was arriving on top of the gate) carries all four together and
   keeps every derivation intact. Change this, not the four call sites. */
const MEDIA_IN = 0.45;

/* REDUCED MOTION IS ONE VARIANT FOR EVERYTHING, and deliberately carries no
   delays. The house pattern is Reveal's 0.4s fade, which keeps its `delay` —
   correct there, because Reveal is one element answering for itself. Here a
   preserved stagger would replay the whole 2s choreography as a sequence of
   fades, i.e. the reader who asked for less movement still waits out the
   timing. Everything simply arrives. */
const FADE: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

/* THE RULE NO LONGER DRAWS. It used to be the chapter's curtain-up — a
   `scaleX: 0 → 1` from the left edge, first thing in the sequence — and it
   is removed at the user's instruction: the hairline simply IS there, like
   the photograph beneath it and the band's own pictures above it. The
   variant is deleted rather than left as an identity, and the element is a
   plain <div> again (a motion.div with no variants would still be a
   projection node for nothing). `transform-origin` went from .rule with it;
   see the note there. */

/* THE CAPTION'S TWO LINES, each out of its own clip.
   145% is not a round number — it is derived from the 0.3em the mask is
   padded by to protect descenders ("Where it began." has a `g`), exactly as
   SplitWords derives it. Move one and move the other.
   +0.55s AFTER THE SWEEP IS A HAND-OFF, and it is the offset the sweep's
   direction buys. The mask runs 1.15s from MEDIA_IN on --ease-entrance,
   which is heavily front-loaded: measured on the real render it has
   uncovered 90% of the frame 0.35s in, so the band this caption sits in —
   the bottom fifth — is
   clear well before this fires. Both lines land onto a picture that is
   already there, with no clip edge to ride and none to avoid, while the
   sweep's tail and the drift's settle are both still visibly moving.
   THAT IS ONLY TRUE WHILE THE SWEEP RUNS DOWN. Reverse MEDIA and this
   number is wrong by most of the duration, because the caption's band is
   then the FIRST thing uncovered rather than the last. */
const LINE: Variants = {
  hidden: { transform: "translateY(145%)" },
  shown: (i: number) => ({
    transform: "translateY(0%)",
    transition: { duration: 0.7, ease: EASE, delay: MEDIA_IN + 0.55 + i * 0.08 },
  }),
};

/* ══════════ THE PANEL OPENS AGAIN ══════════
   THE PICTURE MOVES, at the user's instruction, and this is the third time
   this decision has been made — so what follows is the argument, not just
   the values.

   IT CARRIED A BOTTOM-UP WIPE, then a wipe plus an inner drift, then
   nothing at all. What comes back is neither of those: the sweep runs DOWN,
   and the reason is the caption. `.mediaLine` sits at the BOTTOM of the
   frame, so a downward sweep uncovers the room first and the words last and
   the caption's own line masks land on a picture that has finished
   arriving. A rising wipe has to drag that type through a travelling clip
   edge, which is what the old implementation was contorted around and what
   LINE's note still describes as "timed so the words landed on a picture
   that was already ~60% uncovered".

   TWO ELEMENTS, NOT ONE, AND THE SECOND ONE IS THE WHOLE POINT. A mask on
   its own is a shape changing size. The plate moves AGAINST the mask and
   keeps moving for half a second after the edge has gone, so the panel
   settles rather than stops — a camera coming to rest rather than a curtain
   finishing. That is the difference between the gesture reading as
   professional and reading as editorial, and it costs one wrapper.

   ⚠️ THE SCALE IS NOT A TASTE VALUE — IT IS SOLVED AGAINST THE TRAVEL.
   `.mediaDrift` fills its frame exactly, so a bare `translateY(-4%)` would
   pull its BOTTOM edge 4% clear of the frame and leave a strip of
   --placeholder under the photograph for the whole of the move. The scale
   has to overhang the travel on both sides:

       overhang = (S − 1) / 2      must be ≥ the translate

   4% of travel therefore needs S ≥ 1.08, and 1.1 is that with a margin.
   Change one of these two numbers and re-solve the other. */
const DRAWER = [0.32, 0.72, 0, 1] as const;

/* THE MASK. `clipPath` and not a scaleY on an overlay: an overlay would
   have to be painted in the ramp's colour and would then need its own fade,
   and the site already has an element whose whole job is that edge.

   ⚠️ IT IS ON `.mediaFrame` AND NOT ON `.media`, AND THAT IS THE SAME TRAP
   DOOR_WIPE's note records: `clip-path` clips an element's ENTIRE
   rendering, box-shadow included, and it stays on the element as an inline
   style once the animation rests. Wiping `.media` directly would clip the
   card shadow off the picture permanently. `.mediaFrame` exists for exactly
   this and for nothing else — it was deleted when the animation came out
   and it comes back with it.

   BOTH KEYFRAMES SPELL EVERY SIDE THE SAME WAY. `inset(0% 0 100% 0)` and
   `inset(0% 0 0% 0)` interpolate; a mismatched unit count does not. */
const MEDIA: Variants = {
  hidden: { clipPath: "inset(0% 0 100% 0)" },
  shown: {
    clipPath: "inset(0% 0 0% 0)",
    transition: { duration: 1.15, ease: EASE, delay: MEDIA_IN },
  },
};

/* ══════════ THE HEADING ARRIVES A CHAPTER EARLY AND TRAVELS ══════════
   At the user's instruction. The heading is present at the BOTTOM of the
   manifesto chapter, one section above where it belongs; it then lags the
   page as the reader scrolls — moving down the document while everything
   else moves up past it — and comes to rest in the About column, which is
   where it renders in the first place. When its top edge draws level with
   the picture's top edge, the picture starts its sweep.

   ⚠️ IT IS ONE ELEMENT WITH A TRANSFORM, NOT A COPY IN FLIGHT, and that
   choice is the whole reason this is short. The obvious build is a second
   heading portalled into the manifesto and cross-faded into the real one at
   the boundary — which means measuring the landing seat every frame, and a
   landing seat that is ITSELF moving (the About section is scrolling while
   the flight lands) is how these come apart. Here the heading is always in
   its own column, in normal flow, semantically inside the section it
   belongs to. A transform lifts it out and releases it. The resting state
   needs no code at all: y = 0 IS the layout.

   NOTHING IS CLIPPED ON THE WAY. Every ancestor between the <h2> and
   <body> is `overflow: visible` — checked, because a single `hidden`
   anywhere on that chain would shear the heading off at the section
   boundary and the whole gesture would look like a rendering bug rather
   than a decision. If a wrapper ever gains an overflow, this breaks.

   ── THE ARITHMETIC, because none of these three numbers is a taste value ──
   Progress p runs over `["start end", "start start"]`: 0 when the About
   section's top edge reaches the bottom of the window, 1 when it reaches
   the top. One viewport of scroll, exactly.
     · At p, the section's top sits at screen y = vh(1 − p).
     · The heading's HOME is H below that, so home screen y = vh(1 − p) + H.
     · We want its screen y to run from S₀ (its perch in the manifesto) at
       p = 0 to H at p = 1.
   Subtracting, the transform is a straight line:
       y(p) = −(1 − p) · (vh + H − S₀)
   so the whole travel is one lerp from −LIFT to 0, and LIFT = vh + H − S₀.

   S₀ IS SET BY THE MANIFESTO'S OWN EMPTY BAND. That chapter centres its
   statement, leaving 294px of bare cream below it at 1440×900 (410 at
   1920×1080, 244 at 1440×800 — measured). The heading has to perch inside
   that band without touching the statement above or the fold below, and
   0.74·vh clears both at all three: 60px of air above it at 900, 129 at
   1080, 36 at 800, and its own box always lands short of the fold.

   LIFT IS THEN 0.26·vh + H — AND IT COMES OUT AT 0.38·vh AT EVERY SIZE.
   H is the heading's offset inside its own section, measured at 110px on a
   900px window, 126 at 1080, 104 at 800; LIFT/vh is 0.382, 0.377 and 0.390.
   That is why this is a bare vh constant and not a layout measurement: the
   quantity a `useLayoutEffect` would go and fetch is already constant to
   within a percent. Re-measure it if the copy column's top padding changes;
   nothing else moves it. */
/* ── S₀ MOVED 0.74 → 0.80, AT THE USER'S INSTRUCTION: "increase the gap
   from where the heading appears and the manifesto" ──
   The air ABOVE the perch was the tight side of this derivation, never the
   fold below it: 60px at 1440×900 and only 36px at 1440×800, against 124px
   and 156px of unused room underneath. Six points of vh moves the heading
   down into room that was already there and roughly doubles the gap the
   reader judges, without touching a clearance that was never the problem.
   LIFT is (1 − S₀) + H/vh = 0.20 + 0.12. */
const LIFT_VH = 0.32;
const HEAD_LIFT = `-${LIFT_VH * 100}vh`;

/* WHERE THE PICTURE IS TOLD TO GO — the moment the heading's top edge and
   the picture's top edge are level.

   ⚠️ IT IS MEASURED, NOT SOLVED, AND THE SOLVED VERSION SHIPPED WRONG.
   Worth writing down, because the algebra looks airtight. Setting the two
   screen positions equal gives
       p* = (LIFT − H + I) / LIFT
   which is a clean constant — and it is only constant if H is. It is not:
   the heading's offset inside its own section measures 84px at 1440×900,
   126px at 1920×1080 and 104px at 1440×800, because the heading WRAPS TO A
   DIFFERENT NUMBER OF LINES and the column's own spacing moves with the
   window. Feeding those in gives p* = 0.789 / 0.722 / 0.697 — a 9%
   spread, i.e. most of a second of scroll, and the first pass hardcoded
   0.71 off an H that was guessed at 110 and fired the sweep a fifth of the
   travel early.

   So the crossing is READ instead: two `getBoundingClientRect` calls,
   compared, on each scroll frame until it happens — and then never again,
   because the latch below stops asking. That is a bounded cost with an
   exact answer at every viewport, against a constant that was exact at
   none. It also survives anything that moves the heading — a copy change, a
   type retune, a new breakpoint — none of which a solved constant would. */

/* THE HEADING'S INK, and it is deliberately not its travel. It fades and
   unblurs in the first sixth of the range — while it is still sitting in
   the manifesto — because the reader is meant to notice it arrive there,
   as a line of the chapter above, before it starts moving anywhere. */
const HEAD_IN: [number, number] = [0.02, 0.16];

/* HOW EARLY THE PICTURE GOES, at the user's instruction. The rule was "when
   the heading's top line is level with the picture's top line", i.e. a gap
   of exactly zero; this opens it while the heading is still 140px short of
   that. It is a LEAD, not a different rule — the sweep takes ~1.25s and the
   heading covers this distance in roughly the same time at an ordinary
   reading scroll, so the picture is now arriving AS the two edges meet
   rather than starting there. Raising it much further starts the sweep
   while the heading is still visibly up in the manifesto, which is the
   thing the flight exists to avoid. */
const GATE_LEAD = 140;

/* how far back past the crossing the reader has to go before the picture is
   put away again — see the gate below for why opening and closing cannot
   share one threshold. It is measured from the LEAD, not from zero, so the
   dead band travels with the trigger. */
const GATE_HYSTERESIS = 48;

/* ══════════ THE STACK BREAKPOINT, READ FROM HERE AS WELL ══════════
   AboutSplit.module.css collapses the split to one column at 900px and, in
   the same block, kills the lockup's travel outright — stacked, the heading
   sits BELOW the picture, so a 32vh flight would carry it back up over the
   photograph it is meant to caption. See the stylesheet's note.

   ⚠️ THE GATE HAS TO KNOW, because the rule it enforces stops existing.
   `swept` opens when the heading's top edge reaches the picture's — a
   comparison between two columns standing side by side. With one column and
   no flight the heading is permanently hundreds of pixels PAST the picture's
   top, so the comparison is true from the first frame and the sweep would
   fire while the whole chapter is still below the fold, finishing unseen.
   Stacked, the picture answers to its own arrival instead (see the gate).

   MEDIA QUERY RATHER THAN A WIDTH READ, so the number lives in the
   stylesheet and this only asks the question. Cached in a ref: this is
   consulted on every scroll frame and `matchMedia` allocates.
   ⚠️ 900 IS DUPLICATED FROM THE STYLESHEET. There is no way to read a CSS
   breakpoint from script; change one and change the other. */
const STACKED = "(max-width: 900px)";

/* the two ends of the stacked gate's dead band, as fractions of the window:
   the picture opens once its top edge is 80% of the way up the screen and
   closes again only at 95%, so a reader parked on the boundary — or Lenis's
   own inertial wobble — cannot re-trigger a 1.15s entrance on every frame.
   Same job as GATE_HYSTERESIS, expressed in the units this branch measures
   in. */
const STACK_OPEN = 0.8;
const STACK_SHUT = 0.95;

/* THE MOUNT — the card shadow's arrival, and nothing else.
   The picture's box used to sit on the cream as a filled rectangle wearing a
   shadow for the whole of the sweep that uncovers it, which read as a frame
   waiting for its photograph. The fill moved inside the mask; the shadow
   cannot follow it there, because `clip-path` clips an element's box-shadow
   away with everything else. So the shadow is a box of its own now
   (`.mediaShadow` — see the derivation in the stylesheet, including the two
   routes that were implemented and failed), and this fades it in.

   ⚠️ IT IS TIMED TO THE SWEEP'S TAIL, NOT ITS START, and that is the whole
   craft in this variant. The opacity ramps around the WHOLE rectangle at
   once — an element cannot know how much of its sibling is uncovered — so
   bringing it up from t=0 would put a half-strength shadow around a
   mostly-empty box, which is the same defect at 50% rather than at 100%.
   --ease-entrance is heavily front-loaded: measured on the real render the
   mask has uncovered ~88% of the frame 0.4s after it starts, which is why
   this is MEDIA_IN + 0.4 and not a number of its own. Starting there means
   the shadow only ever traces an edge with a picture behind it.

   PLAIN OPACITY, so `pick()`'s reduced-motion swap needs no special case:
   FADE animates exactly this property and the shadow simply arrives. */
const MOUNT: Variants = {
  hidden: { opacity: 0 },
  shown: {
    opacity: 1,
    transition: { duration: 0.7, ease: EASE, delay: MEDIA_IN + 0.4 },
  },
};

/* THE COUNTER-DRIFT. It runs LONGER than the mask on purpose — 1.7s against
   1.15s — so the picture is still settling for half a second after the edge
   has gone. That overhang is the gesture; matching the two durations gives
   back a panel that simply stops.
   --ease-drawer rather than --ease-entrance, because this is the slow
   settle and not the arrival: the drawer curve keeps moving at the end
   where the entrance curve has already parked. */
const DRIFT: Variants = {
  hidden: { y: "-4%", scale: 1.1 },
  shown: {
    y: "0%",
    scale: 1,
    transition: { duration: 1.7, ease: DRAWER, delay: MEDIA_IN },
  },
};

/* ── HEADING_V IS DELETED, and what it was is worth one paragraph ──
   The heading used to rise 28px out of an 8px blur on the house spring
   (150/19/1), sharing a 0.65s beat with the picture's caption — the
   stylesheet's "a title facing a title across the split", started together
   on purpose because "the facing pair is the idea, and staggering them
   would make one the caption of the other".

   ⚠️ THAT PAIRING IS GONE AND NOTHING REPLACES IT. The heading now enters a
   whole chapter earlier than the caption, in the manifesto's empty band, and
   arrives here under its own scroll-bound travel — so the two titles cannot
   share a beat, because they no longer share a trigger or even a section.
   The caption keeps its +0.55s behind the sweep; the heading answers to
   HEAD_LIFT. If the flight is ever reverted, this variant and that pairing
   come back together.

   The spring went with it for a second reason, independent of the first: a
   spring driven off scroll fights the wheel on the way back up, which is the
   objection this codebase already applied to the manifesto's own scrub. The
   travel is a straight lerp for exactly that reason. */

/* ── PILL IS DELETED, and the pop it carried is worth one paragraph ──
   It scaled 0.94 → 1 on the Manifesto eyebrow's spring (320/14/0.6, a
   visibly springy zeta ≈ 0.5 where the site's other springs sit near
   critical) with opacity on a tween beside it, 0.4s behind the heading. It
   was the page's one "a control arrives" pop, and it was 0.94 rather than
   the eyebrow's 0.88 because scale reads as distance travelled by an
   element's EDGES and this capsule is several times the eyebrow's width.

   ⚠️ IT GOES BECAUSE THE CONTROL NOW TRAVELS WITH ITS HEADING, at the
   user's instruction, and the two cannot both be true: a pill that pops into
   place at the crossing is a pill that was not part of the lockup on the way
   there. The lockup fades in once, up in the manifesto, and arrives as one
   object.

   AND A SPRING COULD NOT HAVE COME WITH IT ANYWAY. The travel is scroll-
   bound, and a spring driven off scroll fights the wheel on the way back
   up — the same objection this codebase applied to the manifesto's scrub and
   to the heading's own retired rise. If the flight is ever reverted, this
   variant comes back with HEADING_V. */

/* ── the reading block, on its OWN trigger ──/* ── the reading block, on its OWN trigger ──
   A DELIBERATE DEPARTURE from a single chain, and worth stating plainly.
   This section is a full screen, so a reader who has only just brought its
   top edge into view cannot see the bottom of the text column at all — a
   global t=1.15 beat would play the whole reading block off-screen and it
   would be finished and static by the time anyone reached it. It keeps its
   relative order (paragraph, prints, footnote) and starts when it is
   actually approached. */
/* ══════════ THE READING BLOCK SETTLES DOWNWARD ══════════
   All three parts of this column — this paragraph, the row of prints, and
   the fine paragraph below them — now arrive by dropping a few pixels into
   place instead of rising into it. At the user's instruction, and the
   direction is the whole of the change.

   ⚠️ THIS WENT DOWNWARD FOR ONE PASS AND CAME BACK. The argument for
   descending was that the chapter's other gestures descend — HEAD_LIFT is
   negative, so the heading perches ~38vh up and travels down, and the
   photograph's mask sweeps down (see MEDIA). It was overruled: "have that
   upwards appearing animation". The direction is now the house one again,
   and the house is consistent about it — Reveal.tsx rises 28px, and every
   other reveal on the site rises with it. This column was the odd one out
   while it dropped, which is the opposite of what the change was for.

   24px AND NOT 16. "Start up a bit higher" — so the travel is LONGER than
   the 16px this originally ran, not just re-signed. On --ease-entrance,
   which spends most of itself in the first third, 24px is still felt rather
   than watched: the type is essentially in place by ~250ms. Past ~32px it
   stops reading as a settle and starts reading as a slide.

   THE DURATION IS UNCHANGED AT 0.7s, deliberately. Emil's rule is that UI
   animation stays under 300ms — and it exempts editorial and explanatory
   motion, which this is: it happens once, on a marketing page, on scroll,
   and 0.7s is what every other reveal on this site runs (Reveal.tsx's
   opacity). Speeding this one up alone would make it the odd chapter out,
   which is the opposite of the ask. */
const PARA: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/* THE PRINTS WIPE, so the footnote pictures rhyme with the photograph at
   quarter scale — the same gesture, a third of the duration.

   THE CLIP IS ON AN INNER SPAN AND THIS IS NOT TIDINESS. `clip-path` clips
   an element's ENTIRE rendering, box-shadow included, and it stays on the
   element as an inline style once the animation rests — so wiping
   .doorFrame directly would leave `inset(0% 0 0 0)` sitting there
   permanently and all three prints would silently lose --shadow-card.
   Nothing about that failure looks like an animation bug, which is why it
   is written down here. */
/* THE WIPE UNCOVERS BOTTOM-UP, which is what "that upwards appearing
   animation" means for a picture: the top inset shrinks from 100% to 0, so
   the print is revealed from its bottom edge upward, travelling with the
   row that is rising underneath it.

   ⚠️ IT WAS FLIPPED DOWNWARD FOR ONE PASS AND IS BACK. Worth recording,
   because the note above still claims these prints "rhyme with the
   photograph at quarter scale — the same gesture", and MEDIA's sweep runs
   DOWN. That claim is NOT true and never was: the doors rise, the big
   photograph falls. It is left that way deliberately now rather than by
   accident — the doors belong to the copy column and move with it, and the
   photograph is its own object on the other side of the split.

   BOTH KEYFRAMES CARRY THE % ON THE SAME SLOT. `inset(100% 0 0 0)` →
   `inset(0% 0 0 0)` interpolates; mixing a unitless 0 into the animated
   slot is the failure Reveal.tsx documents, where the clip cuts on the
   first frame instead of animating and looks like a reveal that never
   fired. */
const DOOR_WIPE: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)" },
  shown: (i: number) => ({
    clipPath: "inset(0% 0 0 0)",
    transition: { duration: 0.6, ease: EASE, delay: 0.08 + i * 0.07 },
  }),
};

/* The frame itself fades on the same beat. Without it the reader sees an
   empty --placeholder box wearing a shadow before its picture arrives,
   which reads as a failed image rather than as a reveal. Two properties
   rather than one, against Reveal's "three ideas competing" note — but the
   fade here is preventing a pop, not adding a second gesture. */
const DOOR_IN: Variants = {
  hidden: { opacity: 0 },
  shown: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.35, ease: EASE, delay: 0.08 + i * 0.07 },
  }),
};

/* ══════════ THE ROW DROPS AS ONE OBJECT ══════════
   The travel is on the <ul>, NOT on each <li>, and that is the difference
   between this being a third gesture and being a free one.

   Each print already carries TWO — a fade (DOOR_IN) and a clip wipe
   (DOOR_WIPE) — and DOOR_IN's own note concedes it is at two "against
   Reveal's 'three ideas competing' warning", justified because the fade is
   preventing a pop rather than adding a gesture. Putting a translate on the
   <li> as well would make it three on one element, which is the case
   Reveal.tsx is explicit about: "a picture that rises, de-blurs AND wipes at
   once is three ideas competing over 800ms".

   On the container it is one gesture on a DIFFERENT object. The row settles
   as a single artefact — a strip of three prints laid on the page — while
   each print uncovers on its own stagger inside it. Nothing about any
   individual door changed.

   NO OPACITY HERE. The three <li> already fade themselves; fading the
   container as well would double the ramp and make the row arrive muddier
   than its own prints. */
const DOOR_ROW: Variants = {
  hidden: { y: 24 },
  shown: {
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: 0.09 },
  },
};

/* The fine paragraph closes the block. −10 to match the two above it, and
   the delay comes in from 0.35s to 0.22s: at 0.35 it read as a fourth,
   separate event arriving after the row had finished, rather than as the
   last part of one column settling. 0.22 keeps the order legible — lead,
   prints, footnote — without the block coming apart into three. */
const PARA_FINE_V: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: 0.22 },
  },
};

export default function AboutSplit() {
  const reduce = useReducedMotion();

  /* THE FILM'S HANDLE. A ref and not state: the only thing anything does
     with this element is call play() on it once, and a state update here
     would re-render a section that has a whole choreography mid-flight. */
  const clipRef = useRef<HTMLVideoElement>(null);

  /* ⚠️ THE FILM IS GATED ON A POST-MOUNT FLAG AND NOT ON `reduce` ALONE,
     BECAUSE THE SERVER CANNOT KNOW THE ANSWER AND STILL HAS TO EMIT SOMETHING.
     framer's useReducedMotion() is `null` server-side (utils/reduced-motion/
     state.mjs, verbatim: "Returns `null` server-side") and a real boolean from
     the client's FIRST render — its `initPrefersReducedMotion()` runs before
     the useState that captures it. So a plain `reduce ?` branch asks a
     question the server answers with null, null is falsy, and the SERVED HTML
     carries the <video> to every reader alive. Under `output: "export"` that
     HTML is the artefact that ships, so the preload scanner opened a range on
     about-big.mp4 while parsing — measured at the whole 5.0MB — and React
     only swapped the element in afterwards. The bytes were already gone.

     TWO CONDITIONS, AND EACH ONE IS LOAD-BEARING:
       `preferenceKnown`  false on the server AND on the client's first
                          render, so the two agree and hydration has nothing
                          to reconcile. Gating on `reduce === false` by
                          itself would only MOVE the mismatch — off the
                          reduced-motion reader and onto everyone else.
       `reduce === false` an explicit false rather than a falsy test, so a
                          null can never read as "motion is fine". Belt and
                          braces given the flag above, and it is the property
                          that actually keeps the film off the wire.

     PASSIVE EFFECT, NOT LAYOUT. A layout effect would warn on the server, and
     it would buy nothing: the panel is clipped to nothing by MEDIA.hidden
     until `swept` latches on scroll, so no reader sees the beat before the
     swap. What renders in it is the still — the same photograph the film
     carries as its poster, in the same absolutely-positioned box — so there
     is no empty frame and nothing to shift.

     THE ONE THING NOT TO DO HERE is route `pick()` through this flag.
     `reduce` is captured once and never changes, so the variant objects are
     stable for the life of the component; swapping them after mount instead
     animates only the keys the NEW set names and freezes the rest at their
     hidden values — a clip-path stranded shut, permanently. */
  const [preferenceKnown, setPreferenceKnown] = useState(false);
  useEffect(() => setPreferenceKnown(true), []);

  /* ══════════ THE SCROLL-BOUND DRIFT ══════════
     The picture keeps moving inside its frame for as long as the panel is on
     screen — the frame is fixed, only what is in it travels. At the user's
     instruction, and it is a SECOND gesture on top of the entrance rather
     than a replacement for it.

     ⚠️ IT IS ON AN ELEMENT OF ITS OWN, AND THAT IS THE WHOLE DESIGN.
     `.mediaDrift` already owns `y` for the entrance's settle. Binding a
     scroll value to the same property on the same element means the two
     write to one transform every frame and the panel jitters through the
     entrance — a real failure, not a theoretical one, and the reason this is
     three boxes deep instead of two. Separate elements compose in the DOM:
     the entrance owns the outer transform, the scrub owns the inner, and
     neither has to know the other exists or to wait for it.

     THE PICTURE LAGS, WHICH IS WHAT MAKES IT READ AS DEPTH. It drifts DOWN
     inside its frame as the reader scrolls down — the way a distant thing
     slides behind a window you are walking past. Drifting the other way
     reads as the photograph racing the scroll, which is the same motion and
     the wrong one.

     ── THREE STOPS, WEIGHTED TO THE EXIT, at the user's instruction ──
     "A bit more downwards towards the end of the section." −3% on the way
     in; back through 0 just past the midpoint, where the panel is squarely
     on screen and should sit still enough to be read; then 7% of downward
     travel across the last 45% of the transit, as this chapter hands over to
     the next. A straight two-stop lerp spends the same distance evenly and
     the hand-off — the one moment the instruction is about — gets nothing.

     ⚠️ AND THE SCALE ARITHMETIC APPLIES AGAIN, PERMANENTLY.
     `(S − 1) / 2 ≥ travel`, and the travel is the LARGEST excursion rather
     than the average — 7%, so 1.15 with a little margin. Unlike the
     entrance's, this scale never returns to 1, because the drift never
     stops. That is a 15% crop of the photograph given up for good, up from
     8%, and it is the real price of asking for more movement: every percent
     of drift costs two percent of picture. Widen the range without moving
     the scale and the plate's edge lifts clear of the frame mid-scroll and
     shows a strip of bare ground. */
  /* ── THE CHAPTER'S OWN PROGRESS, which the heading's flight rides ──
     Measured on the SECTION, over exactly one viewport of scroll: 0 as its
     top edge reaches the bottom of the window, 1 as that edge reaches the
     top. Every constant in the derivation above is written against these
     two endpoints, so moving the offset means redoing the arithmetic. */
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: chapter } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });

  /* ══════════ THE FILM'S FETCH, GATED ON THE CHAPTER'S APPROACH ══════════
     See FILM_WARM_MARGIN for what this is buying and what was measured. The
     element ships `preload="none"`, which costs nothing at all, and this
     promotes it once the section is within a viewport and a half.

     A DOM WRITE AND NOT A STATE UPDATE. Everything in this chapter that could
     re-render mid-choreography is deliberately kept out of React — see the
     note on `clipRef` — and a fetch is not a state to be maintained anyway.
     The observer is one-shot: it disconnects on the first intersection, so
     there is nothing to keep in sync and nothing to tear down twice.

     ⚠️ THE `preload === "auto"` GUARD IS WHAT MAKES `load()` SAFE. It resets
     an element to zero, and the entrance calls play() on this same element
     (see onAnimationComplete). The two cannot normally race — the gate fires
     a viewport and a half out, the entrance fires once the sweep completes,
     and no scroll gets from one to the other in a frame — but a reader
     landing with the chapter already on screen puts both in the same batch.
     One-shot plus the guard means the second caller is a no-op rather than a
     film snapped back to its first frame.

     `preferenceKnown` IS IN THE DEPS BECAUSE THE ELEMENT DOES NOT EXIST ON
     THE FIRST PASS. The film mounts only once the preference is known and is
     `false` (see the gate above), so this runs, finds no film, and returns;
     the flag flipping is what re-runs it against an element that is really
     there. Under reduced motion there is never a film and this stays a
     no-op for the life of the component, which is correct — that reader is
     looking at the still. */
  useEffect(() => {
    const film = clipRef.current;
    const section = sectionRef.current;
    if (!film) return;

    const warm = () => {
      if (film.preload === "auto") return;
      film.preload = "auto";
      film.load();
    };

    // no IntersectionObserver: fetch it rather than ship a panel whose film
    // can only ever be started by play() with nothing buffered behind it
    if (!section || typeof IntersectionObserver === "undefined") {
      warm();
      return;
    }

    const gate = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        gate.disconnect();
        warm();
      },
      { rootMargin: FILM_WARM_MARGIN },
    );
    gate.observe(section);
    return () => gate.disconnect();
  }, [preferenceKnown]);

  /* the flight itself — one lerp, and `useTransform` clamps at both ends, so
     the heading is parked in the manifesto above the range and sitting in its
     own layout below it */
  const headY = useTransform(chapter, [0, 1], [HEAD_LIFT, "0vh"]);

  /* ══════════ THE READING COLUMN FOLLOWS THE HEADING DOWN ══════════
     At the user's instruction: the paragraph, the three doors and the fine
     print "start up higher and then, once they are seen at the bottom of the
     screen, move down into place following the scroll and the heading above
     it."

     ⚠️ IT TRAVELS LESS THAN THE HEADING, AND THAT IS WHAT KEEPS THEM APART.
     `.lead` runs the full LIFT (32vh) over [0, 1]; this runs 16vh over
     [0.1, 1]. Because the heading sits ABOVE this block in the layout and is
     lifted FURTHER, the two spread apart during the flight rather than
     colliding — at chapter 0.5 the heading is at −16vh against this block's
     −8.9vh, i.e. 7.1vh MORE clearance than the stylesheet gives them at rest.
     Give this block a larger lift than the heading and that sign flips: the
     paragraph climbs into the underside of the lockup.

     BOTH LAND ON 0 AT chapter = 1, which is not a nicety. `useTransform`
     clamps, so anything that has not reached 0 by the end of the range is
     parked off its layout position for the whole time the chapter is read.

     THE PER-ELEMENT CASCADE STILL RUNS UNDERNEATH. `.readingBlock` carries no
     variant of its own — it is a pure orchestrator for PARA / DOOR_ROW /
     DOOR_IN — so this transform has the element to itself, and the two
     compose the way the picture's entrance and scrub do: outer box travels,
     inner boxes ink in. */
  const bodyY = useTransform(chapter, [0.1, 1], ["-16vh", "0vh"]);
  const headOpacity = useTransform(chapter, HEAD_IN, [0, 1]);
  const headBlur = useTransform(
    chapter,
    HEAD_IN,
    ["blur(8px)", "blur(0px)"]
  );

  const mediaRef = useRef<HTMLElement>(null);

  /* ⚠️ THE ONE PIECE OF STATE IN THE WHOLE CHOREOGRAPHY, and it is a GATE
     rather than a scrub. The picture's entrance is a timed animation — a
     1.15s mask with a 1.7s counter-drift that deliberately overruns it (see
     MEDIA and DRIFT) — and a scrub has no "after" to overrun into, so
     binding the sweep to scroll would throw away the settle this chapter was
     rebuilt around. What scroll decides is WHEN IT RUNS.

     ⚠️ IT REVERSES, AND IT SHIPPED ONCE THAT DIDN'T. As a one-way latch this
     read correctly on the way down and wrongly ever after: scroll past the
     chapter and back up, and the heading dutifully returned to its perch in
     the manifesto while the photograph — which is only supposed to exist
     once the two are level — stayed fully open behind it. Measured at the
     same scroll position, `clip-path` read `inset(0% 0 100% 0)` on the first
     approach and `inset(0%)` on the second. The requirement is a STATE, not
     an event: the picture is visible exactly while the heading has reached
     it. So the gate is a comparison evaluated on every frame, in both
     directions.

     THE 48px IS HYSTERESIS AND IT IS NOT OPTIONAL. Opening and closing on
     the same threshold means a reader parked within a pixel of the crossing
     — or any inertial wobble from Lenis — re-triggers a 1.15s entrance over
     and over. Opening at 0 and closing at −48 puts a dead band roughly one
     line of type wide between the two decisions, which no ordinary scroll
     crosses by accident.

     TWO RECT READS PER FRAME, AND NOTHING WRITTEN BETWEEN THEM, so this
     cannot thrash layout; `useScroll` above is already reading on the same
     frames. `setSwept` with an updater rather than a comparison against the
     captured `swept` — the handler closes over a render's value and the gate
     has to see the current one. */
  const [swept, setSwept] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const stackedMq = useRef<MediaQueryList | null>(null);
  useMotionValueEvent(chapter, "change", (p) => {
    const head = headRef.current;
    const frame = mediaRef.current;
    if (!head || !frame) return;

    const lead = leadRef.current;
    if (!lead) return;

    /* ── STACKED: THE PICTURE ANSWERS TO ITS OWN ARRIVAL ──
       and the branch comes FIRST because the crossing rule below cannot even
       be evaluated here: with the flight overridden to `transform: none`,
       `getComputedStyle(lead).transform` reads the string "none", which
       DOMMatrixReadOnly refuses to parse. See STACKED for why the rule is
       wrong on this layout as well as unmeasurable.
       Still a state and still reversing, exactly as the wide gate is — the
       picture is open precisely while it is up the screen, so scrolling back
       puts it away and approaching it again plays the sweep. */
    stackedMq.current ??= window.matchMedia(STACKED);
    if (stackedMq.current.matches) {
      const top = frame.getBoundingClientRect().top;
      const vh = window.innerHeight;
      setSwept((open) =>
        open ? top < vh * STACK_SHUT : top < vh * STACK_OPEN
      );
      return;
    }

    /* ⚠️ THE RECT IS ONE FRAME STALE AND THE LAG IS CANCELLED, NOT AVOIDED.
       TWO WRONG VERSIONS SHIPPED BEFORE THIS ONE; both are worth keeping.

       WRONG #1 — compare two `getBoundingClientRect().top`s. This handler
       runs inside the scroll update, but the transform driven by the same
       value is not written until the next frame, so the heading's rect is a
       frame behind while the picture's is current. On a wheel that is a
       pixel or two; on a fling or a scrollbar drag it is hundreds, the gap
       reads far more negative than it is, and the picture never opens.
       Reproduced 3/3 at 300px per frame, with the heading 72px PAST the
       crossing and the mask still at `inset(0% 0 100% 0)`.

       WRONG #2 — take the gap from `offsetTop`, which is layout and
       therefore lag-free. It is lag-free and it is also not measuring what
       it looks like: Chrome returns a TRANSFORMED element as `offsetParent`,
       so the heading's offsetTop is relative to `.lead` — the very box
       carrying the travel — and came back as 0 against the picture's 1773.
       Measured, computedDelta was −2108 where the truth was −262. Browsers
       disagree about this, so the shape of the bug is not even stable.

       RIGHT — read the rect AND the transform that is currently written into
       it, in the same instant, and swap that transform for the one this
       callback was just handed. Both reads are stale together, so the
       subtraction is exact, and nothing depends on what `offsetParent`
       happens to resolve to. */
    const rendered = new DOMMatrixReadOnly(
      getComputedStyle(lead).transform
    ).f;
    const current = -LIFT_VH * window.innerHeight * (1 - p);
    const delta =
      head.getBoundingClientRect().top -
      frame.getBoundingClientRect().top -
      rendered +
      current;

    setSwept((open) =>
      open
        ? delta >= -GATE_LEAD - GATE_HYSTERESIS
        : delta >= -GATE_LEAD
    );
  });

  /* ══════════ THE PANEL DOES NOT MOVE WITH THE PAGE ══════════
     Both scroll-linked travels are gone, at the user's instruction: the
     picture is to be still as the reader passes the chapter.

     WHAT WENT, so nobody reconstructs half of it:
       · `blockY` — the whole plate (frame, shadow and caption) sank 0 → 150px
         across the last 45% of the section's transit, so it was still
         descending as the journal wrote itself underneath. That hand-off was
         the point of it, and it is what the reader asked to stop.
       · `scrubY` — a −3/0/+7% crop shift on the photograph inside the mask,
         with a permanent `scale: 1.15` on `.mediaScrub` paid to cover it.
     With the travel gone the scale has no job, so it goes too and the
     picture is uncropped again. `.mediaScrub` itself is deleted — it existed
     only because the entrance settle and the scroll scrub were two authors
     of one `y`, and there is one author left.

     ⚠️ AND THE SEAM BELOW WAS SIZED FOR THE TRAVEL. Blog.module.css held
     `calc(var(--home-gap-tight) + 150px - var(--grid-gutter))` on its top
     padding purely to keep the sinking plate off its label. That 150px is
     removed in the same pass — see the note there. Nothing else reads this.

     The `useScroll` on `sectionRef` went with them; the chapter's OTHER
     scroll reader (`chapter`, above) is the text column's flight and is
     untouched — this change is the picture only. */

  /* One switch for the whole choreography. Reduced motion gets the same
     content in the same order and none of the travel. */
  const pick = (real: Variants): Variants => (reduce ? FADE : real);

  /* THE TRIGGER IS A MARGIN, NOT AN `amount`, AND THAT IS A CORRECTNESS FIX
     RATHER THAN A PREFERENCE. `amount: n` is an IntersectionObserver
     threshold — the ratio of the ELEMENT that must be visible — so on any
     element taller than 1/n viewports it can never be satisfied and the
     animation never fires, leaving everything at opacity 0 forever. This
     section is ~100svh on desktop (fine) but STACKS ON MOBILE, where it is
     several screens tall. A negative bottom margin shrinks the viewport rect
     instead and fires on any intersection at all, so it cannot deadlock at
     any height. -45% starts the chapter once its top ~45% is on screen. */
  return (
    <motion.section
      ref={sectionRef}
      className={styles.section}
      /* everything inside this chapter that hides itself for an entrance is
         restored by the <noscript> block in app/layout.tsx — see the note on
         the attribute in components/Reveal.tsx */
      data-entrance="scope"
      data-nav-theme="light"
      initial="hidden"
      /* ⚠️ NOT `whileInView` ANY MORE. The chapter's cascade — the picture's
         mask, its counter-drift, the shadow, the caption and the pill — is
         released by the HEADING crossing the picture's top edge, not by the
         section touching the viewport. `swept` latches at SWEEP_AT and never
         clears; see its note.
         WHAT THE OLD TRIGGER WAS FOR is worth keeping in view: `margin`
         rather than `amount`, because `amount: n` is an IntersectionObserver
         threshold — the ratio of the ELEMENT visible — and on any element
         taller than 1/n viewports it can never be satisfied, so the chapter
         would sit at opacity 0 forever. This section is ~100svh on desktop
         and STACKS ON MOBILE, where it is several screens tall. The scroll
         progress below has the same property for free: it is a position, not
         a ratio, so it cannot deadlock at any height. */
      animate={swept ? "shown" : "hidden"}
    >
      {/* THE OPENING RULE IS GONE, at the user's instruction, and it was the
          last of this chapter's two hairlines — the closing one went first.
          The pair was the argument for either of them: two lines read as a
          frame, one reads as a divider sitting on a seam. What opens the
          chapter now is the picture. See the stylesheet for the geometry the
          rule was carrying and where it moved to. */}
      <div className={styles.split}>
        {/* ── LEFT: the picture, and its line ── */}
        {/* A PLAIN <figure> AGAIN. It was a motion.figure for one reason —
            `blockY` wrote a scroll-linked `y` on it — and that travel is
            gone (see the note where it was defined). Nothing here animates,
            so nothing here needs to be a projection node. */}
        <figure className={styles.media} ref={mediaRef}>
          {/* THE SHADOW, ON A BOX OF ITS OWN AND OUTSIDE THE MASK. It is the
              second half of "the ground is clear until the picture arrives":
              the fill moved inside the clip, and this is what the fill's
              shadow became. Empty, pointer-transparent, and faded in on the
              sweep's tail — see MOUNT, and the stylesheet for why every
              simpler route fails. */}
          <motion.div
            className={styles.mediaShadow}
            variants={pick(MOUNT)}
            aria-hidden
          />
          {/* ══ THE PANEL, IN THREE BOXES, AND EACH ONE IS LOAD-BEARING ══
                .media       the shadow, the radius and the overflow. NOTHING
                             animates here — a clip-path on this element
                             would clip its own box-shadow away permanently
                             (see MEDIA's note).
                .mediaFrame  the MASK. Nothing else.
                .mediaDrift  the COUNTER-DRIFT. Nothing else. It exists so
                             the picture can move without the scrim moving
                             with it — the scrim is a sibling of this box and
                             a child of the mask, so it is REVEALED by the
                             sweep and never dragged by the settle.
              All three were here before, all three were deleted when the
              animation came out, and all three come back together. Do not
              flatten them "back" — the flattening was the state with no
              animation in it. */}
          <motion.div
            className={styles.mediaFrame}
            variants={pick(MEDIA)}
            /* ⚠️ THE CLIP'S PLAYBACK HANGS OFF THIS, AND IT IS NOT A
               FLOURISH. Starting a 5.0MB file's decode on the same frames
               the mask and the drift are animating drops both of them on a
               laptop. So the film starts when the entrance has finished,
               exactly as it did before the animation was removed.
               THE FETCH IS SOMEBODY ELSE'S JOB and happens earlier — see
               FILM_WARM_MARGIN and the observer that uses it. This handler
               used to claim `preload="metadata"` kept the frames off the
               wire; it did not, and the measurement that says so is in the
               constant's note.
               THIS IS ALSO WHY `autoPlay` IS GONE AGAIN. It was added
               BECAUSE the wipe went — with no animation there was no
               completion to hang this on, and the clip would have sat on
               its poster forever. Put the wipe back and the handler is the
               correct owner again. Delete this and the panel is a still. */
            onAnimationComplete={() => {
              void clipRef.current?.play().catch(() => {});
            }}
          >
            <motion.div className={styles.mediaDrift} variants={pick(DRIFT)}>
              {/* .mediaScrub IS GONE WITH THE SCRUB IT CARRIED. It was a
                  third box for one reason: the entrance settle and the
                  scroll scrub both wrote `y`, and one element cannot hold
                  two authors of one transform. There is one author left, so
                  the picture hangs directly off the drift — and the 1.15
                  scale that box paid to cover the scrub's excursion goes
                  with it, uncropping 15% of the photograph. */}
              {preferenceKnown && reduce === false ? (
                /* DECORATIVE, so aria-hidden and no controls: it carries no
                   information the text beside it does not.
                   `muted` is not a style choice — autoplay is blocked
                   without it on every browser, and this element is started
                   from script. `playsInline` stops iOS taking it
                   fullscreen. */
                <video
                  ref={clipRef}
                  className={styles.mediaVideo}
                  /* the film from the CDN when one is configured; the poster
                     stays the hand-picked portrait rather than becoming a
                     rendered frame, because this one was CHOSEN — see the
                     chapter's own note on PORTRAIT */
                  src={asset(VIDEO)}
                  poster={asset(PORTRAIT)}
                  muted
                  loop
                  playsInline
                  /* nothing at all until the chapter approaches — see
                     FILM_WARM_MARGIN, which is what promotes this */
                  preload="none"
                  aria-hidden
                />
              ) : (
                /* THE STILL IS THE DEFAULT ARM NOW, and it is three readers'
                   picture rather than one's: the reduced-motion reader, who
                   keeps it for good; the reader with no JS, for whom this
                   render is the only one there will ever be (see the
                   <noscript> restoration in app/layout.tsx); and everyone
                   else, for the single beat before the film takes over.
                   A <video> with autoplay suppressed would show this same
                   photograph as its poster — but it would download the 5.0MB
                   to do it, which is the whole reason the arms are this way
                   round.
                   `loading="lazy"` is what makes the beat free for the third
                   reader: the chapter is far below the fold, so the still is
                   never fetched before the swap removes it. Under reduced
                   motion `pick()` has already swapped both variants above for
                   the chapter's plain FADE, so this box neither masks nor
                   drifts; it just arrives. */
                <Image
                  className={styles.mediaImg}
                  src={PORTRAIT}
                  alt="A Maginhawa Group dining room"
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              )}
            </motion.div>

            {/* THE SCRIM IS INSIDE THE MASK AND OUTSIDE THE DRIFT, and that
                placement is the whole reason .mediaDrift is a separate box.
                Inside the mask: it is uncovered by the sweep along with the
                picture it darkens, instead of hanging over bare
                --placeholder while the edge travels. Outside the drift: a
                scrim that slid and scaled with the photograph would take its
                guaranteed 200px band with it, and that band is what the
                caption's contrast floor is measured against. */}
            <div className={styles.mediaScrim} aria-hidden />
          </motion.div>

          {/* THE CAPTION — two lines, each rising out of its own clip.
              This is the one thing over the photograph that still moves.

              THE HARD BREAK IS STRUCTURAL NOW rather than a <br />: the two
              halves are separate masks because they have to move
              separately. `textContent` is unchanged by the swap — <br />
              never contributed to it either — and `innerText` still breaks
              between them, so nothing an AT or a copy-paste sees has moved.
              The em-dash stays aria-hidden and stays with the first line. */}
          <figcaption className={styles.mediaLine}>
            {PORTRAIT_LINE.map((line, i) => (
              <span className={styles.lineMask} key={line}>
                <motion.span
                  className={styles.lineInner}
                  variants={pick(LINE)}
                  custom={i}
                >
                  {i === 0 && (
                    <span className={styles.dash} aria-hidden>
                      —
                    </span>
                  )}
                  {line}
                </motion.span>
              </span>
            ))}
          </figcaption>
        </figure>

        {/* ── RIGHT: heading + pill high, reading block low ── */}
        <div className={styles.copy}>
          {/* ══ THE LOCKUP TRAVELS AS ONE BOX, at the user's instruction ══
              The transform used to sit on the <h2> alone, which left the
              control behind in the About column while its heading flew — two
              halves of one lockup on two different clocks. `.lead` already
              holds exactly these two children and nothing else, so moving the
              travel up one level is the whole fix: one element, one
              transform, and the heading and its button keep the gap the
              stylesheet gives them for free at every point in the flight.

              THE OPACITY IS HERE AND THE BLUR IS NOT, deliberately. The
              lockup fades in as one thing, but `filter` on this box would put
              a blur pass over <PillCta>, whose neck is a split CSS-blur and
              SVG-threshold goo — a parent filter is exactly the kind of thing
              that composites it wrong. The blur stays on the heading's own
              element, where it only has type under it. */}
          <motion.div
            ref={leadRef}
            className={styles.lead}
            variants={reduce ? FADE : undefined}
            style={reduce ? undefined : { y: headY, opacity: headOpacity }}
          >
            {/* ⚠️ NO VARIANT ON THIS HEADING — it is the one thing in the
                chapter that is NOT released by `swept`, because it is what
                DOES the releasing. It inks in a chapter early, up in the
                manifesto's empty band, and rides `chapter` down into this
                slot; the picture opens while the two top edges are level. See
                HEAD_LIFT for the arithmetic.
                THE REF IS THE GATE'S MEASURING POINT and stays on the
                HEADING rather than moving up to the lockup with the
                transform: the instruction is that the picture appears when
                the heading's top line reaches the picture's top line, and the
                lockup's top edge is the same thing today only because the
                heading is its first child. State the element the rule is
                about. */}
            <motion.h2
              ref={headRef}
              className={styles.heading}
              style={reduce ? undefined : { filter: headBlur }}
            >
              {/* THE EM-DASH IS DECORATION AND IS HIDDEN FROM THE ACCESSIBLE
                  NAME. Left in the text it would be announced as "em dash"
                  before every reading of the heading. */}
              <span className={styles.dash} aria-hidden>
                —
              </span>
              {HEADING}
            </motion.h2>

            {/* the house action — the same control the journal head and the
                closing frame carry (components/PillCta.tsx). No seat class:
                `.lead` is a flex column at flex-start and the host is
                already fit-content.
                NO VARIANT OF ITS OWN ANY MORE: it arrives with the heading
                and travels with it, which is what "join the movement" means.
                See the note on PILL for the pop this cost. */}
            <div>
              <PillCta href="/about">Read our story</PillCta>
            </div>
          </motion.div>

          {/* THE SECOND TRIGGER — see PARA above for why this block does not
              ride the section's chain. Its own `amount` is safe where the
              section's would not be: this is a few hundred pixels tall and
              always shorter than a viewport, so the ratio is reachable. */}
          <motion.div
            className={styles.readingBlock}
            /* REDUCED MOTION GETS NO TRANSFORM AT ALL — the same rule the
               picture's scrub and the plate's travel follow. */
            style={reduce ? undefined : { y: bodyY }}
            initial="hidden"
            whileInView="shown"
            /* 0.2 AND NOT 0.4, at the user's instruction ("start up a bit
               higher"): `amount` is the fraction of THIS BLOCK that has to
               be on screen before the rise fires, so a smaller number fires
               it earlier — the column begins settling while it is still low
               in the window rather than once it is nearly centred. It stays
               an `amount` rather than a margin because this block is a few
               hundred pixels tall and always shorter than a viewport, so the
               ratio is always reachable; the deadlock the section-level note
               warns about cannot happen here. */
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.p className={styles.para} variants={pick(PARA)}>
              {PARA_LEAD}
            </motion.p>

            <motion.ul className={styles.doors} variants={pick(DOOR_ROW)}>
              {DOORS.map((d, i) => (
                <motion.li key={d.slug} variants={pick(DOOR_IN)} custom={i}>
                  {/* THE VENUE'S OWN SITE, IN A NEW TAB. These pointed at
                      `/restaurants/<slug>` — this site's page for the room —
                      and that route has been removed, so the door opens onto
                      the restaurant's own site instead. It is a real external
                      link rather than a routed one, so `<a>` rather than
                      `<Link>`, with `noopener` for the same reason every
                      other outbound link here carries it.
                      The accessible name says where it goes: a door that
                      leaves the site should say so before it is pressed, not
                      after. */}
                  <a
                    href={SITE_BY_SLUG[d.slug]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.door}
                    aria-label={`${d.label} — visit the restaurant's website, opens in a new tab`}
                  >
                    <span className={styles.doorFrame}>
                      <motion.span
                        className={styles.doorClip}
                        variants={pick(DOOR_WIPE)}
                        custom={i}
                      >
                        <Image
                          className={styles.doorImg}
                          src={d.src}
                          alt=""
                          fill
                          sizes="150px"
                        />
                      </motion.span>
                    </span>
                  </a>
                </motion.li>
              ))}
            </motion.ul>

            <motion.p className={styles.paraFine} variants={pick(PARA_FINE_V)}>
              {PARA_FINE}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
