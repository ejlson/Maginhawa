"use client";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
} from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { lenisRef } from "@/lib/SmoothScroll";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import SplitWords from "./SplitWords";
import styles from "./About.module.css";
/* the native-cursor opt-out that has to travel with every
   data-cursor="default" — see .optOut in that file */
import cursor from "./CustomCursor.module.css";
import { FEATURED_OUTLETS, PRESS } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";

const OUTLET_PRIORITY = new Map(FEATURED_OUTLETS.map((o, i) => [o.name, i]));
const priorityOf = (name: string) => OUTLET_PRIORITY.get(name) ?? Infinity;

/* Each chapter carries a `layout`, and there are now exactly TWO of them:

     "landscape" — image left, text right (the classic spread)
     "portrait"  — text left, tall image right

   `place` feeds the meta line; `slug` links the chapter to its restaurant.

   THE THIRD VALUE IS GONE. "wide" was a panoramic bookend in the list branch
   and the short wide card on the deck, and three shapes was one more than the
   deck could carry: the base and the wide were 356 and 378 across, so two of
   the three read as "the same card, slightly off" rather than as a third kind
   of print. Two shapes that are actually different is the ask.

   THE ORDER IS NO LONGER TYPED, AND IT IS NO LONGER A CONSTRAINT. It used to
   be five landscapes then four portraits, and that was not a preference — it
   was the only class of sequence in which a card behind the seat could not
   cut into the chapter being read (a wider card behind a narrower seated one
   pokes out either side, and the step that does it is portrait -> landscape).
   The intrusion is now impossible BY GEOMETRY rather than by ordering: the
   seat card is pushed far enough toward the camera that its projected box
   out-measures every card behind it whatever either shape is. See RAIL_PUSH.

   So the shapes are free, and they are assigned RANDOMLY — which is the ask,
   and which the sequence constraint could never have delivered. See
   railShape() for why the randomness is a hash rather than Math.random. */
const CHAPTERS: {
  year: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  place: string;
  slug?: string;
  /* no photography yet — render the wordmark on a maroon field instead
     (the Discover tile's coming-soon treatment) */
  wordmark?: boolean;
}[] = [
  {
    year: "1987",
    title: "Bintang opens in Camden",
    body: "Chef Omar's parents open the original family restaurant on Kentish Town Road — a Filipino kitchen with a fusion accent that becomes a neighbourhood fixture.",
    image: "/images/bintang.jpg",
    imageAlt: "Bintang's dining room in Camden",
    place: "Camden",
    slug: "bintang",
  },
  {
    year: "2007",
    title: "Guanabana arrives",
    body: "A halal-certified Caribbean and Latin American kitchen joins the family in Kentish Town. The Sunday Island Roast becomes a neighbourhood ritual.",
    image: "/images/guanabana.jpg",
    imageAlt: "Guanabana, Kentish Town",
    place: "Kentish Town",
    slug: "guanabana",
  },
  {
    year: "2017",
    title: "Mamasons",
    body: "London's first Filipino ice-cream parlour brings dirty ice cream from Manila's street stalls to Camden, Soho and Shoreditch.",
    image: "/images/cafemama.jpg",
    imageAlt: "Mamasons-era street counter",
    place: "Camden · Soho",
    slug: "mamasons",
  },
  {
    year: "2018",
    title: "Ramo Ramen",
    body: "The world's first Filipino-Japanese ramen joint opens on Kentish Town Road; a second site follows in Soho in 2021.",
    image: "/images/ramo.jpg",
    imageAlt: "Ramo Ramen dining room",
    place: "Kentish Town",
    slug: "ramo",
  },
  {
    year: "2019",
    title: "Hoodwood",
    body: "A Caribbean takeaway opens with the Jacket Exchange — trade a winter coat, take a free jerk jacket potato.",
    image: "/images/hoowood.jpg",
    imageAlt: "Hoodwood, Kentish Town",
    place: "Kentish Town",
    slug: "hoodwood",
  },
  {
    year: "2025",
    title: "Café Mama & Sons",
    body: "A Filipino-Japanese café and bakery brings hand-crafted sandos and the award-winning Longanisa Breakfast Burger to the morning crowd.",
    image: "/images/cafemama.jpg",
    imageAlt: "Café Mama & Sons storefront",
    place: "Kentish Town",
    slug: "cafemama",
  },
  {
    year: "2025",
    title: "Belly",
    body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen, reading Filipino flavour through a French lens.",
    image: "/images/belly.jpg",
    imageAlt: "Belly dining room, Kentish Town",
    place: "Kentish Town",
    slug: "belly",
  },
  {
    year: "2026",
    title: "Belly enters the Michelin Guide",
    body: "Belly is added to the Michelin Guide for Greater London — recognising thirty-eight years of Filipino kitchens in London.",
    image: "/images/belly.jpg",
    imageAlt: "Belly added to the Michelin Guide",
    place: "Kentish Town",
    slug: "belly",
  },
  {
    year: "2026",
    title: "Bunso — coming soon",
    body: "The youngest of the family: a Filipino-Japanese kissaten and listening jazz bar, opening in London in 2026.",
    image: "/images/bunso.png",
    imageAlt: "Bunso wordmark",
    place: "London",
    slug: "bunso",
    wordmark: true,
  },
];

/* ---------------------------------------------------------------------------
   THE SHAPES ARE DEALT, NOT TYPED.

   The ask is that the two card shapes appear in a random order rather than in
   the run-of-each the previous geometry forced. What "random" cannot mean here
   is Math.random: this array is built during the module's evaluation, which
   happens once on the SERVER for the static HTML and again in the browser at
   hydration. Two draws, two different decks, and React reconciles a nine-card
   3D scene against markup that disagrees with it about every card's width.

   So the randomness is a HASH — a deterministic function of the chapter's own
   title, which is stable across the server, the client, a rebuild and a
   redeploy, and which nothing has to store. FNV-1a because it is four lines
   and mixes the low bits well; the low bit alone picks the shape.

   THE DEAL IT PRODUCES, printed here because a hash is only "random" if
   somebody has looked at what it actually gave:

     1987 Bintang      L      2025 Cafe Mama    P
     2007 Guanabana    P      2025 Belly        P
     2017 Mamasons     L      2026 Michelin     L
     2018 Ramo         P      2026 Bunso        L
     2019 Hoodwood     L

   L P L P L P P L L — five landscapes and four portraits, no run longer than
   two, and three portrait -> landscape steps. Under the old geometry every one
   of those three steps was a 62.9px side intrusion, which is exactly the deck
   this ordering used to be forbidden from producing. See RAIL_PUSH.

   IT IS ONE FIELD, NOT TWO. `layout` still means the same thing it always did
   and the narrow-screen list branch still reads it (image-left spread vs
   text-left tall image), so a chapter has one declared proportion and both
   branches spend it. What changed is only where the value comes from. */
const railShape = (key: string): "landscape" | "portrait" => {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 1 ? "portrait" : "landscape";
};

const STORY = CHAPTERS.map((chapter) => ({
  ...chapter,
  layout: railShape(chapter.title),
}));

/* NO DATE. lib/press.ts carries 24 entries and 23 of them have `date: "—"`,
   so the column this row used to reserve was blank on all but one line —
   a fixed 48-72px track and its gutter held open across the whole table to
   print a single "2025". A reserved empty track is worse than no track: it
   reads as data that failed to load. The column is removed rather than
   hidden, so nothing is left paying grid for it; if the dates ever arrive it
   comes back with them. */
type CoverageRow = {
  outlet: string;
  feature: string;
  restaurants: string[];
  url: string;
  // resolved hover-image path (bespoke press override, else the first
  // credited restaurant's photo) — absent when only a missing placeholder
  // would resolve, so the row simply skips the hover treatment
  image?: string;
};

// hover-image guard — these restaurant `image` paths are placeholders that
// don't exist under /public yet (Mamasons, Bunso). Rows resolving to them
// get no hover image at all rather than a broken <img>.
const MISSING_IMAGES = new Set([
  "/images/mamasons-placeholder.jpg",
  "/images/bunso-placeholder.jpg",
]);

/* The restaurants that actually have press, most-covered first, as names.
 *
 * DERIVED, NOT TYPED, because the sentence it feeds says a number and a list
 * and both have to stay true: four of the seven kitchens have no coverage at
 * all today, and the first write-up for any of them must put it in the line
 * rather than leave the line quietly wrong. See .coverageCount. */
const COVERED_RESTAURANTS: string[] = (() => {
  const n = new Map<string, number>();
  for (const p of PRESS)
    for (const slug of p.restaurants) n.set(slug, (n.get(slug) ?? 0) + 1);
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => getRestaurant(slug)?.name ?? slug);
})();

const COVERAGE_GROUPS: { outlet: string; entries: CoverageRow[] }[] = (() => {
  const byOutlet = new Map<string, CoverageRow[]>();

  for (const p of PRESS) {
    // bespoke press image first, else the first credited restaurant's
    // canonical photo — dropped entirely when only a known-missing
    // placeholder would resolve
    const image = p.image ?? getRestaurant(p.restaurants[0])?.image;

    const row: CoverageRow = {
      outlet: p.outlet,
      feature: p.feature,
      restaurants: p.restaurants.map((s) => getRestaurant(s)?.name ?? s),
      url: p.url,
      image: image && !MISSING_IMAGES.has(image) ? image : undefined,
    };

    if (!byOutlet.has(p.outlet)) byOutlet.set(p.outlet, []);
    byOutlet.get(p.outlet)!.push(row);
  }

  return [...byOutlet.entries()]
    .map(([outlet, entries]) => ({ outlet, entries }))
    .sort((a, b) => priorityOf(a.outlet) - priorityOf(b.outlet));
})();

/* ===========================================================================
   THE STORY DECK
   ===========================================================================

   The nine chapters as one vertical deck of cards receding UPWARD and away
   from the camera, advancing through a front seat as the reader scrolls.

   IT REPLACES THE PHOTOGRAPHY, NOT THE SECTION. Everything around it is the
   section's original furniture and stays that way: the deck lives inside the
   pinned-video scope on the dark scrim, inside `.container`, as the second
   column of the original `.storyShell` grid, beside the original sticky year
   wheel at its original size. The copy uses the original `.storyMeta` /
   `.storyTitle` / `.storyBody` / `.storyLink` treatment. What used to be nine
   scrolling glass cards each holding one photograph is now one pinned deck
   holding all nine — that substitution is the whole change.

   THE CAMERA. `perspective: 1400px` lives on .railStage and NOWHERE else. One
   perspective declaration is what makes the nine cards share a camera; a
   second one anywhere in the subtree gives that branch its own vanishing
   point and the stack visibly kinks. `perspective-origin` stays at its
   default 50% 50%, so the vanishing point is pinned to the STAGE's centre —
   the stage box is shaped so that its centre IS the front seat. Offsetting
   the cards inside the stage instead would shift every projected position by
   (offset × (1 − scale)), i.e. quietly change the geometry rather than move
   it.

   THE RESTING TRANSFORM IS STILL ONE WRITE. Card j's static transform is
     translate3d(j·Sx, j·Sy, -j·Sz) rotateX(tilt)
   and the track carries
     translate3d(-t·Sx, -t·Sy, +t·Sz)
   so card j resolves to depth index k = j − t without any per-card transform
   being touched. The cards' `--i` is a plain custom property, so their
   transforms are static CSS the compositor never re-reads.

   THE EXIT IS THE ONE THING THAT SPENDS PER-CARD WRITES, and it is worth
   them — see RAIL_EXIT_* below.

   WHY NOT WebGL. Nine photographs sharing one camera is a textbook case for a
   canvas, and a canvas would have deleted all nine chapter bodies from the
   DOM. The whole editorial text ships in the server HTML and stays crawlable;
   that constraint chose the technique.                                     */

/* Fixed deck parameters. Derived once, quoted here so the CSS and the JS can
   never drift apart: the stylesheet spends them as --rail-sx/sy/sz on the
   cards, this module spends the same numbers on the track.

   SX IS ZERO. The deck is vertical. It stays as a named constant rather than
   being dropped from the arithmetic because the CSS/JS mirror is the one
   invariant here that cannot be checked by looking at either file alone —
   three numbers on both sides, always, even when one of them is 0.

   SY, SZ AND THE TILT ARE SOLVED, not chosen, from the reference's front-card
   trapezoid (513 across the top, 402 across the bottom, 473 tall) and its
   strip series (48, 44, 41, 38px above the front card's top edge). The full
   solve is in the stylesheet's deck header; the short version is that the
   taper and the projected height together over-determine the card and give
   tilt = 36.09°, true card 451 × 577. Sz = 60 then sets how fast the strip
   series decelerates and Sy = -56 sets its size, reproducing 48.6, 44.3,
   40.6, 37.3 — the measured series to within a pixel.

   Sy is NEGATIVE: cards go up the screen, and a card with a negative depth
   index therefore gets a positive Y from the same shared track transform and
   drifts DOWN. The exit below accelerates that drift rather than inventing a
   direction for it. */
const RAIL_SX = 0; // per-card X step, px — the deck is vertical
const RAIL_SY = -56; // per-card Y step, px (up the screen)
const RAIL_SZ = 60; // per-card Z step, px (away from the camera)
const RAIL_LAST = STORY.length - 1; // t rests here at pin release

/* Mirrors of three more stylesheet values. The tilt and the card height used
   to live only in CSS because nothing in JS needed them; the upright seat
   below is derived from both, so they cross the boundary now and are subject
   to the same never-drift rule as the steps above. */
const RAIL_TILT = 36; // deg, mirrors --rail-tilt (negated there)
const RAIL_P = 1400; // px, mirrors .railStage's perspective

/* ---------------------------------------------------------------------------
   THE CARD IS NO LONGER ONE SIZE, and this table is the mirror of it.

   THE BASE HEIGHT IS THE GEOMETRY. Every derived number in this file — the
   strip series, the mat, the seat percentage, the upright compensation's own
   projection factor — is a function of where the cards' TOP EDGES land, and
   the top edge is set by --rail-base-h. The variants below change a card's
   own box and nothing else: the stylesheet's .railCard offsets each one's
   layout `top` by 0.0954915 of the height difference and pushes it back by
   0.293893 of the same, which cancels both halves of the change and leaves
   every variant sharing one projected top edge. The full proof is with
   --rail-base-h in About.module.css.

   THAT IS THE WHOLE REASON THIS IS SAFE. Vary a card about its centre — the
   obvious reading of "make some of them a different size" — and nine cards
   get nine top edges, the strip series stops being a series, and the mat's
   coverage requirement becomes a different number for every pair. Vary them
   downward from a common top edge and none of that moves at all.

   THE VARIANT IS READ OFF THE CHAPTER'S OWN `layout`, not stored twice:
   landscape -> the short wide card, portrait -> the tall narrow one. It is
   the same field the narrow-screen list branch shapes its chapters with, so a
   chapter declares its proportion once and both branches spend it.

   THE HEIGHTS USED TO BE THE PART THAT COST SOMETHING, and they are free now.
   The old 424/452/480 spread was frozen at ±6% for one reason: the year wheel
   and the copy were hung off the SEAT CARD'S CENTRE, which sits (h − h0)/2
   lower for a taller variant, so every pixel of height spread was a pixel
   both side columns had to travel at every chapter change. Anything wider
   than 424/452/480 read as the layout jumping.

   THE AXIS IS NO LONGER THE SEAT CARD'S (see railAxisOffset below). Both side
   columns now hang off the deck's own fixed geometry — the projected top edge
   every variant shares, plus a constant — so they are stationary by
   construction whatever is seated, and the heights are free to say what the
   shapes actually are:

     landscape  322 x 262   1.23:1   a true landscape print, wider than tall
     portrait   248 x 300   0.83:1   a true portrait, narrow and tall

   THE BOXES ARE SMALLER THAN THEY LOOK, and that is RAIL_PUSH's doing rather
   than a decision about card size. The seat card is now magnified 1.4111 by
   the push instead of 1.1048, so the same PROJECTED card needs a box 78% the
   size. What the reader sees is bigger than before, not smaller:

     shape       box        projected at the seat      was
     landscape   322 x 262  455.0 x 370.2  (1.23:1)    441.9 x 388.9
     portrait    248 x 300  350.0 x 423.3  (0.83:1)    296.1 x 441.9

   so the landscape card is 13px WIDER and 19px SHORTER than it was, which is
   the ask, and the portrait one is 54px wider — which is not an ask but is
   the price of the push (see RAIL_PUSH: the seat's width ratio is the whole
   budget, and 455/350 = 1.30 is what a push of 275 buys).

   THE DIFFERENCE IS STILL SPENT ON WIDTH, NOT HEIGHT, and the reason has not
   changed. Width is free — rotateX touches y and z only, so it plays no part
   in the strip series, the mat's requirement or the drop. Height is the
   expensive axis: once the two shapes are centred on one line, every pixel of
   height difference moves the seat card's TOP edge half a pixel, and the top
   edge is what the strip series, the mat and the mark are all measured from.
   The budget is a PROJECTED height difference of at most ~56px (see
   railUprightDrop); 423.3 - 370.2 = 53.1 spends it with 3px to spare, exactly
   as the 48px box difference did before the push.

   --rail-base-h STAYS 452 AND IS NOW NOBODY'S HEIGHT. It was the middle
   variant's own box and it is a pure reference plane: every derived number in
   this file — the strip series, the mat's requirement, the seat percentage,
   the axis — is a function of where the shared top edge lands, and that is
   h0's job alone (see .railCard's `top`, where h cancels). Keeping it at 452
   is what leaves the composition, the 76px mat and --rail-axis-offset exactly
   where they were measured while the cards under them change.

   ---------------------------------------------------------------------------
   THE ORDER USED TO BE PART OF THE GEOMETRY, AND IS NOT ANY MORE. This is the
   record of what it cost and what replaced it, because the constraint it
   encoded is real and only the answer changed.

   THE PROBLEM. A card at depth k = 1 is magnified 1.054886 and the upright
   seat card was magnified 1.104836, so a card behind showed nothing at the
   sides only while it was no more than 4.735% wider than the one seated. The
   two shapes were 49% apart, so a landscape card sitting behind a SEATED
   PORTRAIT poked out 62.9px each side — measured, at rest, at 1440 — which is
   the whole of "the cards not in view are cutting the card in view".

   THE OLD ANSWER WAS THE SEQUENCE. The card at k = 1 is the NEXT chapter, so
   the intrusion happens once per portrait -> landscape STEP, and a sequence
   with no such step is any run of landscapes followed by any run of portraits.
   Hence LLLLLPPPP, and hence "the cards are in blocks" — which is exactly what
   the shapes are now asked NOT to be. Ordering cannot deliver both.

   THE NEW ANSWER IS DEPTH, and it is the same primitive that was already
   solving the stacking bug one paragraph down: push the seat card forward
   until its projected box out-measures anything that can be behind it. See
   RAIL_PUSH, where the number is solved rather than picked.

   THE OTHER DIRECTION IS STILL CHECKED. A short card seated with a tall one
   behind it can be poked out BELOW instead. It was the binding case while the
   heights were 148px apart — measured, the portrait's foot showed 16.6px below
   the landscape's at 1440 mid-swap, which the at-rest algebra does not see.
   The projected height difference is 53.1px now and it clears by well over a
   hundred projected px. Measured overhang, either axis, 61 sweep positions,
   at 1920 / 1440 / 1240: scripts/probe-sliver.mjs is that measurement. */
const RAIL_BASE_H = 452; // px, mirrors --rail-base-h — a reference, not a card
const RAIL_VARIANTS = {
  /* `sizes` is the card's own widest PROJECTED scanline, rounded up — the
     seat card is magnified 1.4111 by RAIL_PUSH, so 322 -> 455 and 248 -> 350.
     It lives beside the box it describes rather than at the call site so the
     two can never say different things about the same card. Both went UP with
     the push even though both BOXES went down: `sizes` describes pixels on
     screen, and the projected card is what lands there. */
  landscape: { cls: "", h: 262, sizes: "(min-width: 1200px) 460px, 100vw" },
  portrait: {
    cls: styles.railCardTall,
    h: 300,
    sizes: "(min-width: 1200px) 356px, 100vw",
  },
} as const satisfies Record<
  (typeof STORY)[number]["layout"],
  { cls: string; h: number; sizes: string }
>;

/* THE BREAKPOINT BANDS, mirroring the two media queries at the foot of the
   stylesheet. JS needs them because it needs each card's TRUE height in px —
   the upright compensation below is linear in it, and it used to be built
   from a hard-coded 560 that was a documented ~2px error at the narrow
   breakpoint. With variants that same shortcut would have been a ~15px error
   per card, in the one place (the seat card's top edge) where the deck has no
   slack at all.

   Read once per breakpoint crossing through useSyncExternalStore, never in
   the scrub path. */
const RAIL_BANDS: [string, number][] = [
  ["(min-width: 1440px)", 1],
  ["(min-width: 1320px)", 0.9],
];
const RAIL_BAND_FLOOR = 0.8;

/* ---------------------------------------------------------------------------
   THE SEAT CARD STANDS UPRIGHT.

   Tilt is a function of depth, not a constant: 0° at the front seat, easing
   to the full 36° by k = 1 and holding there. The chapter being read is
   square to the camera and perfectly legible; everything behind it keeps the
   rake that makes the stack a stack. This is a deliberate departure from the
   reference image, where the front card is tilted like the rest.

   It also turns the advance into a physical move for free — a card ROTATES
   upright as it arrives rather than sliding into place — and the smoothstep
   is what keeps that from looking hinged.

   THE DROP IS THE CATCH, and without it the effect quietly breaks the deck.
   A tilted card's top edge leans (h/2)sin(36°) = 165px toward the camera, so
   it projects at P/(P−u) = 1.133× and lands at −256.7 from the seat. Stand
   the same card up and its top edge stops leaning: it projects at 1.0× and
   lands at −280, i.e. 23.3px HIGHER. That eats the first strip — the measured
   48.6px gap to card 1 collapses to 25.3 — and the top of the stack reads as
   a mistake.

   So an upright card is compensated on the same smoothstep, in BOTH axes,
   and the second one is not optional.

   THE WIDTH. The same 1.133× that magnifies a raked card's top edge magnifies
   it sideways too: card 1 behind projects 476px wide where the upright seat
   card projects 440. The stack poked out ~18px each side and the chapter
   being READ looked inset, or clipped, behind the ones it was supposed to be
   in front of. So the seat card is scaled by exactly the P/(P−u) its own
   tilted top edge would have had. That also leaves it 4.9% wider than card 1
   rather than merely equal, which is correct — it is nearer the camera and
   should read that way.

   THE DROP then follows from the scale rather than standing alone: pinning
   the top edge means (h/2)·s − drop = a·s, so drop = s·(h/2 − a). Both fall
   out of the same two primitives, which is the point of deriving them here
   instead of typing numbers — change the card or the angle and they stay
   true.

   THEY ARE FUNCTIONS NOW, NOT CONSTANTS, and that is the fix for a defect
   this file used to carry as a comment. Both are linear in the CARD'S OWN
   height and both were hard-coded off 560: at the narrow breakpoint the card
   was 471 and the pair over-shot by 10.8 screen px, pushing the seat card
   down and growing the first strip from a predicted 49.7 to a measured 54.9.
   Documented as "~2px out"; measured, it was five times that. With three
   breakpoint bands and three size variants there are now nine heights, so a
   single constant would be wrong eight ways instead of one. Each card
   computes its own from `variant.h * scale`, once per render. */
/* The forward lean of a raked card's top edge, (h/2)·sin36° — and the single
   number the seat card's whole compensation is built from.

   IT IS ALSO A STACKING FIX, which is how the geometry announced itself. A
   raked card at k = 1 sits at z = −60, but its top edge leans forward, so
   that edge ends up IN FRONT of an upright seat card whose entire plane is at
   z = 0. The browser sorted it correctly and drew the card behind across the
   front of the card being read. Nothing was wrong with the paint order; the
   card genuinely was nearer. Tilting the seat card used to hide this, because
   its own top leaned forward by the same amount.

   So the seat card is pushed forward by exactly u. Its plane lands clear of
   card 1's, and — because the push IS the magnification P/(P−u) — it picks up
   the same width a `scale()` was faking, so the width compensation and the
   stacking fix are one operation. A 2D scale was always a stand-in for depth;
   this is the depth. */
const railUprightZ = (h: number) =>
  (h / 2) * Math.sin((RAIL_TILT * Math.PI) / 180);

/* ---------------------------------------------------------------------------
   RAIL_PUSH — the extra depth that makes SIDE INTRUSION IMPOSSIBLE, so the
   shapes can be dealt in any order at all (see railShape).

   THE CONDITION, in one line. Every card's top edge lands on the plane
   z = 0.293893·h0 by construction, so a card at depth k projects, at its
   widest scanline, by M(k) = P/(P − 0.293893·h0 + k·Sz); the upright seat card
   projects by M_s = P/(P − 0.293893·h0 − PUSH). Nothing behind can show at the
   sides iff

     w_widest · M(1)  ≤  w_narrowest · M_s

   and M(k) is strictly decreasing in k (the −60/step dominates the ≤3px the
   partly-raked top edge gains mid-swap), so k = 1 is the only case to solve.
   Writing A = P − 0.293893·h0 = 1267.16 and R for the ratio of the two shapes'
   PROJECTED widths at the seat, the condition rearranges to

     PUSH ≥ A − (A + Sz)/R          i.e.   R ≤ (A + Sz)/(A − PUSH)

   With PUSH = 0 that is R ≤ 1.0473, which is the 4.7% the sequence constraint
   existed to work around. The solved values:

     R (projected)   PUSH required   M_seat
     1.05                     0.0     1.105   (today, the sequence constraint)
     1.15                   113.3     1.213
     1.25                   205.4     1.319
     1.30 (this)            240.7     1.411   at 275, with 4.9px of margin
     1.4925 (the old 400/268)  378.0  1.574

   275 IS 1.30 WITH REAL MARGIN RATHER THAN THE EXACT SOLUTION, and the margin
   is per band: measured clearance between the widest card behind and the
   narrowest seated card is 4.93 / 3.87 / 2.96px each side at scale 1 / 0.9 /
   0.8. It is POSITIVE AT EVERY BAND, which is the whole point, and it is the
   reason this constant is NOT multiplied by --rail-scale: Sz does not scale
   either, so a push that scaled would hand the narrow bands a ratio ceiling of
   1.29 while the wide band got 1.39, and the deck would intrude at 1240 only.

   WHAT IT COSTS, and it is not free. Three things, all measured:

   1. THE CARDS BEHIND ARE NARROWER THAN THE ONE IN FRONT, necessarily. At the
      solution the widest card behind projects EXACTLY as wide as the narrowest
      seated card — that identity is forced, and no choice of P, Sz or PUSH
      changes it. So under a seated landscape (455px) the strips are 350px and
      272px wide rather than the 422/296 they were: the stack reads as smaller
      prints receding rather than as a flush deck. This is the honest price of
      "any order", and it is visible.

   2. THE MAT IS A BIGGER FRACTION OF THE CARD. Its requirement is a screen
      quantity on the card BEHIND, so it is unchanged at 84 card-local px (see
      --rail-mat-h) — but the seat card's own box shrank by 22%, so the band
      goes from 24% of the landscape card's face to 32% (40% at the 0.8 band).
      Nothing is uncovered; the darkened band is simply deeper.

   3. THE EXIT IS BIGGER. A departing card starts from z = +408 rather than
      +133, so RAIL_EXIT_Z carries it to a 1.98× magnification where it used to
      reach 1.53×. See RAIL_EXIT_Z, which is re-derived for that.

   WHAT IT DOES NOT COST: the strip series, the mat's coverage, the mark's
   floor, --rail-axis-offset and the year wheel are all functions of h0 and of
   the cards BEHIND the seat, none of which this touches. Measured strips are
   63.4 / 36.4 screen px against 63.2 / 36.7 before it. */
const RAIL_PUSH = 275;

/* ---------------------------------------------------------------------------
   THE SEAT CARDS ARE CENTRED ON ONE LINE, and this is where that is paid for.

   WHAT WAS ASKED, AND WHY IT IS NOT FREE. Every card is laid out from the
   BASE height's top edge and pushed back by the matching fraction of the
   difference, so all nine share one projected top edge — see .railCard, where
   h cancels out of both the world y and the world z of every point on the
   card. That shared top edge is what the strip series, the mat's coverage
   requirement and the upright compensation are all derived from, and it is
   the reason the size variants were safe at all.

   It also means a short card and a tall one hang from the same line and grow
   downward, so their CENTRES differ by exactly (h − h′)/2. On the pair this
   deck used to carry — 332 and 480 — that is 74 world px, 82 on screen: the
   landscape chapters sat visibly high against the portrait ones and the
   seated card's mass jumped down the frame at chapter 6. That is what
   "align with the middle" is about, and it is real.

   YOU CANNOT HAVE BOTH, AND THE PROOF IS ONE LINE. An upright card's centre
   is h/2 below its own top edge. Pin the top edge and the centre is at
   −0.4045085·h0 + h/2; equal centres therefore require equal h. A shared top
   edge and aligned centres are the same statement only when the cards are the
   same height. So one of the two has to move, and it is the top edge.

   WHAT MOVES, AND ONLY FOR THE SEAT CARD. The raked stack behind is untouched
   — every card there still hangs from the shared line, so the strip series
   between k = 1, 2, 3 … is exactly the series it always was. What changes is
   the seat card, which is upright and already carries a bespoke drop: it is
   given a further (H̄ − h)/2 so that its centre lands on the same world line
   whatever is seated. Both shapes are magnified by the same P/(P − u) (see
   railUprightZ — the variant's z compensation and the upright push sum to
   0.293893·h0 for every h), so equal world y is equal screen y.

   WHAT IT COSTS: THE FIRST STRIP, AND NOTHING ELSE. Moving the seat card's
   top edge moves the one gap that is measured against it — card 1's strip
   above the seat. It opens when a short card is seated and closes when a tall
   one is, by (H̄ − h)/2 × 1.104836:

     seated shape   shift      first strip      (was 49.9 for both)
     landscape 352  +12 down       63.2
     portrait  400  −12 up         36.7

   and the strips behind it are unchanged at 45.7, 41.8, 38.5, 35.6, …

   THAT WINDOW IS THE WHOLE BUDGET, and it is why the two heights are 48px
   apart rather than 148. The strip has a floor and a ceiling:

     - the CEILING is the mat. The band has to cover whatever shows, so a
       first strip bigger than the mat's projected 76-odd px puts photograph
       above the seat card. --rail-mat-h goes to 84 to carry the 63.2.
     - the FLOOR is the mark. Each card's wordmark sits 9..35 card-local px
       below its own top edge, which projects to ~35 screen px, so a strip
       shorter than that slices the mark of the chapter coming next.

   The window is therefore about [35, 78] screen px around a 49.9 resting
   value, i.e. ±14 of shift, i.e. |H̄ − h| ≤ 25, i.e. a height difference of
   at most ~50px. 48 is that, with 3.4px of margin at the mark and 15.0 at the
   mat. A 148px difference would need the mat at ~108 card-local px (a third
   of the landscape card's face) and the mark cropped to ~10px, and it would
   still leave a 9px hairline of a strip on every portrait chapter. It is not
   worth having; the difference is spent on WIDTH instead, which costs
   nothing at all — see RAIL_VARIANTS.

   H̄ IS THE MEAN OF THE TWO HEIGHTS rather than either of them, so neither
   shape takes the whole shift and the strip moves ±12 rather than +24 or −24.
   It is derived from the variants rather than typed, so a change to either
   card's height cannot leave the centre line pointing at nothing. */
const RAIL_SEAT_H = (RAIL_VARIANTS.landscape.h + RAIL_VARIANTS.portrait.h) / 2;

/* The drop that seats the card, expressed in the 3D space BEFORE projection —
   it is applied at z = +u and so arrives on screen magnified.

   TERM ONE pins the top edge where the raked geometry expects it, and it is
   the term RAIL_PUSH re-derived. It used to be a pure card-local quantity —
   (h/2)(1 − cos θ) — because the seat card was at exactly the depth a raked
   card's top edge reaches, so the pin was an identity that never touched the
   projection. With the extra push the seat is at a DIFFERENT depth from the
   plane it is being pinned to, so the two magnifications no longer cancel:

     want   y_top(seat) · M_s  =  −0.4045085·h0 · M_0
     with   M_0 = P/(P − 0.293893·h0)          the raked plane
            M_s = P/(P − 0.293893·h0 − PUSH)   the pushed seat

   which gives y_top(seat) = −0.4045085·h0 · r, r = M_0/M_s, i.e. the world
   top edge has to move UP THE FRUSTUM by (1 − r) of itself to land on the same
   screen line. Term one is that: 0.4045085·h0·(1 − r).

   GET IT WRONG AND THE STRIP IS THE THING THAT TELLS YOU. Left at the old
   identity, the pushed seat card projects its top edge 65px higher than the
   raked geometry expects and the first strip goes NEGATIVE — the card behind
   disappears entirely under the one in front. That is the failure this line
   exists to prevent, and it is why the term is written from r rather than
   from the angle.

   TERM TWO is unchanged in intent and now carries no projection of its own:
   it moves the card off that line to put its CENTRE on the shared one — see
   the block above. It is zero for a card of the mean height and opposite in
   sign for the two shapes, so the two terms are a pin and a correction to the
   pin rather than two competing ideas.

   THE BUDGET IT SPENDS IS BIGGER NOW, PROPORTIONALLY. Term two is a WORLD
   offset applied at the seat's depth, so it arrives on screen magnified by
   M_s — 1.411 rather than 1.105. The first strip therefore moves by
   (Δh/4)·M_s screen px, and the window between the mark's foot (33.3) and the
   mat's coverage (78.2) is unchanged, so the PROJECTED height difference the
   two shapes may carry is still ~56px. Measured for 262/300: strips of 63.44
   (landscape seated) and 36.44 (portrait seated) at every band, against a
   33.26 floor and a 78.15 ceiling. */
/* `scale` is the breakpoint band's card scale, and it is a separate argument
   rather than being folded into `h` because the terms need it differently:
   term one is a fraction of the BASE height, which has to be scaled here
   because h0 is not passed; term two is a difference against the mean height,
   which has to be scaled to match or a 0.8-band card would be corrected by a
   full-size number and land 30px off its own centre line. */
const railUprightDrop = (h: number, scale: number) => {
  const zRaked = railUprightZ(RAIL_BASE_H * scale);
  /* M_0 / M_s — the fraction of itself the pinned top edge has to give up to
     survive the push. 1 when RAIL_PUSH is 0, which is the old identity. */
  const r = (RAIL_P - zRaked - RAIL_PUSH) / (RAIL_P - zRaked);
  return (
    (0.5 - 0.0954915) * RAIL_BASE_H * scale * (1 - r) -
    (0.5 - 0.0954915) * h +
    (RAIL_SEAT_H * scale) / 2
  );
};

/* ---------------------------------------------------------------------------
   THE AXIS — the one line the year wheel, the deck and the copy are placed
   against, and the fix for two complaints that turned out to be one.

   IT USED TO BE THE SEAT CARD'S CENTRE. That is a defensible thing to align
   to and it measured true: probe-thirds put the year, the seat and the copy
   within 1px of each other at every dwell. It also made the axis a FUNCTION OF
   WHATEVER IS SEATED — the centre of a variant of height h sits (h − h0)/2
   lower than a base card's — so:

     - every chapter change moved both side columns, 15px between neighbours
       and 31px across the bookends, easing over 0.55s while the deck swapped;
     - the height spread had to stay inside ±6% or that movement read as the
       layout jumping, which is why the cards were all very nearly one size;
     - and the axis itself sat wherever the seated card's centre happened to
       be, measured at y = 638 / 653 / 669 in a 1080 frame — 100 to 130px
       BELOW the middle of the screen, and 30px apart chapter to chapter.

   "the content in the left middle and right are not properly centered" is all
   three of those at once, and none of them is an alignment error between the
   columns. So the columns stop hanging off the seated card.

   THE SHARED PROJECTED TOP EDGE IS THE ANCHOR. Every variant is laid out from
   the base height's top edge and pushed back by the matching fraction of the
   difference (see .railCard), so the top edge lands at world y = −0.4045085·h0
   on the plane z = 0.293893·h0 FOR EVERY CARD — h drops out of the expression
   entirely. Projected, that is a constant offset from the seat, and it is the
   one piece of the deck's geometry that no chapter can move.

   THE CONSTANT below it is 145px at scale 1, and it is chosen rather than
   derived: it puts the axis within 8px of the middle of the frame at every
   band tested (447 in a 900 frame whose centre is 450; 548 in a 1080 whose
   centre is 540; 316 in a 640 whose centre is 320), which is what "properly
   centered" asks for. It scales with the deck so the relationship holds when
   the card does.

   WHAT THIS BUYS, beyond not moving: the heights are free. See RAIL_VARIANTS. */
const railSeatTop = (h0: number) =>
  -(0.5 - 0.0954915) * h0 * (RAIL_P / (RAIL_P - railUprightZ(h0)));

/** px below the shared top edge, at scale 1 — see above */
const RAIL_AXIS_DROP = 145;

/** The axis, in screen px relative to the seat. A function of the BAND alone:
 *  it cannot change during a scrub because nothing in it is a function of `t`,
 *  of `active`, or of the seated card's own height. */
const railAxisOffset = (scale: number) =>
  railSeatTop(RAIL_BASE_H * scale) + RAIL_AXIS_DROP * scale;

/** 0 at the seat, 1 from k = 1 outward, smoothstepped between. Shared by the
 *  tilt and by the drop that compensates for it — they must ramp on the same
 *  curve or the top edge wanders during the swap. */
const railLean = (k: number) =>
  k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);

/* OPAQUE. Depth on a deck is OCCLUSION: a card behind the front one shows as
   a ~46px strip above its top edge and nothing else. Give the front card any
   alpha below 1 and eight ghosted photographs read through it at once. */
const RAIL_ALPHA = 1;

/* ---------------------------------------------------------------------------
   THE MAT — the darkened band above the photograph, and the reason the deck
   reads as a DECK rather than as nine overlapping pictures.

   THE PROBLEM, MEASURED. Occlusion is the whole depth cue (see RAIL_ALPHA), so
   a card behind the seat shows as a strip of its own top edge and nothing
   else: 50, 45, 42, 38, 35, 32, 30, 28 screen px at k = 1..8. Ours were
   photographs, so those were eight arbitrary crops — half an awning, a window
   frame, a parked car — and at 28-to-50px a photograph carries no legible
   content at all. Eight bands of noise stacked above the chapter being read.
   Every strip in the reference deck is a controlled field, and that is
   precisely why it reads as a deck of cards.

   IT IS THE PHOTOGRAPH, DARKENED — not a colour laid over it. The previous
   build inset the picture and painted a flat brand colour above it, rotating
   maroon / cream / saffron by index % 3. Two things were wrong with that and
   only one of them was visible. The visible one: no brand colours exist in
   lib/restaurants.ts, so three of the site's own were being spent as if they
   carried meaning they did not. The measured one: the veil darkens the mat
   and the mark TOGETHER, so a maroon mark on saffron started at 4.6:1 and
   fell under 3:1 from k = 2 — the strips that most needed to be readable were
   the ones that were not.

   So the picture now runs the full card and a scrim covers its top. The strip
   is that chapter's own photograph in near-darkness with a cream mark on it,
   which fixes both: nothing is invented, and a light mark on a dark band
   holds 3:1 to k = 4 because the veil moves the two apart rather than
   together. The ramp, the alpha and the per-chapter contrast measurements are
   with .railMat in the stylesheet.

   THE HEIGHT IS UNCHANGED AND STILL SOLVED, AND THE BINDING CASE IS STILL NOT
   THE LARGEST STRIP. In card-local px the mat has to satisfy

     screenY(k, -h0/2 + m) >= screenY(k-1, -h0/2)

   swept over the whole scrub rather than over the integers, because mid-swap
   the card in front is standing UP — its lean shrinks, so its top edge climbs
   and exposes more of the card behind it. That is ~6% above the at-rest
   figure: 56.2 card-local px against 53.0 at k = 1 on the widest band. Taking
   the at-rest figure would leave photograph showing through every swap, which
   is 45% of the section's running time.

   h0, NOT h — the base height, for every card. The size variants share one
   projected top edge by construction (see RAIL_VARIANTS), and the algebra
   that makes them share it also cancels h out of the expression above
   entirely: the mat's requirement is the same number on a 424 card as on a
   480 one. That is the property that made variants worth doing rather than
   worth arguing about.

   76px is that requirement with 35% of margin on the widest band and 27% on
   the narrowest, and the margin is the point rather than slack: a photograph
   fragment above a mat at ANY depth fails the whole idea. The rest of the
   derivation — including why it is an absolute height rather than a fraction
   of the card, which is not the obvious answer, and why a SMALLER card needs
   a LARGER mat — is with --rail-mat-h in the stylesheet.

   THE MARK IS A MASK. See .railMark for why an <img> could not work. */

/** The mark for a chapter, derived from its slug rather than stored beside it
 *  — all eight logo files are named for the slug they belong to, so deriving
 *  it is one fewer field that can drift out of sync with lib/restaurants.ts.
 *
 *  NULL ON THE WORDMARK CHAPTER, deliberately. Bunso ships no photography: its
 *  card face IS the Bunso wordmark on a maroon field. A mat mark on top of it
 *  would stack the same wordmark twice on one card at two sizes, which reads
 *  as a mistake rather than as branding. Its band stays a bare scrim over the
 *  maroon field — still a controlled strip, which is all the deck actually
 *  needs from it, and the wordmark below it is doing the naming already. */
const railMark = (chapter: (typeof STORY)[number]) =>
  chapter.wordmark || !chapter.slug ? null : `/logo/${chapter.slug}.png`;

/* ---------------------------------------------------------------------------
   THE EXIT — a fly-forward, and the one place this feature spends per-card
   transform writes.

   WHAT THIS REPLACED. The previous build dissolved a departing card in place,
   on the argument that no fly-past was available: a card that has left the
   seat is carried only by the shared track transform, which on a deck this
   shallow moves it 56px per step and magnifies it 1.045× at k = -1. It does
   not clear the front card until roughly k = -7. That argument was correct
   about the RAIL and wrong as a conclusion — the rail's own step is not the
   only thing a card can be given. This adds a second, per-card excursion on
   top of it, and the dissolve is gone.

   THE TRAJECTORY. For depth index k, let u = -k (so u > 0 means departed).
   The card gets an extra translate in track space:

     f  = min(1, u / RAIL_EXIT_U)        progress through the excursion
     e  = f²                             accelerating, so it PEELS away rather
                                         than sliding off at constant speed
     dy = RAIL_EXIT_Y · e                down the screen
     dz = RAIL_EXIT_Z · e                toward the camera

   Quadratic rather than linear because the read card should look like it is
   being released, not pushed: the first tenth of a step barely moves, the
   last tenth throws it out of frame. Cubic was tried and reads as a snap —
   the card is still nearly stationary at u = 0.3, which is inside its own
   copy's tenure, and then vanishes between two frames.

   THE NUMBERS ARE SET BY THE HANDOVER, not by taste. `active` is Math.round(t),
   so chapter j hands the copy over at exactly u = 0.5. At that instant the
   outgoing card must be clear of the incoming one, and "clear" is checkable:
   the outgoing card's top edge must sit below the incoming card's bottom
   edge. At u = 0.5, f = 0.714 and e = 0.510, so dy = 459 and dz = 265, which
   puts its top edge at +388 against the seat card's bottom edge at +203.
   185px of daylight at the exact frame the copy changes.

   RAIL_EXIT_U = 0.7 IS A CLAMP, AND THE CLAMP IS A HIT-TESTING FIX rather
   than a nicety. Chrome inverse-projects the pointer through each element's
   accumulated matrix and that inversion collapses once an element's own plane
   reaches z = perspective = 1400. A card's total depth is its rail depth
   (u·Sz, up to 480 at u = 8) plus this excursion plus the standing forward
   push a departed card carries (railUprightZ + RAIL_PUSH = 407.8). Freezing
   the excursion at u = 0.7 caps the whole thing at
   480 + 407.8 + 270 = 1157.8 — 242px of margin. WITHOUT the clamp, an unbounded
   u² reaches 1400 at about u = 1.35 and every card behind it silently stops
   being clickable while still rendering perfectly. That is exactly the bug
   RAIL_Z0 exists to prevent, arriving by a different door.

   By u = 0.7 the card is 1.67× and 1569px below the seat — off the bottom of
   any viewport — so freezing it there costs nothing visible. */
const RAIL_EXIT_U = 0.7; // depth index at which the excursion is complete
const RAIL_EXIT_Y = 900; // px down the screen at completion
/* 270, down from 355, and — like the 355 before it — this is not a change to
   the excursion. It is what is LEFT of the excursion once the card's standing
   forward push is counted, and that push just grew by RAIL_PUSH.

   A departing card is upright, so it already carries railUprightZ(h) + PUSH:
   407.8px at the seat on any variant, where it used to be 132.8. Held at 355
   the card would finish its exit at z = 804.8 and 2.51x, against the 1.61x it
   reached before — a card that ends its life two and a half times life size,
   sweeping 800px wide across the lower half of the pin.

   SO IT IS SOLVED FROM THE RATIO IT USED TO HAVE. The exit read as a release
   because the card grew 1.46x over its own seated size (1.609 / 1.104); 270
   reproduces that against the new seat: 1400/(1400 - 42 - 407.8 - 270) =
   2.057, i.e. 1.458x of 1.411. The trajectory is the one that was tuned
   against the handover, expressed against the depth the deck actually has.

   IT ALSO BUYS BACK THE HIT-TESTING MARGIN. Total depth at the tail is
   480 (rail) + 407.8 (upright + push) + 270 = 1157.8 against the camera plane
   at 1400 — 242px of margin, where 355 would have left 157 and the old
   geometry left 235. That plane is the one that silently killed hit-testing on
   five chapters once already; see RAIL_EXIT_U. */
const RAIL_EXIT_Z = 270; // px toward the camera BEYOND the upright push

/* Opacity is now ONLY a cleanup, never part of the effect. The card is
   already off-frame and behind .railPin's clip by u ≈ 0.55; this fade exists
   so that nothing is left composited forever, and it is placed well after the
   card is invisible so it can never be seen happening. The previous build
   used opacity AS the exit, which is what put the subject of the copy at 53%
   with two chapters reading through it. */
const RAIL_VANISH_FROM = 0.75;
const RAIL_VANISH_TO = 0.9;

/* ---------------------------------------------------------------------------
   THE RELEASE — how the deck hands over to the Awards sheet.

   WHAT WAS WRONG. The pin ends, and then roughly 2,000px — two and a bit
   screens — pass with nothing in frame moving at all: the deck simply scrolls
   away exactly as it was, fully lit, still seated on chapter 9, and then an
   opaque cream edge wipes up from the bottom and the section is over. The
   deck never acknowledges that it is finished. Everything else on this page
   arrives and departs deliberately; this one thing just stops.

   IT IS THE ENTRANCE, READ BACKWARDS. The assembly fans the deck open out of
   the seat as the section arrives (see RAIL_ENTER_*); the release pushes the
   whole thing away from the camera and lets it go. Enter and exit on the same
   axis is the one rule a departure like this has to obey — a deck that
   assembles from depth and then slides sideways, or dissolves in place, reads
   as two unrelated ideas.

   IT IS ONE TERM ON THE TRACK, plus one factor on nine opacities that were
   already being written. The track's transform is recomputed every scrub
   frame regardless, so the recede costs one subtraction; the cards' opacity
   is a useTransform that already existed, so the dim costs one multiply. No
   new element, no veil over the pin, nothing that could flatten preserve-3d
   — an opacity on the track itself would do exactly that, which is why the
   dim lives on the cards (each a leaf of the 3D chain) and not above them.

   THE RANGE STARTS WHERE THE SCRUB ENDS, never before it: `end end` is the
   frame the pin releases, so chapter 9 keeps its whole dwell. 0.72 of the
   following viewport is long enough to read as a deceleration rather than a
   cut, and it finishes while the deck is still on screen — a departure the
   reader never sees complete is the same as no departure at all.

   REVERSIBLE, like everything else here: it is a pure function of one scroll
   offset, so scrolling back up brings the deck forward and lights it again. */
const RAIL_RELEASE_Z = 320; // px pushed away from the camera, at completion
const RAIL_RELEASE_SPAN = 0.72; // fraction of the viewport after the pin
/* THE DIM FINISHES BEFORE THE RECEDE DOES, and the last 20% is why. A card is
   a near-black rectangle, so the tail of a linear fade is invisible over dark
   footage and faintly, distractingly visible over a bright frame — measured at
   1920, the seat card was still a 3.5% dark panel over a lit plate at the far
   end of the range. Fading out over the first 80% and letting the remaining
   travel happen unseen is also the better motion: a large surface should be
   gone before it finishes moving, not still arriving at zero as it stops. */
const RAIL_RELEASE_FADE = 0.8;

/* Z ORIGIN — not cosmetic, a hit-testing fix. Only the DIFFERENCE between the
   track's z and a card's z is visible, so any shared offset renders
   identically. It is not free, though: with the track running 0 -> +3360 (the
   naive framing) it crossed the camera plane between chapters 3 and 4, and
   chapters 4 to 8 became unclickable while still rendering perfectly.
   Measured, seat by seat: z=1260 hit 81/81 sample points, z=1680 hit 0/81.

   So the deck starts pushed back by its own full depth and the scrub brings
   it FORWARD to zero: the track runs -480 -> 0 and never has a positive z.
   Cards carry the same constant with the opposite sign. Expressed as
   LAST × SZ rather than as a literal so that changing the Z step can never
   quietly drop it below the deck's own depth. */
const RAIL_Z0 = RAIL_LAST * RAIL_SZ; // 480px

/* THE DECK PARKS, IT DOES NOT DRIFT. `t` does not run linearly through the
   pin: each chapter holds its integer for the first 55% of its step and the
   deck swaps over the remaining 45%.

   A linear scrub spends half its time between integers, and between integers
   no card is at the seat — one is leaving and the next has not arrived. The
   dwell makes the resolved state (seat card square to the camera, copy
   matching, everything else a strip behind it) the section's normal
   condition and the swap an event inside it. It is also what the reference
   does: its sequence advances by one stack REPLACING another down the page,
   discrete states rather than a continuous glide.

   45% for the swap rather than something sharper because the fly-forward
   needs room to read as a trajectory: the excursion spans u ∈ [0, 0.7], which
   is 70% of the move phase, ~200px of scroll. It is one breakpoint array
   inside the useTransform that was already there — no extra subscription, no
   state, no cost in the scrub path. */
const RAIL_DWELL = 0.55;

/* ---------------------------------------------------------------------------
   THE SPRING — the deck has mass; it does not track the wheel 1:1.

   `t` is the scroll's target, not its position. Everything downstream (the
   track, the nine exits, the nine tilts, the copy index) reads the SPRUNG
   value, so the whole deck shares one sense of inertia rather than having a
   springy card on a rigid rail.

   140 / 26 at mass 1. That is a damping ratio of 26 / (2·√140) = 1.10 —
   just past critical, so it settles without a single overshoot. Overshoot was
   the thing to avoid here specifically: a deck that passes its chapter and
   comes back reads as rubber-banding against the scroll, not as weight. ω is
   11.8 rad/s, so it settles in ~260ms — present enough to feel, short enough
   that it never lags the reader's thumb into a different chapter.

   restDelta 0.001 IS LOAD-BEARING, and it is the trap this codebase has hit
   before: a spring stops emitting once it decides it has arrived, and the
   default restDelta of 0.01 is calibrated for pixel values. `t` runs 0→8, so
   0.01 is 1% of a chapter — the deck would silently park a hair short of
   every seat, with the tilt not quite upright and nothing left running to
   finish it. 0.001 is 0.1% of a chapter, well below a pixel of card
   movement. The spring's target is always the true scroll position, so
   whenever it does rest it rests exactly where the scroll says. */
const RAIL_SPRING = {
  stiffness: 140,
  damping: 26,
  mass: 1,
  restDelta: 0.001,
  restSpeed: 0.01,
};

/* The scroll->t map, built once at module scope. Flat segments (dwell) and
   steep ones (swap) alternate; Motion's array form interpolates it in one
   pass. The 4% lead-in and lead-out live INSIDE the pin so the first chapter
   is readable for a beat before anything moves and the last one is still
   seated when the pin releases. */
const RAIL_STOPS = (() => {
  const lead = 0.04;
  const step = 0.92 / RAIL_LAST;
  const input: number[] = [0, lead];
  const output: number[] = [0, 0];
  for (let i = 0; i < RAIL_LAST; i++) {
    const a = lead + i * step;
    input.push(a + step * RAIL_DWELL, a + step);
    output.push(i, i + 1);
  }
  input.push(1);
  output.push(RAIL_LAST);
  return { input, output, step, lead };
})();

/* ---------------------------------------------------------------------------
   THE ASSEMBLY — the deck builds itself as the section arrives.

   Before this the deck was simply PRESENT at t = 0: the reader scrolled a
   finished stack into frame and only then did anything move. The section reads
   as a single object now — the cards square up into the stack on the way in,
   and the scrub takes over the moment the pin engages.

   IT IS A SCALAR ON THE STEPS THE DECK ALREADY HAS, not a new motion. Card j
   rests at j·Sy up and j·Sz back; the assembly multiplies that pair by a
   spread running FLOOR -> 1, so at the start the whole deck is collapsed onto
   the seat and it fans open into its own resting geometry. Nothing invents a
   direction, nothing can land anywhere the finished deck does not already go,
   and card 0 — which is j = 0, so both terms are zero — never moves at all.
   The front card is planted and the other eight unfurl behind it, which is
   also what guarantees the contract on arrival: chapter 1 is the front-most
   card and fully opaque at every point of the entrance, by construction.

   IT RIDES THE ITEM, NOT THE CARD, and that is why it is free. The card's
   transform is static CSS driven by `--i` and must never be rewritten (see
   .railCard); the item's transform is already recomputed and written on every
   scrub frame for the drop and the exit. Adding a third term to that same
   string costs one more addition in a function that was running anyway. The
   alternative — a `--rail-spread` custom property the card's own transform
   multiplies through — is one write instead of nine, but it puts the card's
   resting geometry back in the per-frame path for the sake of a phase that
   lasts one viewport.

   FLOOR = 0.12, NOT 0. Nine opaque quads collapsed onto exactly one plane
   z-fight, and the flicker is per-frame and unpredictable. 0.12 leaves card 1
   seven pixels behind card 0 — invisible as a stack, decisive as a sort order.

   THE STAGGER runs front to back: card j starts at ev = j·0.05 and every card
   finishes by ev = 1, so the deck squares up from the seat outward rather than
   arriving all at once. Smoothstepped per card (`railLean` is that curve; the
   deck only has one easing shape) so no card starts with a velocity step, and
   the whole thing is then chased by the SAME spring the scrub uses — 140/26 is
   the deck's sense of mass and the entrance has to share it or it reads as a
   separate effect bolted onto the front.

   REVERSIBLE AND IDEMPOTENT BY CONSTRUCTION. `ev` is a pure function of one
   scroll offset — the wrapper's top travelling from the viewport's bottom edge
   to its top — so scrolling back up re-collapses the deck and scrolling down
   rebuilds it, with no state to strand a card. It cannot fight the scrub
   either: the assembly's range ENDS where the pin engages, which is exactly
   where scrollYProgress (and therefore `t`) begins. The 0.85 remap finishes it
   a little earlier still, so the two never overlap even under a fling. */
const RAIL_ENTER_FLOOR = 0.12; // collapsed spread — never 0, see above
const RAIL_ENTER_STAGGER = 0.05; // per-card delay, in units of the entrance
const RAIL_ENTER_SPAN = 1 - RAIL_ENTER_STAGGER * RAIL_LAST; // 0.6

/* THE GATE, and it moved UP from 861px — this is a real narrowing and it is
   the price of putting the deck back in the original composition.

   The frame is now three columns: the 320px sticky year-wheel track, the
   deck, and the copy beside it. The deck is FIXED pixels (499, or 411 under
   1320px) because its geometry is solved, not fluid. Measured against the
   container at each width, the copy column is what absorbs the difference:

     1440   940px for deck+copy  ->  499 + 405 copy   comfortable
     1320   838                  ->  499 + 303        tight but readable
     1240   763                  ->  411 + 322        fine at the small card
     1200   728                  ->  411 + 287        the floor
     1100   641                  ->  411 + 206        copy is unreadable
     1024   574                  ->  411 + 139        no

   So 1200px. Below it the original list branch takes over — which is not a
   downgrade: the list carries the three `layout` variants across four
   breakpoints and is the section's designed narrow-screen form.

   This also DELETES a pre-existing bug rather than patching it. The
   stylesheet hides `.storyWheel` at `max-width: 980px`, because that is where
   .storyShell collapses to one column and the wheel has nowhere to stand. The
   old 861px gate overlapped that by 120px, so every viewport in the band got
   a deck with its year wheel silently missing. With the gate above 980 the
   two can no longer overlap, so no scoping rule is needed at all.

   The height floor is unchanged: the deck is ~750px of vertical extent inside
   a 100svh pin, and a short window clips it from the TOP — the direction
   cards are already leaving in — so it degrades into a shallower stack rather
   than a broken one. */
const RAIL_MQ = "(min-width: 1200px) and (min-height: 640px)";

const subscribeRail = (onChange: () => void) => {
  const mq = window.matchMedia(RAIL_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const railSnapshot = () => window.matchMedia(RAIL_MQ).matches;
/* The SERVER always renders the list. That is the point: all nine chapter
   bodies ship in the initial HTML and the deck is a client-side upgrade.
   Returning `true` here would put the editorial content behind hydration. */
const railServerSnapshot = () => false;

/* The card-scale band, on the same external-store machinery as the gate above
   and for the same reason: it is a media query, the browser already owns its
   state, and mirroring it into React state would mean a resize listener and a
   render per pixel of drag. Two queries, one subscription each; the store's
   snapshot is a plain number, so React bails out of the re-render unless the
   band has actually changed. */
const subscribeBand = (onChange: () => void) => {
  const mqs = RAIL_BANDS.map(([q]) => window.matchMedia(q));
  mqs.forEach((m) => m.addEventListener("change", onChange));
  return () => mqs.forEach((m) => m.removeEventListener("change", onChange));
};
const bandSnapshot = () =>
  RAIL_BANDS.find(([q]) => window.matchMedia(q).matches)?.[1] ??
  RAIL_BAND_FLOOR;
/* The server never renders the deck, so this is only ever the value React
   hydrates against — the widest band, which is what the stylesheet's own
   unqualified `--rail-scale: 1` says. */
const bandServerSnapshot = () => 1;

const RailLink = motion.create(Link);

/** One chapter on the deck.
 *
 *  Three motion values, and the split between them is deliberate: the EXIT is
 *  a transform on the <li>, the veil and the vanish are opacities on the card
 *  and its overlay. The li is the right carrier for the exit because it sits
 *  inside the track (so it inherits the shared counter-transform) and outside
 *  the card (so the card's own static `--i` transform is never rewritten).
 *  Composing them on one element would mean recomputing the resting geometry
 *  every frame just to add an offset to it.
 *
 *  Memoised because the parent re-renders on every integer chapter change
 *  (nine times across the section) and none of those renders change anything
 *  a card displays. */
const RailCard = memo(function RailCard({
  chapter,
  index,
  t,
  enter,
  release,
  scale,
  onCardFocus,
}: {
  chapter: (typeof STORY)[number];
  index: number;
  /** the deck's single source of truth: the front seat's fractional index */
  t: MotionValue<number>;
  /** the assembly, 0 (collapsed on the seat) -> 1 (the resting deck) */
  enter: MotionValue<number>;
  /** the handover to Awards, 0 (pinned) -> 1 (gone) — see RAIL_RELEASE_* */
  release: MotionValue<number>;
  /** the breakpoint band's card scale — 1 / 0.9 / 0.8, see RAIL_BANDS */
  scale: number;
  onCardFocus: (index: number, e: ReactFocusEvent<HTMLElement>) => void;
}) {
  // depth index — 0 is the front seat, 8 is the far tail, negative is past
  const k = useTransform(t, (v) => index - v);

  /* THIS CARD'S OWN upright compensation, from its own true height. Nine
     heights exist now (three variants x three bands) and both terms are
     linear in the one this card actually has.

     THROUGH A REF, not closed over directly, and this is the trap: a
     useTransform's callback is captured, so a card that re-rendered because
     the breakpoint band changed would keep spending the OLD band's drop until
     something else forced the value to be rebuilt. The ref is written on
     every render and read inside the callback, so the transform is always
     using the height the stylesheet is actually laying the card out at.
     Assigning during render is safe here because it is a derived mirror of a
     prop, not state. */
  const variant = RAIL_VARIANTS[chapter.layout];
  const upright = useRef({ z: 0, drop: 0 });
  upright.current = {
    /* the card's own lean, PLUS the deck-wide push that makes side intrusion
       impossible (RAIL_PUSH). The first term is per-card and per-band; the
       second is a constant for the same reason Sz is — see RAIL_PUSH. */
    z: railUprightZ(variant.h * scale) + RAIL_PUSH,
    drop: railUprightDrop(variant.h * scale, scale),
  };

  /* ONE transform per card, carrying two unrelated jobs because they are the
     same property and fighting over it would mean a second element:

       - the UPRIGHT DROP, which pins the seat card's top edge where the
         tilted geometry expects it (see railUprightDrop);
       - the FLY-FORWARD, an accelerating push down and toward the camera once
         the card is past the seat, frozen at RAIL_EXIT_U (see RAIL_EXIT_*).

     They never overlap in time — the drop is fully applied for every k ≤ 0
     and the exit only exists for k < 0 — so this is an addition, not a
     blend.

     The ASSEMBLY is a third term on the same property, for the same reason:
     it is an offset in the item's own space and composing it anywhere else
     would mean a fourth element. It is finished before the pin engages, so it
     is a constant zero for the entire scrub (see RAIL_ENTER_*). */
  const itemTransform = useTransform([k, enter], ([v, ev]: number[]) => {
    /* one ramp, three compensations — the tilt, the drop and the forward push
       all have to arrive together or the top edge wanders mid-swap */
    const flat = 1 - railLean(v);
    const drop = flat * upright.current.drop;
    const up = flat * upright.current.z;
    /* THE ASSEMBLY, as the amount of this card's own resting step that has
       NOT yet opened. `index`, not k: the offset being cancelled is the
       card's static --i transform, which is index-based whatever the track is
       doing. At gap = 0 the term vanishes and the deck is exactly the geometry
       everything else here is derived from. */
    const gap =
      1 -
      (RAIL_ENTER_FLOOR +
        (1 - RAIL_ENTER_FLOOR) *
          railLean((ev - index * RAIL_ENTER_STAGGER) / RAIL_ENTER_SPAN));
    const ey = -gap * index * RAIL_SY;
    const ez = gap * index * RAIL_SZ;
    if (v >= 0) return `translate3d(0px, ${drop + ey}px, ${up + ez}px)`;
    const f = Math.min(1, -v / RAIL_EXIT_U);
    const e = f * f;
    /* the exit shares this axis: a departed card is already `up` forward, so
       RAIL_EXIT_Z only has to carry the REMAINDER of the excursion */
    return `translate3d(0px, ${drop + ey + RAIL_EXIT_Y * e}px, ${up + ez + RAIL_EXIT_Z * e}px)`;
  });

  /* The rake, as a custom property the card's static transform already reads.
     Driving --rail-tilt rather than rewriting the card's whole transform
     keeps the resting geometry (the --i arithmetic) in the stylesheet where
     it can be read alongside its own derivation. */
  const tilt = useTransform(k, (v) => `${-RAIL_TILT * railLean(v)}deg`);

  /* Depth haze toward the GROUND, and both the colour and the strength are
     the dark scrim's doing.

     COLOUR: ink, not cream. On the cream build this was a cream wash, which
     is correct atmospheric perspective toward a cream page. Over the video it
     did the exact opposite — a cream wash on a photograph reads as frosted
     glass, and the whole stack behind the seat card looked like a pile of
     translucent panels rather than photographs. Hazing toward the ground
     means hazing toward the dark.

     STRENGTH: two slopes, not one, because a single linear ramp cannot do
     both jobs. The FIRST step has to separate the chapter being read from
     everything else — a flat 0.075·k left card 1 at 7% ink, so the stack read
     as lit photographs sitting behind another lit photograph and nothing said
     which one the copy was describing. The REST only has to recede. So 0.30
     across the first step, then 0.10 per step to a floor of 0.80.

     Ramped, not stepped, deliberately: k is continuous and a discontinuity at
     k = 0 would flash on every swap, exactly where the eye is already. */
  const veil = useTransform(k, (v) =>
    Math.min(0.8, Math.max(0, 0.3 * Math.min(v, 1) + 0.1 * Math.max(0, v - 1))),
  );

  /* TWO JOBS ON ONE PROPERTY, multiplied rather than blended because they are
     independent: the exit's cleanup (see RAIL_VANISH_*, which the card only
     reaches long after it is off-frame) and the section's own release (see
     RAIL_RELEASE_*, which every card takes together at the very end). The
     card holds full opacity through its entire tenure AND through the whole
     visible part of its exit; neither of these can dim the chapter a reader
     is being shown. */
  const opacity = useTransform([k, release], ([v, r]: number[]) => {
    const u = -v;
    const vanish =
      u <= RAIL_VANISH_FROM
        ? 1
        : Math.max(
            0,
            1 - (u - RAIL_VANISH_FROM) / (RAIL_VANISH_TO - RAIL_VANISH_FROM),
          );
    return (
      RAIL_ALPHA * vanish * (1 - Math.min(1, r / RAIL_RELEASE_FADE))
    );
  });

  /* A card that has handed the copy over is on its way out of frame at up to
     1.67×, and for part of that it sweeps across the lower half of the pin.
     Opacity removes nothing from hit-testing, so without this it would eat
     clicks aimed at whatever it passes over — and it is a link. The threshold
     is the copy handover, so a card is clickable for exactly as long as it is
     the chapter the reader is being shown. pointer-events is inherited, so
     the <img> goes with it and elementsFromPoint stops returning it. */
  const pointerEvents = useTransform(k, (v) => (v > -0.5 ? "auto" : "none"));

  const mark = railMark(chapter);

  const face = (
    <>
      {/* The photograph FILLS the card, in its own absolutely positioned box —
          next/image `fill` writes its inset inline, so the only way to place
          it is to place its containing block. It used to be inset below the
          mat; the mat is a scrim ON the picture now, so the picture runs the
          whole face and the band is the top of it, darkened. */}
      <span className={styles.railPhoto}>
        <Image
          className={
            chapter.wordmark ? styles.railImageWordmark : styles.railImage
          }
          src={chapter.image}
          alt=""
          fill
          /* PER-VARIANT, and it did not use to be worth it. `sizes` was one
             uniform 440px on the argument that every card reaches the front
             seat and a per-variant value would fetch a second copy of a file
             for the sake of 50px. That was true of the shapes it was written
             for; it is not true now. The two shapes' difference is spent on
             WIDTH (see RAIL_VARIANTS), so the landscape card's widest
             projected scanline is 441.9px and the portrait card's is 296.1 —
             the portrait one never, at any depth or any moment of the scrub,
             renders wider than 296. A uniform 440 hands it a 640w source to
             decode and scale down on four of the nine cards.

             MEASURED, NOT ASSUMED: the frame outliers this section still
             throws cluster at chapter handovers and disappear entirely under
             probe-frames' `noimg`, so they are raster cost and nothing else.

             The extra fetch is one file, not four: nine cards are backed by
             seven distinct images, and cafemama.jpg is the only one used by
             both a landscape chapter and a portrait one. Still per-VARIANT
             rather than per-index, for the original reason — a card's depth
             changes as the reader scrolls and its shape never does. */
          sizes={variant.sizes}
          quality={72}
          /* Buy them EARLY but at idle priority. Left lazy, nine images arrive
             within a few hundred ms of each other mid-scrub and their decodes
             land as one long frame in the middle of the effect. */
          loading="eager"
          fetchPriority="low"
          draggable={false}
        />
      </span>

      {/* THE MAT — the darkened band that is all the reader sees of this card
          at every depth but its own. Painted AFTER the photograph, because it
          IS a scrim on the photograph, and BEFORE the veil so the haze takes
          the band and the mark down with everything else. */}
      <span className={styles.railMat} aria-hidden>
        {mark && (
          <span
            className={styles.railMark}
            /* the mask URL is the only per-card value here and it is written
               once at mount, never in the scrub path */
            style={{ "--rail-mark-src": `url(${mark})` } as CSSProperties}
          />
        )}
      </span>

      {/* NO YEAR PLATE. It was on the card face so a chapter stayed
          identifiable at any depth — a requirement inherited from the
          diagonal build, where cards fanned out and each needed its own
          label. In this composition the year is already on screen twice, in
          the wheel to the left and in the CHAPTER NN meta line to the right,
          and a third instance on the photograph was the only thing putting
          type on an image that is otherwise clean. */}

      <motion.span
        className={styles.railVeil}
        style={{ opacity: veil }}
        aria-hidden
      />
    </>
  );

  return (
    /* The li is a zero-size anchor at the seat carrying the EXIT; the card
       carries the static resting transform, so `--i` is set here and
       inherited. preserve-3d has to be unbroken from the stage down to the
       card — one flattening ancestor and all nine collapse onto one plane. */
    <motion.li
      className={styles.railItem}
      /* the cast covers ONLY the custom properties — `transform` has to stay
         typed as the MotionValue it is, or motion binds it as a plain string
         once and never updates it. `--rail-tilt` is set here rather than on
         the card so that one element carries everything per-card and the card
         itself stays a static stylesheet rule. */
      style={{
        ...({ "--i": index, "--rail-tilt": tilt } as unknown as CSSProperties),
        transform: itemTransform,
      }}
    >
      {/* The SIZE VARIANT is a class on the card, not an inline style, because
          it is two custom properties the stylesheet already knows how to
          spend — and because putting them here would put --rail-scale's
          breakpoint arithmetic in JS, where the media queries are not. */}
      {chapter.slug ? (
        <RailLink
          href={`/restaurants/${chapter.slug}`}
          className={`${styles.railCard} ${variant.cls}`}
          style={{ opacity, pointerEvents }}
          aria-label={`${chapter.year} — ${chapter.title}`}
          onFocus={(e) => onCardFocus(index, e)}
        >
          {face}
        </RailLink>
      ) : (
        <motion.div
          className={`${styles.railCard} ${variant.cls}`}
          style={{ opacity, pointerEvents }}
          aria-hidden
        >
          {face}
        </motion.div>
      )}
    </motion.li>
  );
});

/* ---------------------------------------------------------------------------
   THE CHAPTER COPY ARRIVES, IT DOES NOT CROSS-FADE.

   Title and body take the statement's own grammar — SplitWords, the word-mask
   rise the "A vibrant Filipino…" line under the hero speaks and that Discover
   already reuses twice. A chapter change now reads as the new copy being SET
   rather than as one block of text dissolving into another.

   IT IS DRIVEN BY THE INTEGER, not by the scrub. `on` is `index === active`,
   and `active` is the same Math.round(t) that drives the year wheel — at most
   nine transitions across the whole section, none of them on a scrub frame.
   SplitWords' `on` prop exists precisely for this: a whileInView observer
   here would be racing the deck, and it could never fire twice anyway.

   ALL NINE PANELS ARE SPLIT, ALL THE TIME, and that is the one real decision
   in this component — arrived at the second time, after the first answer was
   measured and found wrong.

   THE FIRST ANSWER was to split only the active panel and render the other
   eight as plain elements, on the argument that `.word` carries
   `will-change: transform` and nine split panels would mean ~300 permanently
   promoted layers inside a 3D scene. That reasoning is sound and the code was
   invisible — a plain <p> and a SplitWords resting at `show` render
   identically, so neither swap could ever be seen. What it was not was free.
   Swapping the component type MOUNTS ~66 elements and UNMOUNTS ~50 on the
   frame the chapter changes, and that frame is a scroll frame: measured at
   1440, two over-32ms frames per run, both at chapter handovers, against zero
   with the split disabled entirely. `startTransition` on the index (see
   StoryDeck) took it from two to one; it could not take it to zero, because
   deferring expensive work does not make it cheap.

   SO THE DOM STOPS MOVING. Every panel is split at mount and a chapter change
   is two prop changes — no elements created, none destroyed, and with the
   panel memoised only the two panels whose `on` actually flipped re-render at
   all.

   THAT ALONE WAS NOT ENOUGH, and the second measurement is the interesting
   one: still 49ms at a handover, because the expensive part was never the DOM
   — it was Motion STARTING ~37 staggered child animations on the incoming
   panel and stopping ~37 on the outgoing, synchronously, on a scroll frame.
   So the copy uses SplitWords' `css` driver, which runs the identical
   keyframe (145% -> 0, same duration, same stagger, same curve) off a class
   and a `calc()` per word. Toggling a class costs the main thread nothing and
   the browser resolves the whole stagger during style. Measured after: zero
   over-32 in either direction at 1440 and at 1280, median untouched at 8.3ms.

   The layer objection is answered in the same place: the CSS driver promotes
   a word only while its block is `on` — 37 layers, the live panel's — where
   the Motion path's `.word` carries a standing `will-change` that would have
   been ~333.

   The remaining price is paid once, at mount: ~333 spans built client-side
   while the section is still several screens below the fold. That is the
   right place for it — off the critical path, off every scroll frame, and
   never repeated.

   SCRUBBED FAST, IT CANNOT STRAND A WORD. There is no timeline and no
   sequencing state: each panel's words are a pure function of one boolean, so
   three chapters crossed in half a second leaves three panels that have each
   correctly concluded they are not the active one, and Motion drives them
   back to `hidden` from wherever they had got to. Scrolling back up is the
   same statement read the other way.

   THE TEXT IS NEVER REMOVED. The words are text nodes in the DOM whether they
   are risen or still below their masks; `inert` on the article is what keeps
   the a11y tree and the tab order honest, exactly as before. (SplitWords
   marks its word spans aria-hidden and names the block with aria-label —
   correct on the heading, and the same treatment Manifesto's statement has
   always used.)

   REDUCED MOTION needs nothing here: <About> mounts the LIST branch, not the
   deck, whenever motion is reduced, so this component is never constructed.
   SplitWords also short-circuits to plain text on its own, so the guard is
   doubled rather than absent.

   MEMOISED on (title, body, on), so a chapter change re-renders two panels
   and not nine. Without it the parent's own render would reconcile ~333
   elements to change two booleans, which is most of the cost the mount/
   unmount was paying and would have made the fix above pointless. */
const RailChapterCopy = memo(function RailChapterCopy({
  title,
  body,
  on,
}: {
  title: string;
  body: string;
  on: boolean;
}) {
  return (
    <>
      {/* The title leads. 0.05 between words on a four-to-six word line is the
          statement's own cadence; the body is set much tighter because it is
          thirty words and the same stagger would take two seconds to finish a
          sentence the reader is already looking at. */}
      <SplitWords
        as="h3"
        className={styles.storyTitle}
        text={title}
        on={on}
        css
        stagger={0.05}
        duration={0.7}
      />
      <SplitWords
        as="p"
        className={styles.storyBody}
        text={body}
        on={on}
        css
        delay={0.16}
        stagger={0.016}
        duration={0.6}
      />
    </>
  );
});

/* ===========================================================================
   THE HERO'S CURSOR TRAIL
   ===========================================================================

   The pointer leaves a wake of photographs across the "Who is MAGINHAWA
   GROUP?" hero — different sizes, different proportions, each one arriving
   under the cursor and falling away.

   THE THREE CONSTRAINTS THAT SHAPED IT, in the order they bind:

   1. IT MUST NOT COST THE TYPE ANYTHING. The hero's lines measure 5.9-7.06:1
      against the footage, and that is bought by .heroScrim — a fitted ellipse
      over the type's own footprint. So the trail is mounted BEFORE the scrim
      in tree order, which puts every image UNDER it: the scrim darkens the
      trail exactly as it darkens the film, and the contrast the type is
      measured at is a property of the scrim rather than of what is beneath
      it. A trail painted over the scrim would have had to be measured against
      nine photographs times four lines; painted under it, there is nothing
      new to measure. probe-hero-contrast is run against it anyway.

   2. IT MUST NOT ADD A BYTE. public/ is 709MB, so the trail reuses the SIX
      photographs this route already ships and puts them through getImageProps
      at the size they are actually drawn — the same technique PageTransition
      uses for its curtain, and for the same reason: asking for the 1.8-3.7MB
      masters to draw a 190px box is how a decorative effect ends up being the
      heaviest thing on the page. Requested at 220px wide, i.e. the largest
      pool slot, so one candidate serves all seven.

   3. IT MUST NOT MOUNT ANYTHING ON POINTERMOVE. A trail that appends a node
      per move event is the textbook way to lose a frame budget: at 120Hz a
      trackpad emits an element's worth of layout, style and paint every 8ms.
      So the pool is FIXED — seven nodes and seven images, created once at
      mount, never added to and never removed. An emission writes one
      transform and starts one Web Animation on an already-composited node.

   THE EMISSION RATE IS A DISTANCE, NOT A TIMER. A node is spent only when the
   pointer has travelled TRAIL_STEP px since the last one, so a still pointer
   emits nothing at all, a slow drag leaves a sparse trail and a fast sweep
   leaves a dense one — the wake is a function of the movement rather than of
   the clock. At 110px it takes a full-width sweep of a 1440 frame to spend
   the whole pool once.

   WAAPI RATHER THAN A CSS TRANSITION, and that is the recycling. A node is
   reused while its previous animation may still be running, and
   `element.animate()` on a live node replaces cleanly from wherever it had
   got to; a transition would need a state, a reflow and a second write to
   restart. Only `transform` and `opacity` are animated, so the whole thing
   runs off the main thread.

   IT DOES NOT EXIST ON TOUCH OR UNDER REDUCED MOTION. There is no cursor to
   trail on a touch device, and this is decoration with no informational
   content at all, so the reduced-motion answer is not a gentler version of it
   — it is nothing. Both are decided before a single node is created. */
const TRAIL_IMAGES = [
  "/images/belly.jpg",
  "/images/bintang.jpg",
  "/images/guanabana.jpg",
  "/images/ramo.jpg",
  "/images/hoowood.jpg",
  "/images/cafemama.jpg",
];

/* THE POOL, and its shapes are the point. Seven slots, seven proportions —
   two landscapes, two portraits, a square, a wide panel and a small tall one —
   so a sweep leaves a scatter of prints rather than seven copies of one frame.
   The sizes are CSS px as drawn; `sizes` below is written from the widest. */
const TRAIL_POOL = [
  { w: 190, h: 128 },
  { w: 116, h: 156 },
  { w: 148, h: 148 },
  { w: 220, h: 124 },
  { w: 132, h: 176 },
  { w: 168, h: 112 },
  { w: 104, h: 138 },
] as const;

const TRAIL_SRC = TRAIL_IMAGES.map((src) => {
  const { props } = getImageProps({
    src,
    alt: "",
    width: 220,
    height: 176,
    sizes: "220px",
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
});

/** px of pointer travel between emissions — see the header */
const TRAIL_STEP = 110;
/* PEAK OPACITY, AND IT IS A CONTRAST BUDGET RATHER THAN A LOOK.

   probe-hero-contrast's `trail` mode parks all seven nodes at once directly
   under the four display lines — the worst arrangement the pool can produce,
   and one a real wake never produces, since the prints are spread along the
   path the hand took. At 0.5 that measured:

     line        clean    all seven parked on the type   floor
     MAGINHAWA   5.93:1   4.44:1                         3
     GROUP?      6.97:1   5.04:1                         3
     lede        7.00:1   5.32:1                         4.5
     kicker      6.66:1   6.66:1                         4.5   (above the band)

   Every line passes, but the lede passes with 18% of margin on a worst case
   rather than the 56% it has clean, and the lede is the line with the highest
   floor and the least headroom to begin with. 0.44 buys that back without the
   prints reading as ghosts — measured at the end of this file's own header. */
const TRAIL_PEAK = 0.44;

/** ms a print takes to fall away. Long enough that four are in the air on a
 *  brisk sweep, short enough that a parked pointer leaves a clean frame. */
const TRAIL_LIFE = 900;

function HeroTrail() {
  const hostRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    /* no cursor, no trail — and this is checked before anything is created, so
       a touch device never pays for the pool at all */
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const host = hostRef.current;
    if (!host) return;

    const nodes = [...host.children] as HTMLElement[];
    if (!nodes.length) return;

    let next = 0;
    let lastX = 0;
    let lastY = 0;
    let primed = false;

    const onMove = (e: PointerEvent) => {
      /* READS FIRST, and only one of them: the host's own box, which is the
         hero and does not move while the pointer is inside it. Everything
         after this is a write. */
      const box = host.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (!primed) {
        primed = true;
        lastX = x;
        lastY = y;
        return;
      }
      const dx = x - lastX;
      const dy = y - lastY;
      if (dx * dx + dy * dy < TRAIL_STEP * TRAIL_STEP) return;
      lastX = x;
      lastY = y;

      const node = nodes[next];
      next = (next + 1) % nodes.length;
      /* the tilt is derived from the DIRECTION of travel rather than picked at
         random, so the wake leans the way the hand went — the print reads as
         having been dropped by the movement rather than placed by a script */
      const angle = Math.max(-14, Math.min(14, (dx / TRAIL_STEP) * 9));
      node.animate(
        [
          {
            transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${angle}deg) scale(0.86)`,
            opacity: 0,
            offset: 0,
          },
          {
            transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${angle}deg) scale(1)`,
            opacity: TRAIL_PEAK,
            offset: 0.14,
          },
          {
            transform: `translate3d(${x}px, ${y + 26}px, 0) translate(-50%, -50%) rotate(${angle * 1.5}deg) scale(0.94)`,
            opacity: 0,
            offset: 1,
          },
        ],
        {
          duration: TRAIL_LIFE,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );
    };

    /* pointerleave re-primes rather than clearing: coming back in should not
       drop a print at the boundary just because the pointer jumped */
    const onLeave = () => {
      primed = false;
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      nodes.forEach((n) => n.getAnimations().forEach((a) => a.cancel()));
    };
  }, [reduce]);

  /* Rendered even under reduced motion so the tree does not change shape
     between the two; the effect above simply never binds, every node stays at
     opacity 0, and nothing animates. The <img>s are `loading="lazy"` and this
     is the top of the page, so a reduced-motion reader who never triggers the
     trail never fetches them either. */
  return (
    <div
      ref={hostRef}
      className={styles.heroTrail}
      /* the peak, published for the harness — probe-hero-contrast's `trail`
         mode parks the pool at this alpha, and a number typed into the probe
         instead would go stale the first time this one moved */
      data-trail-peak={TRAIL_PEAK}
      aria-hidden
    >
      {TRAIL_POOL.map((slot, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          {...TRAIL_SRC[i % TRAIL_SRC.length]}
          alt=""
          className={styles.heroTrailImg}
          style={{ width: slot.w, height: slot.h }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ))}
    </div>
  );
}

/** The deck branch: the pin, the scrub, the nine cards and the nine copy
 *  panels. Rendered as the SECOND COLUMN of the original `.storyShell` grid,
 *  so the year wheel beside it is untouched — same markup, same sticky
 *  column, same 124px numerals as the list branch uses. Mounted only when
 *  RAIL_MQ matches and motion is not reduced; the list is the other half of a
 *  strict either/or. */
function StoryDeck({
  active,
  scale,
  onIndex,
}: {
  /** the integer chapter in the front seat, owned by <About> — it also drives
      the year wheel, which is why it is React state and not a motion value */
  active: number;
  /** the breakpoint band's card scale, mirroring --rail-scale. Owned by
      <About> rather than read here, because the year wheel needs the same
      number to sit on the same horizon and the wheel is this component's
      SIBLING — see RAIL_BANDS, and .storyShell in the stylesheet. */
  scale: number;
  onIndex: (index: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /* Until the near cards have DECODED the deck renders static at t=0: the
     track simply carries no transform. Scrubbing into an undecoded image is
     how a 40ms frame lands in the first second of the effect. */
  const [armed, setArmed] = useState(false);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  /* The scroll's TARGET, then the spring. Order matters: the dwell map is
     applied first so the spring is chasing chapter indices, not raw progress
     — that way its rest thresholds are expressed in chapters (see
     RAIL_SPRING) and a rest can never land the deck between two seats. */
  const tTarget = useTransform(
    scrollYProgress,
    RAIL_STOPS.input,
    RAIL_STOPS.output,
    { clamp: true },
  );
  const t = useSpring(tTarget, RAIL_SPRING);

  /* THE ASSEMBLY'S OWN SCROLL RANGE — the approach, not the pin. This measures
     the wrapper's TOP edge travelling from the viewport's bottom to the
     viewport's top, which is the one viewport of scroll immediately before
     `scrollYProgress` above starts counting. The two ranges meet end to end
     and never overlap, which is what keeps the entrance from fighting `t`.

     Remapped to finish at 0.85 rather than 1.0 so the deck is fully squared up
     a fraction of a screen BEFORE the pin engages — under a fast fling the
     spring is still catching up when the range ends, and this buys it the
     room. Clamped because a raw scroll progress is free to run outside [0,1]
     and a spread above 1 would prise the deck open past its own geometry. */
  const { scrollYProgress: approach } = useScroll({
    target: wrapRef,
    offset: ["start end", "start start"],
  });
  const enterTarget = useTransform(approach, [0, 0.85], [0, 1], {
    clamp: true,
  });
  /* the SAME spring as the scrub — the deck has one sense of mass or the
     entrance reads as a different object arriving */
  const enter = useSpring(enterTarget, RAIL_SPRING);

  /* THE RELEASE — the viewport of scroll immediately AFTER the pin, measured
     the same way the assembly measures the viewport immediately before it.
     `end end` is the frame the sticky child stops being stuck, so the two
     ranges and the scrub's own meet end to end and none of the three can ever
     overlap. See RAIL_RELEASE_*. */
  const { scrollYProgress: releaseProgress } = useScroll({
    target: wrapRef,
    offset: ["end end", "end start"],
  });
  const release = useTransform(releaseProgress, [0, RAIL_RELEASE_SPAN], [0, 1], {
    clamp: true,
  });
  /* the same release, as the copy column's opacity. A second useTransform
     rather than a style function so the value is a plain number Motion can
     write straight to the property. */
  const copyRelease = useTransform(
    release,
    (r) => 1 - Math.min(1, r / RAIL_RELEASE_FADE),
  );

  /* THE HINT'S OWN OPACITY. Two terms, multiplied, because it has to be
     absent for two different reasons: the deck is still assembling (enter < 1,
     the cards are collapsed on the seat and there is nothing to scroll yet),
     or the reader has already started.

     THE SECOND TERM READS THE RAW SCROLL, NOT `t`, and that is the whole of
     "retires once the reader is clearly moving". `t` is the spring's output
     downstream of RAIL_STOPS' dwell map, so it barely leaves 0 for the first
     chapter of travel: measured against t, the hint was still at full opacity
     half a chapter in and only 0.39 a whole chapter later — nearly a screen of
     scrolling with the instruction still up. Against the pin's own progress it
     answers the gesture instead of the deck's easing, which is the correct
     thing for a signpost to answer.

     0.04 of the pin is 29svh — about one deliberate wheel gesture, past any
     accidental notch, and gone well before the first chapter swaps. */
  const hintOpacity = useTransform(
    [enter, scrollYProgress],
    ([e, p]: number[]) =>
      Math.max(0, Math.min(1, (e - 0.75) * 4)) * Math.max(0, 1 - p / 0.04),
  );

  const trackTransform = useTransform(
    [t, release],
    ([v, r]: number[]) =>
      `translate3d(${-v * RAIL_SX}px, ${-v * RAIL_SY}px, ${v * RAIL_SZ - RAIL_Z0 - r * RAIL_RELEASE_Z}px)`,
  );

  /* The ONLY React state the scrub drives, and it is a discrete consumer: the
     year wheel and the copy panels both switch on an integer, at most nine
     times across the whole section. Rounding (not flooring) means a chapter
     takes the wheel as it crosses the halfway point toward the front seat,
     which is where the eye says it arrived — and it is the instant the exit
     trajectory is tuned against.

     IN A TRANSITION, and this is a measured fix rather than a precaution.
     `useMotionValueEvent` fires INSIDE the scrub's own frame, so a synchronous
     setState there makes React's render part of that frame's budget — nine
     times across the section, on the frames where the deck is also mid-swap.
     That was already the file's known intermittent long frame (one run in
     three, an over-32 somewhere on the `up` leg) when the copy change was
     only a class toggle. Splitting the title and body into word masks put
     ~66 elements of mount and ~50 of unmount on that same frame and turned
     "sometimes" into twice a run: measured at 1440, two over-32s per run at
     pin 0.17 and 0.40, both of them chapter handovers.

     startTransition marks the update non-urgent, so React yields the frame to
     the compositor and does the copy swap in the slack after it. Measured
     after: zero over-32 in either direction at 1440 and at 1280, with the
     median untouched at 8.3ms.

     WHAT IT COSTS is that the wheel and the copy land one or two frames after
     the deck does. The dwell is 45% of a chapter — about 0.4 of a screen —
     so there is no frame at which a reader could see the deck seated on one
     chapter and the copy on another. `lastIndex` is still written
     synchronously, so a deferred render can never be asked for twice. */
  const lastIndex = useRef(0);
  useMotionValueEvent(t, "change", (v) => {
    const i = Math.min(RAIL_LAST, Math.max(0, Math.round(v)));
    if (i === lastIndex.current) return;
    lastIndex.current = i;
    startTransition(() => onIndex(i));
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let live = true;
    const arm = () => {
      if (live) setArmed(true);
    };
    /* Only the first three — the ones at a size worth waiting for at t=0.
       Cards 3–8 show as 37-to-27px strips and can stream in while the deck is
       already moving. decode() REJECTS when the request is cancelled or
       replaced (a resize picking a new srcset candidate does exactly that),
       so every one is caught: an unhandled rejection here would leave the
       deck permanently frozen at t=0. */
    const imgs = Array.from(stage.querySelectorAll("img")).slice(0, 3);
    Promise.all(imgs.map((img) => img.decode().catch(() => {}))).then(arm);
    /* Backstop. decode() on an image that never loads at all (a 404, an
       offline reader) neither resolves nor rejects — the gate is a
       nice-to-have and must never be the reason the section is dead. */
    const bail = window.setTimeout(arm, 2500);
    return () => {
      live = false;
      window.clearTimeout(bail);
    };
  }, []);

  /* Layer promotion, held only while it is worth holding, and on the TRACK
     only. The cards and their li wrappers are already composited by virtue of
     their 3D transforms, so `will-change` on them would buy nothing and cost
     eighteen permanent layers. Toggled by hand rather than through state
     because a re-render per viewport crossing is two renders this component
     does not need, and the observer sits on the WRAP, which is outside
     .railPin's `overflow: clip` — an observer aimed at anything inside the
     pin could never fire. */
  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        track.classList.toggle(
          styles.railTrackLive,
          armed && entry.isIntersecting,
        );
      },
      { rootMargin: "25% 0px" },
    );
    io.observe(wrap);
    return () => {
      io.disconnect();
      track.classList.remove(styles.railTrackLive);
    };
  }, [armed]);

  /* Focus drives the deck. A card behind the front one is a 27-to-48px strip
     with the rest of it under another card — a focus ring on it is not merely
     faint, it is occluded — so tabbing to a chapter SCROLLS it into the front
     seat instead. Gated on :focus-visible so a mouse click on a card never
     yanks the page out from under the pointer. Lenis owns the scroll
     position, so a raw window.scrollTo would be pulled straight back to
     Lenis's target on the next frame; it is kept only as the reduced-motion /
     no-Lenis fallback. */
  const onCardFocus = useCallback(
    (index: number, e: ReactFocusEvent<HTMLElement>) => {
      if (!e.target.matches(":focus-visible")) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      /* getBoundingClientRect + scrollY rather than offsetTop, which would be
         relative to the nearest positioned ancestor — this section is nested
         several positioned boxes deep. */
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const travel = wrap.offsetHeight - window.innerHeight;
      /* the MIDDLE of the chapter's dwell, not its leading edge: t reaches
         `index` at lead + index·step and holds for a further step·DWELL, so
         landing on the leading edge would park the reader one frame from the
         swap out of the chapter they just tabbed to. */
      const p =
        RAIL_STOPS.lead +
        RAIL_STOPS.step * (index + (index < RAIL_LAST ? RAIL_DWELL / 2 : 0));
      const y = top + p * travel;
      if (lenisRef.current) lenisRef.current.scrollTo(y);
      else window.scrollTo({ top: y });
    },
    [],
  );

  return (
    /* The wrapper OUTLIVES the pin — 100svh of sticky child plus the travel.
       If a flex/grid parent ever collapsed this height the pin would engage
       and release on the same frame. It is a plain grid item in .storyShell,
       which is what keeps the year wheel's sticky column alive beside it. */
    <div ref={wrapRef} className={styles.railPinWrap}>
      <div className={styles.railPin}>
        <div ref={stageRef} className={styles.railStage}>
          <motion.div
            ref={trackRef}
            className={styles.railTrack}
            /* No transform at all until the decode gate opens, which parks
               every card at its k = j resting place. */
            style={armed ? { transform: trackTransform } : undefined}
          >
            <ol className={styles.railList}>
              {STORY.map((chapter, index) => (
                <RailCard
                  key={`${chapter.year}-${chapter.title}`}
                  chapter={chapter}
                  index={index}
                  t={t}
                  enter={enter}
                  release={release}
                  scale={scale}
                  onCardFocus={onCardFocus}
                />
              ))}
            </ol>
          </motion.div>
        </div>

        {/* THE SCROLL INDICATOR. The deck is pinned, so for one screen the
            page stops responding to scroll the way the rest of it does — the
            reader keeps scrolling and the chapters advance instead. Nothing
            said so.

            IT IS THE SITE'S OWN DEVICE, not a new one: the hero's .scrollHint
            (Hero.module.css) — the word SCROLL in label caps with a chevron
            under it — restated here at the foot of the deck's own column. A
            second vocabulary for the same instruction would be the thing that
            needs explaining.

            IT RETIRES, and on the deck's own clock rather than a timer: the
            opacity is a pure function of `enter` and `t`, so it is present
            once the deck has assembled and gone by the time the first chapter
            has advanced a quarter of a step. No state, no effect, nothing on
            the scrub path but one interpolation. */}
        <motion.div
          className={styles.railHint}
          style={{ opacity: hintOpacity }}
          aria-hidden
        >
          <span>Scroll</span>
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 4.5 L6 8 L9.5 4.5" />
          </svg>
        </motion.div>

        {/* The chapter copy, in the original treatment — the same meta line,
            title, body rule and restaurant link the list branch renders.

            All nine panels are RENDERED, always. Not display:none, not
            visibility:hidden, not aria-hidden on the container — the nine
            chapter bodies staying in the DOM is the reason this is CSS 3D and
            not a canvas. `inert` is what keeps the a11y tree and the tab
            order honest without removing the text.

            THE OFFSET IS NOT WRITTEN HERE ANY MORE. It used to be an inline
            style on this element, which aligned the copy to the seat card
            perfectly and left the YEAR WHEEL — a sibling of this whole
            component — on its own unrelated anchor, 124px away at 1920. It is
            written on .storyShell instead, where the wheel inherits it too;
            see railAxisOffset and the .storyShell rule. */}
        <motion.div
          className={styles.railCopy}
          /* the copy leaves with the deck — the release dims the cards and
             this column together, or the chapter text would be left lit over
             a stack that has receded out from under it */
          style={{ opacity: copyRelease }}
        >
          {STORY.map((chapter, index) => (
            <article
              key={`${chapter.year}-${chapter.title}`}
              className={`${styles.railPanel} ${
                index === active ? styles.railPanelActive : ""
              }`}
              inert={index !== active}
            >
              <div className={styles.storyMeta}>
                Chapter {String(index + 1).padStart(2, "0")}
                <span className={styles.storyMetaPlace}>{chapter.place}</span>
              </div>

              <RailChapterCopy
                title={chapter.title}
                body={chapter.body}
                on={index === active}
              />

              {chapter.slug && (
                <Link
                  href={`/restaurants/${chapter.slug}`}
                  className={styles.storyLink}
                >
                  <span>See the restaurant</span>
                  <svg
                    viewBox="0 0 24 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M0 5 H18" />
                    <path d="M14 1 L18 5 L14 9" />
                  </svg>
                </Link>
              )}
            </article>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ===========================================================================
   THE ENTRANCE, AND WHERE THE FIRST MOVEMENT IN FRAME COMES FROM
   ===========================================================================

   THE ENTRANCE IS THREE BEATS, NOT ONE STAGGER, and the order is the whole
   point of it: the page asks a question, the question's subject arrives, and
   only then does the page answer.

     1. "Who is"     rises word by word out of its own clips — the manifesto's
                     grammar, the same one the statement below and the deck's
                     nine chapter bodies speak (SplitWords).
     2. MAGINHAWA    rise out of their own clips in turn, in that same
        GROUP?       grammar, at display scale.
     3. the lede     rises, in the same grammar again, once both display lines
                     have landed.

   It used to be four lines on one vertical stagger, 0.05 apart, all doing the
   same thing at once. That reads as a list arriving; this reads as a sentence
   being spoken.

   THE DISPLAY LINES USED TO SLIDE IN FROM THE EDGES — MAGINHAWA from off the
   right, GROUP? from off the left, crossing on the way to meeting — and that
   is what this replaced. Two things were wrong with it and the second is the
   one that mattered.

   The plain one: a full-viewport horizontal travel needs no clip at the line,
   its own bespoke long-travel curve, its own `translateX(±100vw)` pair and a
   `.heroSlide` wrapper to carry them, none of which anything else on the page
   uses. That is a lot of machinery for one beat.

   The real one: THE PAGE ONLY HAS ONE WAY OF INTRODUCING TYPE, and this was a
   second. The kicker above these lines and the lede below them both assemble
   word by word out of a mask; so does the statement a screen down, and so do
   all nine chapter bodies in the deck. A hero whose middle beat arrives by a
   different mechanism than the beats either side of it does not read as a
   sequence — it reads as a slide sandwiched between two rises. One grammar,
   spoken at four scales, is the whole idea.

   WHAT THE MASK HAD TO LEARN. `.mask` clips both axes, which is correct for
   copy and shears display type: GROUP? is a swashed italic whose P overhangs
   its advance width, and MAGINHAWA carries a negative letter-space. Both get
   `.heroMask` — `overflow: visible clip`, a vertical-only window — through
   SplitWords' `maskClassName`. That is the same asymmetric clip the pre-slide
   build carried as `.heroLineClip`, moved to where the words actually are.

   All four beats are VISIBLE against the film (the difference blend is gone —
   see .heroScrim in the stylesheet), and nothing else in frame moves until
   they have landed.

   THE VIDEO USED TO AUTOPLAY, which meant the very first thing a reader saw
   was ambient footage already mid-shot, with the type climbing over the top
   of it. Two entrances at once, and the one that mattered was the quieter of
   the two. It also read as an accident on a slow connection: `preload
   ="metadata"` shows the poster, then cuts to whatever frame the decoder
   happens to reach first.

   So the film is held on its first frame for the length of the entrance and
   started as the LEDE lands. The first movement in the hero is then the
   payoff of the type's arrival rather than wallpaper it has to compete with,
   and the cut from poster to first frame happens during load, off-screen of
   the entrance entirely.

   THE DELAYS ARE CONSTANTS BECAUSE THREE THINGS SHARE THEM: the four rises,
   the frame this module starts playback on, and the settle keyframe in the
   stylesheet. They must agree or the "payoff" lands early and reads as a
   glitch. The stylesheet's --hero-lands mirrors HERO_LANDS below. */
/* THE SCHEDULE. Every number below is a start time in seconds, and they are
   constants rather than literals at the call sites because four other things
   read them: the frame the film is allowed to move, the settle keyframe in
   the stylesheet, the scroll cue, and the reader's sense that this is one
   sequence rather than four animations that happen to be near each other.

   THE DISPLAY LINES ARE SLOWER THAN THE COPY AROUND THEM, and that is the one
   thing the scale changes. A word rising out of its own clip travels 145% of
   its own line box, so at --hero-display-size that is ~250px against the
   kicker's ~40 — the same 0.8s would be four times the speed on screen and
   read as a snap. 1.05s puts the two beats within a third of each other in
   px/s, which is what makes them read as one grammar at two sizes.

   THE LEDE IS UNMOVED at 1.82. The display lines now land at 1.39 and 1.57
   rather than at 1.76 and 1.86, so there is a quarter-second of stillness
   before the answer starts — a breath between the question and the answer,
   which the slide never had room for. It is deliberately not spent closing
   the gap: HERO_LANDS_MS below is derived from this number, the film's play()
   call and the stylesheet's own 1.95s settle delay are derived from that, and
   the payoff is timed against the lede's last word rather than against the
   title's. */
const HERO_KICKER = { delay: 0.08, stagger: 0.05, dur: 0.8 } as const;
const HERO_DISPLAY_DUR = 1.05;
const HERO_DELAY = { title: 0.34, group: 0.52 } as const;
const HERO_LEDE = { delay: 1.82, stagger: 0.01, dur: 0.6 } as const;

/* The lede, as a constant because its WORD COUNT is load-bearing — the film's
   cue below is derived from it, so an edit to the copy moves the film with it
   rather than leaving the two out of step. */
const HERO_LEDE_TEXT =
  "A London family of restaurants — from a Camden kitchen in 1987 to seven distinct dining destinations today. Made with heritage and served with heart.";
const HERO_LEDE_EM = "served with heart";
const HERO_LEDE_WORDS = HERO_LEDE_TEXT.split(" ").length;

/** when the lede's LAST word starts to rise — the frame the film is allowed to
 *  move. Not when the lede has finished: the payoff should arrive under the
 *  final word rather than after a beat of everything standing still. */
const HERO_LANDS_MS =
  (HERO_LEDE.delay + HERO_LEDE.stagger * (HERO_LEDE_WORDS - 1)) * 1000;
/** the scroll cue, a beat after the lede has actually finished */
const HERO_CUE_DELAY =
  HERO_LANDS_MS / 1000 + HERO_LEDE.dur + 0.25;

/* ---------------------------------------------------------------------------
   THE STATEMENT IS SCRUBBED, and it is the one place on this page where the
   reader's hand should be setting the pace.

   This is the first real prose on the page and the sentence the whole brand
   rests on. As a `Reveal` it played once, at whatever speed Motion chose, and
   a reader moving quickly got a block of display type that had finished
   arriving before they looked at it — which is to say, skimmable. Scrubbed,
   it cannot be: the words come up under the wheel, so the sentence is read at
   the speed it is scrolled and stopping stops it.

   IT SPEAKS THE MANIFESTO'S GRAMMAR because the home page already taught it:
   words rising out of their own clips on a short overlap (components/
   Manifesto.tsx, and SplitWords for the timed variant). Nothing new is being
   invented here — the same 145% rise, the same curve, the same mask.

   ONE RANGE, NOT ONE PER LINE. Manifesto locks its lines by measuring them and
   gives each its own scroll range, because its headline is four lines of
   image-bearing display type and a line that set itself two screens early
   would look broken. This statement is two sentences; one range over the whole
   block means the rise sweeps through it as a single wave, and it costs no
   measurement, no layout effect, no resize handling and no state.

   NO SPRING, deliberately. A scrubbed value has to be a pure function of
   scroll or it fights the wheel on the way back up — the same reason
   Manifesto dropped its springs. This also makes it correct under momentum
   scrolling on touch, where a spring would still be settling after the finger
   has gone. */
const SCRUB_EASE = cubicBezier(0.22, 1, 0.36, 1);

/* The statement as words, with the two emphasised phrases flagged. It is
   spelled out rather than split from a string because the emphasis is not
   derivable from the text — and because the reduced-motion branch below
   renders the same sentence as ordinary prose with real <em>s. */
const STATEMENT_PARTS: { w: string; em?: boolean }[] = [
  { w: "Maginhawa" },
  { w: "is" },
  { w: "Tagalog" },
  { w: "for" },
  { w: "comfortable", em: true },
  { w: "—" },
  { w: "a" },
  { w: "life" },
  { w: "of" },
  { w: "ease." },
  { w: "Comfort" },
  { w: "is" },
  { w: "the" },
  { w: "thread" },
  { w: "through" },
  { w: "every", em: true },
  { w: "kitchen", em: true },
  { w: "we", em: true },
  /* the stop travels with the word rather than as its own mask — a lone
     full point would carry the 0.24em word gap in front of it and read as a
     typo. Manifesto's "London." makes the same call. */
  { w: "run.", em: true },
];
const STATEMENT_TEXT =
  "Maginhawa is Tagalog for comfortable — a life of ease. Comfort is the thread through every kitchen we run.";

/** how much of the block's range one word takes to complete — Manifesto's
 *  PART_SPAN, and the reason the rise reads as a wave rather than as twenty
 *  separate events */
const STATEMENT_SPAN = 0.55;

/* THE RANGE. Opens with the paragraph's top a little below the fold and
   closes with its foot a little above the middle — about three quarters of a
   screen of travel at every viewport tested, because both ends are expressed
   in viewport fractions and the block's own height is the only other term. */
const STATEMENT_OFFSET = ["start 0.88", "end 0.42"] as const;

const statementWindow = (i: number, n: number): [number, number] => {
  if (n <= 1) return [0, STATEMENT_SPAN];
  const step = (1 - STATEMENT_SPAN) / (n - 1);
  return [i * step, i * step + STATEMENT_SPAN];
};

/** one word, rising out of its own clip as the block is scrubbed */
function StatementWord({
  p,
  at,
  part,
  last,
}: {
  p: MotionValue<number>;
  at: [number, number];
  part: { w: string; em?: boolean };
  /** no trailing space after the final word — see SplitWords' <Space> */
  last: boolean;
}) {
  /* 145%, and it is derived from the mask rather than chosen: the clip window
     is padded 0.30em taller than the word's line box so the italic descenders
     survive at rest (see .statementMask), and the word has to start fully
     below that window. (0.92 + 0.30) / 0.92 = 133%, plus margin. Move the
     padding and this moves with it. */
  const y = useTransform(p, at, ["145%", "0%"], {
    clamp: true,
    ease: SCRUB_EASE,
  });
  return (
    <>
      <span className={styles.statementMask} aria-hidden>
        <motion.span
          className={
            part.em
              ? `${styles.statementWord} ${styles.emItalic}`
              : styles.statementWord
          }
          style={{ y }}
        >
          {part.w}
        </motion.span>
      </span>
      {/* A REAL SPACE, with no advance of its own. The masks' gaps are a
          0.24em margin, so this sentence's textContent was
          "MaginhawaisTagalogforcomfortable—alifeofease." — see .statementSpace
          and SplitWords, which carries the same fix for the deck's nine
          chapter bodies. */}
      {!last && (
        <span className={styles.statementSpace} aria-hidden>
          {" "}
        </span>
      )}
    </>
  );
}

function Statement() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [...STATEMENT_OFFSET],
  });

  /* PROMOTED ONLY WHILE IT IS ON SCREEN. Each word is driven by an
     independent `y` written from JS every scroll frame, so it genuinely needs
     `will-change` while it is moving — but it was a STANDING hint on all
     nineteen words, i.e. nineteen compositor layers held for the life of the
     page, which is the exact cost SplitWords' CSS driver was written to avoid
     for the deck's copy. The class is toggled by an observer on the paragraph
     itself: two toggles per visit, none of them on a scrub frame, and outside
     the range the words are not moving anyway.

     Not React state — a re-render here would reconcile nineteen children to
     change one boolean. The same hand-toggled pattern .railTrackLive uses. */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle(styles.statementLive, entry.isIntersecting),
      { rootMargin: "20% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove(styles.statementLive);
    };
  }, [reduce]);

  /* Reduced motion gets the sentence as ordinary prose — not the same markup
     held still, but real <em> phrases in one flowing paragraph. The masked
     form's word gaps are a 0.24em margin rather than a space, which is the
     right compromise while the words are moving and the wrong one when they
     never will. */
  if (reduce) {
    return (
      <p ref={ref} className={styles.statementText}>
        Maginhawa is Tagalog for{" "}
        <em className={styles.emItalic}>comfortable</em> — a life of ease.
        Comfort is the thread through{" "}
        <em className={styles.emItalic}>every kitchen we run</em>.
      </p>
    );
  }

  return (
    <p ref={ref} className={styles.statementText} aria-label={STATEMENT_TEXT}>
      {STATEMENT_PARTS.map((part, i) => (
        <StatementWord
          key={i}
          p={scrollYProgress}
          at={statementWindow(i, STATEMENT_PARTS.length)}
          part={part}
          last={i === STATEMENT_PARTS.length - 1}
        />
      ))}
    </p>
  );
}

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const storyRefs = useRef<(HTMLLIElement | null)[]>([]);

  // ---- pinned hero video ----
  // The video no longer shrinks into a frame: it pins to the viewport (a
  // sticky backdrop) while the hero type, the statement/Omar band and the
  // story timeline all scroll over it. It releases just before Awards &
  // Recognition. A constant scrim keeps the type legible throughout, so
  // no scroll-scrubbed machinery is needed — only the entrance rises.
  const reduceMotion = useReducedMotion();

  /* THE FILM IS HELD, THEN RELEASED — see the HERO_* block above for why.
     Driven imperatively off the ref rather than through props, because both
     values it writes are ones React would otherwise have to re-render the
     whole page to change, and neither is worth a render:

       preload  "none" -> "auto"   starts the 26MB fetch a frame after
                                   hydration instead of at parse time, and
                                   never starts it at all under reduced
                                   motion.
       play()   at HERO_LANDS_MS   the frame the lede finishes landing.

     REDUCED MOTION KEEPS THE POSTER. A looping film under the whole page is
     exactly the ambient movement the preference is asking to be spared, and
     `poster` renders without a byte of video being fetched — so the section
     still has its photograph and the reader still has their setting. */
  const videoRef = useRef<HTMLVideoElement>(null);

  /* THE SCROLL CUE'S EXIT, and it is scroll-linked rather than timed because
     the thing it responds to is the reader having scrolled. `end start` is
     the hero's foot reaching the top of the frame, so [0, 0.3] fades the cue
     out over the first third of the hero's own height — gone well before the
     statement arrives, and back if the reader returns. Reduced motion keeps
     it: an opacity change that aids comprehension is exactly what the
     preference asks to be left alone. */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroOut } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const cueFade = useTransform(heroOut, [0, 0.3], [1, 0], { clamp: true });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduceMotion) {
      v.pause();
      return;
    }
    v.preload = "auto";
    const id = window.setTimeout(() => {
      /* rejects when the browser declines to start (no user gesture, a
         decode error, the element already gone) — the poster is the fallback
         and it is already on screen, so there is nothing to recover */
      void v.play().catch(() => {});
    }, HERO_LANDS_MS);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);

  /* Deck or list — strictly one of the two, never both. Mounting both would
     duplicate the semantic <ol> (a duplicate-content signal), fetch nine
     images twice, and leave two active-chapter drivers racing for the same
     piece of state. The list is not a lesser copy: it carries the three
     `layout` variants across four breakpoints, and it is the required
     reduced-motion fallback whatever happens on desktop. Only the second
     column of .storyShell branches — the year wheel is shared markup. */
  const wideEnough = useSyncExternalStore(
    subscribeRail,
    railSnapshot,
    railServerSnapshot,
  );
  const deck = wideEnough && reduceMotion !== true;

  /* The breakpoint band's card scale, and it is read HERE rather than inside
     StoryDeck because two of the three columns that have to share a horizon
     are outside StoryDeck: the year wheel is a sibling, and custom properties
     only travel downward. See RAIL_BANDS. */
  const scale = useSyncExternalStore(
    subscribeBand,
    bandSnapshot,
    bandServerSnapshot,
  );

  /* THE SHARED HORIZON, in one place. Everything the section aligns
     vertically — the year wheel on the left, the deck in the middle, the copy
     on the right — is placed off this one number, and it is written on the
     SHELL so all three inherit it.

     The three were on three different anchors before: the wheel centred at
     50vh by its own sticky rule, the deck at 56% of the pin, the copy on the
     seat card's centre. Each was correct about the thing it was aligned to
     and they measured 124px apart at 1920.

     IT NO LONGER DEPENDS ON `activeStory`, and that is the whole of §1 and §2
     — see railAxisOffset. The only input is the breakpoint band, so the value
     changes on a resize and never once during a scrub; React cannot even be
     asked to re-render it at a chapter change.

     Zero on the list branch — the wheel keeps its own rule there, and a
     stylesheet `:has(.railPinWrap)` guard means this value is never read. */
  const axisOffset = deck ? railAxisOffset(scale) : 0;

  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;

    html.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("is-loading");

    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  /* The LIST branch's active-chapter driver. On the deck branch the same
     `activeStory` is fed by the scrub's integer index instead (see StoryDeck)
     — one driver at a time, because only one branch is ever in the DOM, and
     both feed the SAME year wheel. */
  useEffect(() => {
    if (deck) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(index)) setActiveStory(index);
      },
      {
        // centre-line detector — a story item is "active" the moment it
        // crosses the middle 10% band of the viewport, so the wheel flips
        // exactly when the reader's eye does
        threshold: 0,
        rootMargin: "-45% 0px -45% 0px",
      },
    );

    storyRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, [deck]);

  const activeCentury = STORY[activeStory].year.slice(0, 2);
  const centuries = Array.from(new Set(STORY.map((s) => s.year.slice(0, 2))));
  const activeCenturyIndex = centuries.indexOf(activeCentury);

  /* THE WHEEL DOES NOT MOVE TO SHOW THE SAME NUMBER TWICE.
     The years run 1987, 2007, 2017, 2018, 2019, 2025, 2025, 2026, 2026 — two
     consecutive pairs. Indexing the suffix track by `activeStory` meant that
     at chapters 6→7 and 8→9 the numerals physically scrolled a full step and
     landed on identical digits: a 0.55s move that says something changed when
     nothing did, and it happens twice in the last four chapters.

     Parking on the FIRST chapter that carries the active year fixes it
     without touching the track — the duplicate cells are still rendered (they
     belong to their chapters), they are simply never scrolled to. The century
     column has always done this; it dedupes its own list. */
  const activeYearIndex = STORY.findIndex(
    (s) => s.year === STORY[activeStory].year,
  );

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page} data-nav-theme="light">
        {/* ---- pinned video scope ----
             The hero video pins to the viewport as a sticky backdrop; the
             hero type, the statement/Omar band and the story timeline all
             scroll over it, and the Awards cream sheet finally slides up
             to cover it (layered pinning — the video releases underneath
             once hidden). The constant scrim keeps every layer of type
             legible against the footage. NB: .videoContent must not create
             a stacking context, or the difference-blend type couldn't see
             the video beneath it. */}
        <div
          className={styles.videoScope}
          data-nav-theme="blend"
          data-cursor="glass"
        >
          <div className={styles.videoBackdrop} aria-hidden>
            {/* NO autoPlay AND preload="none" IN THE MARKUP — both are set
                from the effect above, and neither is a detail.

                The gated start is what makes the entrance read (see
                HERO_LANDS_MS). `preload="none"` is what stops a 26MB file
                competing with the fonts and the stylesheet for the first
                paint of a page whose first second is entirely typography —
                the fetch is kicked off a frame after hydration instead, and
                the poster covers the difference. It is also the whole reason
                a reduced-motion reader never downloads the film at all. */}
            <video
              ref={videoRef}
              className={styles.heroVideo}
              src="/videos/belly-hero.mp4"
              poster="/images/belly.jpg"
              muted
              loop
              playsInline
              preload="none"
            />
            <div className={styles.videoScrim} />
          </div>

          <div className={styles.videoContent}>
            <div className="container">
              <section
                ref={heroRef}
                className={styles.hero}
                aria-label="Maginhawa Group"
              >
                {/* THE TRAIL IS FIRST, AHEAD OF THE SCRIM, and the order
                    is the whole of why it is safe — see HeroTrail. */}
                <HeroTrail />

                {/* THE SHAPED SCRIM. First child so it paints under every
                    line that follows it — see .heroScrim, which is where the
                    shape and the reason for it are derived. Still first of
                    the TYPE; the trail above it is the one thing deliberately
                    placed underneath. */}
                <div className={styles.heroScrim} aria-hidden />

                <h1 className={styles.srOnly}>Maginhawa Group</h1>

                {/* BEAT ONE — the question, in the page's own word-mask
                    grammar. `on` rather than whileInView so this shares the
                    slides' clock: an observer would start it a frame or two
                    late and the three beats have to be one sequence. */}
                <div className={styles.heroKicker} aria-hidden>
                  <SplitWords
                    as="span"
                    text="Who is"
                    on
                    delay={HERO_KICKER.delay}
                    stagger={HERO_KICKER.stagger}
                    duration={HERO_KICKER.dur}
                  />
                </div>

                {/* BEAT TWO, first half — the kicker's own grammar at display
                    scale. `.heroMask` makes the clip vertical-only so the
                    negative letter-space is not shorn at rest; see
                    SplitWords' maskClassName. */}
                <div className={styles.heroLineTop} aria-hidden>
                  <SplitWords
                    as="span"
                    text="MAGINHAWA"
                    maskClassName={styles.heroMask}
                    on
                    delay={HERO_DELAY.title}
                    duration={HERO_DISPLAY_DUR}
                  />
                </div>

                <div className={styles.heroBottomRow}>
                  <div className={styles.heroAside}>
                    {/* BEAT THREE — the answer, in beat one's grammar, once
                        both display lines have settled. The emphasis is a
                        phrase rather than an index so a copy edit cannot
                        silently move it; see SplitWords' `em`. */}
                    <SplitWords
                      as="p"
                      className={styles.heroLede}
                      text={HERO_LEDE_TEXT}
                      em={HERO_LEDE_EM}
                      emClassName={styles.emItalic}
                      on
                      delay={HERO_LEDE.delay}
                      stagger={HERO_LEDE.stagger}
                      duration={HERO_LEDE.dur}
                    />
                  </div>

                  {/* BEAT TWO, second half — the same rise, a beat behind, so
                      the two lines of the title arrive in reading order
                      rather than together. The italic P overhangs its advance
                      width, which is the reason `.heroMask` exists at all. */}
                  <div className={styles.heroLineBottom} aria-hidden>
                    <SplitWords
                      as="span"
                      text="GROUP?"
                      maskClassName={styles.heroMask}
                      on
                      delay={HERO_DELAY.group}
                      duration={HERO_DISPLAY_DUR}
                    />
                  </div>
                </div>

                {/* THE PAGE IS 11,000px TALL AND SAID SO NOWHERE. The home
                    hero has carried this signpost since it was built; About
                    opens on a full-bleed film with no edge, no fold and
                    nothing below the type to suggest there is more. It is the
                    home page's own .scrollHint, in the same mono label voice
                    — deliberately not a new gesture.

                    STATIC ONCE LANDED, also copied from home: a signpost that
                    bobs is an animation, and this page has enough of those.
                    It fades in last, after the type and after the film has
                    started, so the entrance finishes on the one element that
                    tells the reader what to do next. */}
                <motion.div
                  className={styles.scrollCue}
                  /* THE CUE LEAVES WITH THE HERO. It had a fade IN and nothing
                     else, so it was still sitting at 0.8 opacity a full
                     viewport into the read — worst on a phone, where it lands
                     dead centre of the frame over a photograph and reads as a
                     label on the picture rather than as a signpost that has
                     been obeyed. Two elements because the two fades have
                     different jobs and different clocks: this one is a pure
                     function of scroll (so it is reversible, and scrolling
                     back up brings the cue back), the child's is the one-shot
                     entrance. Both are opacity, so both stay on the
                     compositor. */
                  style={{ opacity: cueFade }}
                  aria-hidden
                >
                  <motion.div
                    className={styles.scrollCueInner}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{
                      duration: 0.8,
                      ease: "easeOut",
                      delay: HERO_CUE_DELAY,
                    }}
                  >
                    <span>Scroll</span>
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 4.5 L6 8 L9.5 4.5" />
                    </svg>
                  </motion.div>
                </motion.div>
              </section>
            </div>

            {/* ---- Statement + Omar Shah band ----
                 Scrolls over the pinned video like everything else in the
                 scope — transparent now, the shared scrim carries the dark
                 field the cream type sits on. */}
            <div className={styles.band}>
          <section className={styles.statement}>
            {/* the shaped scrim its saffron phrases needed — first child so
                it paints under the type. See .statementScrim. */}
            <div className={styles.statementScrim} aria-hidden />

            <div className="container">
              {/* scrubbed, not revealed — see the Statement block above */}
              <Statement />
            </div>
          </section>

          {/* ---- Chef & Founder ----

               THE QUOTE IS THE HEADLINE NOW, and the move is structural
               rather than typographic. The page opens by asking "Who is
               MAGINHAWA GROUP?" and then spends two screens not answering it;
               "One restaurant became a family." answers it in five words and
               was filed as a caption under a name. Promoted, the hero's
               question and this line become one sentence with a screen
               between them, which is the only reason the hero's question is
               worth asking.

               THE SUCCESSION IS SAID PLAINLY. The old bio opened "Co-founder
               of the Maginhawa Group" one screen above a timeline whose first
               chapter says his PARENTS opened the original restaurant, and
               left the reader to reconcile the two. Omar founded the group;
               the first restaurant was his parents'. Both facts, in that
               order, in the first two sentences — the succession is the story,
               so it is told rather than implied.

               IT ALSO STOPPED LISTING. The old bio spent its words on
               Mamasons, Belly and the Michelin Guide, all three of which get
               their own chapters in the deck within seconds. A founder's bio
               directly above a timeline should carry what a timeline cannot:
               what carried over, and what he was trying to do with it.

               ONE ARRIVAL, TWO BEATS. Five nested Reveals (0 / 0 / 0.08 /
               0.14 / 0.2) used to spend a stagger across a screen break, where
               a stagger cannot be perceived at all — the name landed at the
               bottom of one screen and the columns were orphaned at the top of
               the next. The block is one grid row now and it arrives as one
               thing, with the quote a beat ahead of everything else because
               it is the sentence the section exists to deliver. */}
          <section className={styles.chef}>
            <div className="container">
              <div className={styles.chefGrid}>
                {/* seats the block on the film — see .chefScrim */}
                <div className={styles.chefScrim} aria-hidden />

                <Reveal className={styles.chefImage} delay={0.06}>
                  <Image
                    src="/images/omar.jpg"
                    alt="Omar Shah, founder of the Maginhawa Group"
                    width={678}
                    height={452}
                  />
                </Reveal>

                <div className={styles.chefText}>
                  <Reveal className={styles.chefLead}>
                    <span className={styles.eyebrow}>Chef &amp; Founder</span>
                    <h2 className={styles.chefQuote}>
                      One restaurant became a{" "}
                      <em className={styles.emItalic}>family</em>.
                    </h2>
                  </Reveal>

                  <Reveal className={styles.chefCredit} delay={0.12}>
                    <p className={styles.chefName}>Omar Shah</p>

                    <p className={styles.chefBody}>
                      Omar Shah founded the Maginhawa Group. The first
                      restaurant was his parents&rsquo; — Bintang, opened on
                      Kentish Town Road in 1987, feeding the neighbourhood he
                      grew up in. What carried over was not a recipe but a way
                      of receiving people, which is why the group is named for
                      the Tagalog word for comfort. Every restaurant since has
                      been that same welcome, set in a different kitchen.
                    </p>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>
            </div>

            <div className="container">
              {/* THE DECK OWNS ITS CURSOR. This section sits inside the
                  pinned video's data-cursor="glass" scope, and its nine cards
                  are large photographs — so the glass disc sprang across the
                  chapter being read, the copy beside it and the year wheel,
                  refracting type over cards that are themselves rotating in
                  3D. `default` switches the zone off from the inside; see
                  resolve() in CustomCursor.tsx. */}
              <section
                className={`${styles.story} ${cursor.optOut}`}
                data-cursor="default"
              >
            <div
              className={styles.storyShell}
              /* the horizon the wheel, the deck and the copy all hang from —
                 see railAxisOffset above and .storyShell in the stylesheet */
              style={
                {
                  "--rail-axis-offset": `${axisOffset.toFixed(2)}px`,
                } as CSSProperties
              }
            >
              {/* THIS COLUMN CARRIES THE SECTION'S HEADING, and until now it
                  carried nothing at all.

                  It was an <aside aria-hidden> containing a styled <span>
                  reading "Our Story" — so the section that is two thirds of
                  this page had no heading at any level, and the nine chapter
                  <h3>s hung under the chef block's pull-quote <h2> instead of
                  under the story they belong to. The visible words were there;
                  the outline was not, and `aria-hidden` meant no assistive
                  reader ever got even the words.

                  So the label IS the heading now. Not a second, hidden one:
                  a sr-only <h2> saying the same thing as a visible <span> is
                  two elements asserting one fact, and they drift.

                  A <div>, NOT AN <aside>, because a complementary landmark
                  cannot contain the heading of the section it sits in — and
                  because `aside` was only ever standing in for "this is
                  furniture", which `aria-hidden` on the two decorative
                  children now says precisely. The class carries every style,
                  so nothing about the rendered column changes.

                  The year odometer and the chapter dots keep `aria-hidden`
                  individually: both restate, as ornament, what the chapter
                  copy beside them says as text. */}
              <div className={styles.storyWheel}>
                <h2 className={styles.storyWheelLabel}>Our Story</h2>

                {/* NO STEMS. Two 1px saffron gradients with a glowing dot in
                    the middle of each used to run above and below the year.
                    They were the loudest thing in a column whose whole job is
                    one large numeral, and they said nothing the numeral, the
                    label and the dots below do not already say. Removed, not
                    hidden — see .storyWheel for the spacing that replaced the
                    room they were holding. */}

                <div className={styles.storyWheelMask} aria-hidden>
                  <div className={styles.storyCenturyColumn}>
                    <div
                      className={styles.storyNumberTrack}
                      style={{
                        transform: `translateY(calc(${activeCenturyIndex} * var(--wheel-step) * -1))`,
                      }}
                    >
                      {centuries.map((century) => (
                        <span
                          key={century}
                          className={`${styles.storyNumber} ${
                            century === activeCentury ? styles.isActive : ""
                          }`}
                        >
                          {century}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.storySuffixColumn}>
                    <div
                      className={styles.storyNumberTrack}
                      /* activeYearIndex, not activeStory — see above */
                      style={{
                        transform: `translateY(calc(${activeYearIndex} * var(--wheel-step) * -1))`,
                      }}
                    >
                      {STORY.map((story, index) => (
                        <span
                          key={`${story.year}-${story.title}`}
                          className={`${styles.storyNumber} ${
                            index === activeYearIndex ? styles.isActive : ""
                          }`}
                        >
                          {story.year.slice(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* chapter progress — docked under the wheel so it's always
                    on screen and never collides with the chapter cards. A
                    page indicator: nine identical dots, the seated one told
                    apart by size and weight rather than by colour. See
                    .storyProgress for the motion. */}
                <div className={styles.storyProgress} aria-hidden>
                  {STORY.map((story, index) => (
                    <span
                      key={`${story.year}-${story.title}`}
                      className={
                        index === activeStory ? styles.progressActive : ""
                      }
                    />
                  ))}
                </div>
              </div>

              {/* THE BRANCH IS HERE AND ONLY HERE. The shell, the container,
                  the video scope and the whole year-wheel column above are
                  shared by both branches — the deck swapped out the chapter
                  PHOTOGRAPHY, not the section. */}
              {deck ? (
                <StoryDeck
                  active={activeStory}
                  scale={scale}
                  onIndex={setActiveStory}
                />
              ) : (
              <ol className={styles.storyList}>
                {STORY.map((s, index) => (
                  <li
                    key={`${s.year}-${s.title}`}
                    ref={(el) => {
                      storyRefs.current[index] = el;
                    }}
                    data-index={index}
                    className={`${styles.storyItem} ${
                      index === activeStory ? styles.storyItemActive : ""
                    }`}
                  >
                    <div className={styles.storyMobileYear}>{s.year}</div>

                    <article
                      className={`${styles.storyContent} ${
                        s.layout === "portrait" ? styles.storyPortrait : ""
                      }`}
                    >
                      {/* THE LIST BRANCH IS THE MOBILE EXPERIENCE, and it was
                          serving nine RAW photographs through a plain <img>:
                          bintang.jpg is 3.7MB, cafemama 3.4, ramo 3.1, belly
                          2.8, hoodwood 2.7 — about 17MB of full-resolution
                          JPEG, unresized, undecoded-off-thread, on the branch
                          every phone and tablet gets.

                          It was measurable, not theoretical. At 390x844 the
                          scroll sweep threw isolated 43ms, 58ms, 75ms and
                          144ms frames at scattered positions — the signature
                          of a large image decoding on the main thread as it
                          scrolls in, not of anything the animations were
                          doing (the median never moved off 8.3ms).

                          next/image is the same treatment the deck branch has
                          always used on the same files, so this is the two
                          branches agreeing rather than a new idea: resized per
                          breakpoint, served as WebP/AVIF, and decoded
                          asynchronously off the scroll path. `sizes` is
                          honest about the layout — one column below 980px,
                          and roughly half the container above it where the
                          landscape spread puts the photo beside the text. */}
                      <Reveal className={styles.storyImageFrame}>
                        <Image
                          src={s.image}
                          alt={s.imageAlt}
                          fill
                          sizes="(max-width: 980px) 100vw, 50vw"
                          quality={74}
                          className={`${styles.storyImage} ${
                            s.wordmark ? styles.storyImageWordmark : ""
                          }`}
                        />
                      </Reveal>

                      <div className={styles.storyText}>
                        <div className={styles.storyMeta}>
                          Chapter {String(index + 1).padStart(2, "0")}
                          <span className={styles.storyMetaPlace}>
                            {s.place}
                          </span>
                        </div>

                        <Reveal>
                          <h3 className={styles.storyTitle}>{s.title}</h3>
                        </Reveal>

                        <Reveal delay={0.06}>
                          <p className={styles.storyBody}>{s.body}</p>
                        </Reveal>

                        {s.slug && (
                          <Reveal delay={0.1}>
                            <Link
                              href={`/restaurants/${s.slug}`}
                              className={styles.storyLink}
                            >
                              <span>See the restaurant</span>
                              <svg
                                viewBox="0 0 24 10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M0 5 H18" />
                                <path d="M14 1 L18 5 L14 9" />
                              </svg>
                            </Link>
                          </Reveal>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
              )}
            </div>
          </section>
            </div>

            {/* Awards & Recognition — rises over the pinned video as an
                opaque cream sheet (layered pinning: the video stays pinned
                beneath while this section slides up to cover it, and only
                releases underneath once hidden). The content inside is
                static — the slide-over entrance IS the effect. The eyebrow
                and the rows used to carry their own scroll reveals on top
                of it; two entrances stacked on one arrival read as a stall,
                and the rows re-animating under a sheet that had already
                delivered them made the table feel detached from its own
                title. Plain elements, no Reveal. */}
            {/* IT OWNS ITS CURSOR, for the same reason the deck does and
                with a worse symptom. This sheet is inside the pinned video's
                data-cursor="glass" scope, so the glass disc was live over it —
                and a lens refracting a FLAT CREAM FIELD refracts nothing,
                while the disc's ring is itself cream. The disc was there and
                invisible, and globals.css hides the native cursor under
                [data-cursor="glass"] *, so the reader had no pointer at all
                over the whole Awards table. See resolve() in CustomCursor.tsx
                and the cursor rule in CustomCursor.module.css. */}
            <section
              className={`${styles.coverage} ${cursor.optOut}`}
              data-nav-theme="light"
              data-cursor="default"
            >
              <div className="container">
              {/* A REAL HEADING, AND IT IS THE SECOND HALF OF THE OUTLINE FIX.

                  This was a styled <span> with a saffron dot in front of it,
                  set at label size — so, like "Our Story" above it, the title
                  of a whole section existed only as decoration. Checked
                  first: there was no heading underneath it to collide with,
                  unlike /contact's FAQ, which turned out to carry a real <h2>
                  all along.

                  THE DOT AND THE EYEBROW SIZE GO WITH IT. An eyebrow is a
                  label ABOVE a title; with nothing under it, it was a title
                  pretending to be a label, and the dot was the only thing
                  giving it any presence. */}
              <div className={styles.coverageHead}>
                <h2 className={styles.coverageTitle}>Awards &amp; Recognition</h2>

                {/* THE COUNT, AND IT IS DELIBERATELY NOT A BOAST. Of the 24
                    entries in lib/press.ts, Belly carries 15, Café Mama &
                    Sons 8 and Hoodwood 3 — Bintang, Guanabana, Ramo and
                    Mamasons have none at all. "The group has been widely
                    covered" would therefore be false about four of the seven
                    kitchens, so the line names the three it is true of and
                    says the number out loud. Three facts, no adjectives.

                    Rendered from the data rather than typed, so a new press
                    entry cannot leave the sentence lying. */}
                <p className={styles.coverageCount}>
                  {PRESS.length} write-ups to date, for{" "}
                  {COVERED_RESTAURANTS.join(", ").replace(/,([^,]*)$/, " and$1")}.
                </p>
              </div>

            <ol className={styles.coverageList}>
              {COVERAGE_GROUPS.map((group) => (
                <li key={group.outlet}>
                  <div className={styles.coverageGroup}>
                    <div className={styles.coverageOutlet}>{group.outlet}</div>

                    <div className={styles.coverageEntries}>
                      {group.entries.map((row, ri) => (
                        <a
                          key={ri}
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.coverageRow}
                        >
                          <span className={styles.coverageRestaurant}>
                            {row.restaurants.map((r, i) => (
                              <span
                                key={i}
                                className={styles.coverageRestaurantLine}
                              >
                                {r}
                              </span>
                            ))}
                          </span>

                          <span className={styles.coverageFeature}>
                            {row.feature}
                          </span>

                          <span className={styles.coverageArrow} aria-hidden>
                            <svg
                              viewBox="0 0 24 10"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M0 5 H18" />
                              <path d="M14 1 L18 5 L14 9" />
                            </svg>
                          </span>

                          {/* hover preview — always mounted, absolutely
                              positioned (see .coverageThumb) so it floats
                              between the feature text and the arrow and can
                              never reflow the row grid; decorative only */}
                          {row.image && (
                            <img
                              className={styles.coverageThumb}
                              src={row.image}
                              alt=""
                              aria-hidden
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
              </div>
            </section>
          </div>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}