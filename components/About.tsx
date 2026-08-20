"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Image, { getImageProps } from "next/image";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import styles from "./About.module.css";
/* the native-cursor opt-out that has to travel with every
   data-cursor="default" — see .optOut in that file */
import cursor from "./CustomCursor.module.css";
import { FEATURED_OUTLETS, PRESS } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";
import { asset } from "@/lib/media";

const OUTLET_PRIORITY = new Map(FEATURED_OUTLETS.map((o, i) => [o.name, i]));
const priorityOf = (name: string) => OUTLET_PRIORITY.get(name) ?? Infinity;

/* The nine chapters of the group's story, oldest first. The timeline renders
   each chapter's INDEX ENTRY — the year on the spine, the photograph in its
   seat, the title as the link out — while `body` and `place` ride along as
   the chapter's full record. The archive treatment deliberately does not
   print prose (see TimelineItem); the fields stay because they are the story,
   not because anything currently spends them.

   `slug` links the chapter to its restaurant. Geometry lives in SEATS below,
   dealt by position rather than derived from anything in here. */
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
    title: "Bunso",
    body: "The youngest of the family: a Filipino-Japanese kissaten and listening jazz bar, opening in London in 2026.",
    image: "/images/bunso.png",
    imageAlt: "Bunso wordmark",
    place: "London",
    slug: "bunso",
    wordmark: true,
  },
];

/* ---------------------------------------------------------------------------
   THE SEATS ARE DEALT BY POSITION, NOT HASHED FROM TITLES.

   A hash of the chapter's title used to deal each card one of two shapes —
   the right tool when the ask was "two shapes, random-looking, identical on
   the server and in the browser". The timeline needs four CORRELATED numbers
   per chapter, and the scatter is a composition rather than a deal: no two
   neighbours may share a span, the left edges swing instead of marching, the
   crop ratios alternate landscape/portrait. "Not the same as the one above"
   is exactly the constraint a hash cannot express, so the deal is written
   out. A literal is identical on server and client by definition — strictly
   stronger than the determinism the hash existed to buy — and a chapter can
   be retitled without silently re-dealing its geometry (which is what let
   "Bunso — coming soon" become "Bunso").

   THE INVARIANTS, printed because a table is only composed if somebody has
   checked what it actually says. With left = 0.5 + offset − span/2 and
   right = 0.5 + offset + span/2:

     spans   0.26 0.34 0.22 0.42 0.28 0.24 0.46 0.30 0.36 — no two adjacent equal
     lefts   0.15 0.35 0.08 0.21 0.41 0.12 0.09 0.38 0.19 — scattered, never
             monotonic, never under 0.05
     rights  0.41 0.69 0.30 0.63 0.69 0.36 0.55 0.68 0.55 — never past 0.70,
             because the title hangs off the frame's right edge at -40% of its
             width and needs that gutter to stay on the column
     ratios  L P L P L P L P L — strict alternation; the archive feel lives here
     drift   scales with span — bigger frames read nearer the camera and must
             move more, or the parallax reads as noise rather than depth

   THE RATIOS ARE AUTHORED CROPS. Six files serve nine chapters and every
   photograph is the same ≈0.667 portrait, so "native proportions" would give
   nine near-identical upright rectangles — the exact uniformity the scatter
   exists to avoid. Chapters 2 and 6 keep their true native ratios; the rest
   are crops the frame imposes via `object-fit: cover` plus a per-seat focus.
   The two repeated files are told apart by crop alone — cafemama at 1.25 vs
   0.667 (chapters 3 and 6), belly at 1.35 vs 0.80 (chapters 7 and 8) — a
   stated limitation until new photography exists, not a bug. */
type Seat = {
  /** frame width, as a fraction of the timeline column */
  span: number;
  /** frame centre's displacement from the centred spine, in the same
      fraction units — negative sits the frame left of the spine */
  offset: number;
  /** the frame's aspect ratio (width / height) — an authored crop, per the
      header above, not the file's native proportion */
  ratio: number;
  /** where the cover crop anchors, as a CSS object-position value */
  focus: string;
  /** parallax travel in px across the item's full pass through the
      viewport; negative drifts the frame upward, against the scroll */
  drift: number;
};

/* one seat per chapter, dealt by position — SEATS matches CHAPTERS by
   maintenance, and STORY zips them for TimelineItem */
const SEATS: Seat[] = [
  { span: 0.26, offset: -0.22, ratio: 1.5, focus: "50% 42%", drift: -34 },
  { span: 0.34, offset: 0.02, ratio: 0.5625, focus: "50% 50%", drift: -58 },
  { span: 0.22, offset: -0.31, ratio: 1.25, focus: "50% 38%", drift: -22 },
  { span: 0.42, offset: -0.08, ratio: 0.75, focus: "50% 45%", drift: -76 },
  { span: 0.28, offset: 0.05, ratio: 2, focus: "50% 40%", drift: -44 },
  { span: 0.24, offset: -0.26, ratio: 0.667, focus: "50% 50%", drift: -30 },
  { span: 0.46, offset: -0.18, ratio: 1.35, focus: "50% 44%", drift: -88 },
  { span: 0.3, offset: 0.03, ratio: 0.8, focus: "50% 36%", drift: -50 },
  { span: 0.36, offset: -0.13, ratio: 2.4, focus: "50% 50%", drift: -64 },
];

const STORY = CHAPTERS.map((chapter, index) => ({
  ...chapter,
  seat: SEATS[index],
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

// hover-image guard — this restaurant `image` path is a placeholder that
// does not exist under /public. Rows resolving to it get no hover image at
// all rather than a broken <img>.
//
// Mamasons has come off this list: lib/restaurants.ts pointed at
// `/images/mamasons-placeholder.jpg`, which was never added, so the grid tile
// on /restaurants was blank and this guard was quietly covering for it on
// /about. It now uses the same photograph Discover shows on the home page, so
// there is a real file behind it and nothing to suppress. Bunso genuinely has
// no photograph yet — Discover renders it as a maroon field with the wordmark
// (image: null) rather than a picture — so it stays.
const MISSING_IMAGES = new Set(["/images/bunso-placeholder.jpg"]);

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
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
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
          easing: "var(--ease-entrance)",
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

/* ===========================================================================
   THE OPENING IS SCROLL-SCRUBBED, AND IT IS THE READER WHO OPENS IT
   ===========================================================================

   WHAT REPLACED WHAT. This page used to open on a TIMED three-beat entrance
   — "Who is" rising word by word, then MAGINHAWA and GROUP? at display
   scale, then the lede — on a schedule of constants (HERO_KICKER, HERO_DELAY,
   HERO_LEDE, HERO_LANDS_MS, HERO_CUE_DELAY) that four other things read: the
   frame the film was allowed to start playing on, the settle keyframe in the
   stylesheet, and the scroll cue's own fade-in. All of it played itself at
   the reader in the first three seconds whether they were looking or not.

   The opening is now driven entirely by scroll position:

     1. "About Us" sits centred on the cream page, with a scroll indicator
        under it. Nothing has happened and nothing will until the reader
        moves.
     2. The two words travel apart in opposite directions, and the film
        opens in the hole between them.
     3. The film grows until it fills the screen; the words leave through
        their own edges a beat before it closes.
     4. The question and the answer — "Who is MAGINHAWA GROUP?" and the
        lede — rise onto the full-screen film.

   EVERY ONE OF THOSE IS A PURE FUNCTION OF SCROLL. There is not a timer or a
   spring anywhere in it, which is the property that makes it reversible:
   scrolling back up unwinds the film into the hole and closes the words over
   it. A spring would still be settling after the wheel had stopped, and a
   timeout could not be run backwards at all — the same reason Manifesto
   dropped its springs when its statement became scrubbed.

   THE FILM IS THE PAGE'S OWN PINNED BACKDROP, NOT A SECOND VIDEO. The scope
   below already sticks one 100svh <video> behind the whole first half of the
   page; the opening scales THAT element's frame, so the "video" that grows is
   the same file the statement and the founder's block scroll over afterwards.
   No second element, no second fetch, and no cut at the handover — when the
   scrub finishes, the frame is at scale 1 and the page is exactly the page it
   would have been. public/ is ~709MB and belly-hero.mp4 is 25MB of that; a
   second copy for the opening would have been the single most expensive thing
   on the site.

   THE STAGE IS STICKY, NOT PINNED BY SCRIPT. `position: sticky` inside a tall
   runway costs no scroll listener, no `lenis.stop()`, no overflow lock and no
   document-height arithmetic — and it cannot leave the page held if the
   component unmounts mid-scroll, which is the failure mode the retired
   restaurant-grid assembly kept shipping. Lenis is left entirely alone by
   this section. */

/* HOW LONG THE OPENING TAKES, in viewport heights of scrolling. The stage is
   one screen and sticks for OPENING_VH − 100 of travel, so this is 2.2
   screens of scroll to open the film and read the answer. Measured against a
   900px viewport that is 1980px, i.e. about four notches of this site's
   deliberately slow wheel (see lib/SmoothScroll: lerp 0.032, wheelMultiplier
   0.58). Shorter and the film snaps open under one flick; much longer and the
   reader is scrolling through a held screen wondering if the page is stuck. */
const OPENING_VH = 320;

/* THE PARTING, as a window inside the scrub's own [0,1].
   It does not start at 0: the first few percent are the reader's first
   movement, and something that begins on the very first pixel of scroll reads
   as the page reacting to a twitch. It does not run to 1 either — the last
   fifth is the answer's, so the film is already still when the type arrives
   on it. */
const PART_FROM = 0.05;
const PART_TO = 0.72;

/* ── THE GEOMETRY IS MEASURED, AND IT HAS TO BE ──────────────────────────
   The first version of this was measurement-free: each word travelled a
   fixed 58vw and the film's width was clamped to `58·p − air`, on the
   argument that a word's inner edge starts at or before the screen's centre
   so the travel alone bounds the hole. That argument is wrong, and the probe
   caught it at the first sample.

   ABOUT IS THREE TIMES THE WIDTH OF US. The pair is centred AS A LINE, so
   the JOINT between the two words does not sit on the screen's centre —
   measured at 1440×900 with the display face loaded, ABOUT's right edge is
   at +137px and US's left edge at +178px, i.e. the hole is 41px wide and its
   centre is 157px RIGHT of the middle of the screen. A film centred on the
   screen is therefore not in the hole at all: it is behind ABOUT, and it
   stays behind it for most of the parting. (Discover's retired assembly hit
   the same wall from the other side — "Our" against "Restaurants." put the
   joint 163px LEFT of centre — and its note is the reason this was
   recognised rather than tuned around.)

   So three numbers are read off the real line, once, and everything else is
   arithmetic on them:

     inL   ABOUT's right edge, relative to the screen centre
     inR   US's left edge, relative to the screen centre
     trav  how far each word travels — `half the screen + max(inL, inR) +
           air`, which is the distance that clears the WIDER-reaching of the
           two through its own screen edge. Both words take the SAME travel,
           and that is load-bearing rather than tidy: unequal travels move
           the hole's centre while the film is trying to sit in it, which is
           a second moving target for no gain.

   THE FILM THEN RIDES THE HOLE. Its centre eases from the joint back to the
   screen centre across the parting (so it is born where the words open and
   arrives centred exactly as it fills the screen), and its half-width is the
   smaller of the two clearances the words have actually opened, less the
   air. Overlap is impossible by construction rather than by tuning — which
   is the property probe-about-open.mjs checks at every one of its samples,
   not just at the ends.

   RE-MEASURED WHEN IT CAN CHANGE, and only then: at mount, when the display
   face resolves (the fallback's metrics give a different joint entirely —
   the same trap Discover's fitTitle and JoinUs's seam both record), and on
   resize. Not per frame: the line does not move while it is being scrubbed,
   because the words' travel is a transform. */
const FILM_AIR_VW = 2;

/* THE ANSWER'S WINDOW. It begins where the parting ends and runs to the end
   of the scrub, so the question rises onto a film that has already stopped
   growing — two things arriving at once is what the retired timed entrance
   was criticised for on this very page. */
const ANSWER_FROM = 0.74;
const ANSWER_TO = 0.96;

/* THE PARTING'S OWN CURVE, and it is NOT the site's shared enter curve.
   SCRUB_EASE (0.22, 1, 0.36, 1) is ease-out dominant — it is 63% of the way
   through its travel at a fifth of its window, which is exactly right for a
   word rising out of a mask and wrong for a movement that IS the section.
   Measured with it: at 18% of the scrub the film was already 73% of the
   screen wide and "Us" had left, so the whole "the words open the picture"
   reading happened in the first three hundred pixels and the remaining
   1,700 had nothing left to do.

   A symmetric ease-in-out instead: soft at both ends so neither the first
   nor the last pixel of the window jerks, and very nearly linear through
   the middle, where the reader's hand should be moving the picture at its
   own rate. This is the one curve on the page chosen for a scrub rather
   than for an entrance. */
const OPEN_EASE = cubicBezier(0.4, 0, 0.6, 1);

/* THE INDICATOR LEAVES ON THE FIRST MOVEMENT. 0 → 0.04 of the scrub is ~88px
   at a 900px viewport: gone as soon as the reader has demonstrably started,
   and back if they return to the top, because it is a pure function of scroll
   like everything else here. A signpost that is still on screen after the
   reader has obeyed it is the exact defect this page's own stylesheet
   recorded against the old cue. */
const CUE_OUT = 0.04;

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
  "Maginhawa is Tagalog for comfortable - a life of ease. Comfort is the thread through every kitchen we run.";

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
     page, which is the exact cost SplitWords' CSS driver was written to
     avoid. The class is toggled by an observer on the paragraph itself: two
     toggles per visit, none of them on a scrub frame, and outside the range
     the words are not moving anyway.

     Not React state — a re-render here would reconcile nineteen children to
     change one boolean. A hand-toggled class on the DOM node is the whole
     mechanism. */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) =>
        el.classList.toggle(styles.statementLive, entry.isIntersecting),
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

/* ---------------------------------------------------------------------------
   ONE CHAPTER ON THE TIMELINE — its own component, and that is forced, not
   stylistic: each item owns a useScroll (a hook, so it cannot live in the
   parent's .map) and its own entrance observer. Nothing in here reports
   upward. The section has NO scroll-driven active chapter any more — the
   archive's only states are hover and focus, and both live entirely in the
   stylesheet — so the parent renders nine of these and holds no per-item
   refs, no indices, no observers.
   --------------------------------------------------------------------------- */

/* the single centred column below 981px — the width at which the section's
   old two-column shell collapsed, kept so it has one notion of "narrow".
   External-store machinery rather than a resize listener because it is a
   media query: the browser already owns its state. */
const NARROW_MQ = "(max-width: 980px)";
const subscribeNarrow = (onChange: () => void) => {
  const mq = window.matchMedia(NARROW_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const narrowSnapshot = () => window.matchMedia(NARROW_MQ).matches;
/* the server renders the wide drift; the value only feeds a motion style
   applied after mount, so hydrating against `false` cannot mismatch markup */
const narrowServerSnapshot = () => false;

function TimelineItem({ chapter }: { chapter: (typeof STORY)[number] }) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = useReducedMotion();
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    narrowSnapshot,
    narrowServerSnapshot,
  );

  const { span, offset, ratio, focus, drift } = chapter.seat;

  /* the parallax — scroll-linked, per item, at the item's own rate. The
     travel is the seat's `drift` across the item's full pass through the
     viewport, halved on the narrow column where the frames are centred and
     large relative to the screen. Under reduced motion the RANGE is zeroed
     rather than the style prop withheld: the motion style has to render on
     the server and the client alike, or a reduce-preferring reader's first
     paint disagrees with the SSR markup and React reports a hydration
     mismatch. A zeroed range computes to no transform at all — the same
     stillness, without the fork in the markup. */
  const { scrollYProgress } = useScroll({
    target: itemRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, narrow ? drift / 2 : drift],
  );

  /* THE ENTRANCE OBSERVER — new, small, and deliberately not the old
     centre-line detector (that one existed to pick an active chapter, which
     no longer exists as a concept). One-shot: it flips `entered` so the
     stylesheet can run the frame's clip-path wipe, then disconnects. A plain
     observer rather than whileInView because the reveal target sits inside
     an overflow-hidden mask, where whileInView never fires. */
  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(item);
    return () => observer.disconnect();
  }, []);

  /* the title's safe measure — how wide the right-hung title may grow before
     it walks back across the column, expressed as a percentage of the FRAME
     (its absolute containing block), which is what makes it exact at any
     rendered column width rather than assuming the 1120px cap */
  const right = 0.5 + offset + span / 2;
  const titleSafe = ((1 - right + 0.4 * span) / span) * 100;

  return (
    <li
      ref={itemRef}
      className={`${styles.storyItem} ${entered ? styles.entered : ""}`}
      style={
        {
          "--tl-span": span,
          "--tl-offset": offset,
          "--tl-ratio": ratio,
          "--tl-focus": focus,
          "--tl-safe": `clamp(14ch, ${titleSafe.toFixed(1)}%, 45ch)`,
        } as CSSProperties
      }
    >
      {/* the year is CONTENT here, not ornament — it is the only place the
          date appears, so it is a real <time>, never aria-hidden. It seats at
          the item's head on the spine and the frame tucks over its bottom
          third by z-order (see .year) — partial occlusion is the composition.
          It rides the SAME MotionValue as the frame, so that tuck holds
          constant through the parallax: on a static year the frame's upward
          drift would swallow up to |drift|/2 more of the numeral exactly when
          the item is centred in the viewport — the one position every reader
          actually holds it in. Sharing `y` keeps year and photograph moving
          as one archival plate, and it must stay OUTSIDE .itemBody so the
          sibling spotlight cannot dim it. */}
      <motion.time
        className={styles.year}
        dateTime={chapter.year}
        style={{ y }}
      >
        {chapter.year}
      </motion.time>

      {/* everything that dims under the sibling spotlight lives in
          .itemBody; the year above and the marker below stay lit — see the
          stylesheet */}
      <div className={styles.itemBody}>
        <motion.div className={styles.parallax} style={{ y }}>
          <div className={styles.frame}>
            <Image
              src={chapter.image}
              alt={chapter.imageAlt}
              fill
              sizes={`(max-width: 600px) 72vw, (max-width: 980px) 50vw, ${Math.round(
                span * 1120,
              )}px`}
              quality={74}
              className={`${styles.storyImage} ${
                chapter.wordmark ? styles.storyImageWordmark : ""
              }`}
              data-loaded={loaded ? "true" : undefined}
              onLoad={() => setLoaded(true)}
            />
          </div>
        </motion.div>

        <h3 className={styles.storyTitle}>
          <span className={styles.titleInner}>
            {/* THE CHAPTER TITLE LINKS OUT, OR NOT AT ALL. It used to open
                `/restaurants/<slug>`, this site's page for the room; that
                route is gone, so the destination is the restaurant's own
                site — an external link, in a new tab, like every other
                outbound link here. A chapter whose venue has no site of its
                own prints as plain type rather than as a link to the
                index: the title is a heading first, and a heading that
                navigates somewhere generic is a worse promise than one
                that does not navigate at all. */}
            {chapter.slug && getRestaurant(chapter.slug)?.website ? (
              <a
                href={getRestaurant(chapter.slug)!.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.storyLink}
              >
                {chapter.title}
              </a>
            ) : (
              chapter.title
            )}
            {chapter.wordmark && (
              <span className={styles.titleSoon}>(Coming soon)</span>
            )}
          </span>
        </h3>
      </div>

      {/* the diamond on the spine — pure ornament, unlike the year */}
      <span className={styles.marker} aria-hidden />
    </li>
  );
}

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);

  /* ---- the pinned film, and the opening that opens it ----
     The <video> is a sticky 100svh backdrop for the whole first half of the
     page: the opening's stage, the statement, the founder's block and the
     story timeline all scroll over the same frame, and the Awards sheet
     finally covers it. A constant scrim keeps cream type legible on it at
     every one of those positions. */
  const reduceMotion = useReducedMotion();

  /* THE SCRUB. One `useScroll` over the opening's runway drives everything in
     the stage AND the film's scale — one subscription, one progress, so the
     words, the picture and the answer cannot drift apart by a frame however
     the windows above are retuned.

     `["start start", "end end"]` is the sticky stage's own life: 0 is the
     runway's top at the top of the window (the stage has just stuck), 1 is
     its bottom at the bottom of the window (the stage is about to release).
     Anything outside that is clamped, so scrolling back to the very top
     leaves the composition exactly as it was found. */
  const openRef = useRef<HTMLElement>(null);
  const { scrollYProgress: openP } = useScroll({
    target: openRef,
    offset: ["start start", "end end"],
  });

  /* The parting, eased ONCE and read by everything that belongs to it — the
     two words and the film's scale all come off this single value, so they
     cannot drift apart by a frame however the windows are retuned. See
     OPEN_EASE for why this is not the site's shared enter curve. */
  const part = useTransform(openP, [PART_FROM, PART_TO], [0, 1], {
    clamp: true,
    ease: OPEN_EASE,
  });
  /* THE MEASURED LINE, as MotionValues rather than state.
     They are read INSIDE the transforms below, so a re-measure (fonts
     arriving, a resize) recomputes the film's seat and the words' travel on
     the same frame. Held in state instead, `useTransform`'s closure would
     only pick the new numbers up the next time the scroll changed — which,
     for a reader who resizes a stopped window, is never. */
  const inL = useMotionValue(0);
  const inR = useMotionValue(0);
  const trav = useMotionValue(0);
  const air = useMotionValue(0);
  /* HALF THE VIEWPORT, AS A MOTIONVALUE RATHER THAN `window.innerWidth`
     READ INSIDE THE TRANSFORM. `useTransform`'s mapper is evaluated during
     render to seed its value, including on the SERVER — a `window` reference
     in there is a 500 on the document, which is exactly what it was: the
     page still hydrated and looked correct in a browser (Next recovers by
     client-rendering), so this was invisible except in the status code.
     Measured with the rest of the line below. */
  const half = useMotionValue(0);
  const wordARef = useRef<HTMLSpanElement>(null);
  const wordBRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const a = wordARef.current;
      const bEl = wordBRef.current;
      if (!a || !bEl) return;
      const cx = window.innerWidth / 2;
      /* the RESTING line, which is what these numbers describe — the words
         carry a transform while the scrub runs, and getBoundingClientRect
         reports the transformed box. Reading it mid-scrub would feed the
         clamp the geometry of a line that has already moved. The rects are
         corrected back to rest by subtracting whatever x is on them, which
         is cheaper and steadier than clearing the transform and forcing a
         reflow twice per measurement. */
      const ar = a.getBoundingClientRect();
      const br = bEl.getBoundingClientRect();
      const left = ar.right - (wordAX.get() || 0) - cx;
      const right = br.left - (wordBX.get() || 0) - cx;
      if (!ar.width || !br.width) return;
      const gap = window.innerWidth * (FILM_AIR_VW / 100);
      inL.set(left);
      inR.set(right);
      air.set(gap);
      half.set(cx);
      // clears the further-reaching of the two words through its own screen
      // edge; both take it, so the hole's centre never moves
      trav.set(cx + Math.max(left, right) + gap);
    };
    measure();
    /* AND AGAIN WHEN THE REAL FACE ARRIVES. Contralto comes in over the
       two-hop Adobe stylesheet (app/layout.tsx), so on a cold cache the
       measurement above reads the FALLBACK's metrics — a different joint, a
       wrong travel, both latched until the next resize. Same pattern, and
       the same reason, as Discover's fitTitle and JoinUs's seam geometry. */
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // wordAX/wordBX are stable MotionValues; the setters are too
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* the two words, in measured px. Same travel each, so the hole between
     them keeps the centre it started with. */
  const wordAX = useTransform([part, trav], ([p, t]: number[]) => -t * p);
  const wordBX = useTransform([part, trav], ([p, t]: number[]) => t * p);

  /* THE FILM RIDES THE HOLE.
     x      the frame's centre eases from the joint — the midpoint of the gap
            the two words leave at rest — back to the screen's centre across
            the parting, so the picture is born exactly where the words open
            and is dead centre by the time it fills the screen.
     scale  the SMALLER of the two clearances the words have actually opened
            about that centre, less the air, as a fraction of the half
            screen. Whatever the words do, the picture cannot reach either
            one: the bound is the geometry itself rather than a number that
            happened to look right. */
  const filmX = useTransform(
    [part, inL, inR],
    ([p, l, r]: number[]) => ((l + r) / 2) * (1 - p),
  );
  const filmScale = useTransform(
    [part, inL, inR, trav, air, half],
    ([p, l, r, t, g, hw]: number[]) => {
      // nothing has been measured yet (the server, and the frame before the
      // layout effect runs) — a zero scale is the resting state anyway
      if (!hw) return 0;
      // the frame's centre, and the two words' inner edges, at this progress
      const c = ((l + r) / 2) * (1 - p);
      const roomL = c - (l - t * p);
      const roomR = r + t * p - c;
      return Math.min(1, Math.max(0, (Math.min(roomL, roomR) - g) / hw));
    },
  );
  const filmFade = useTransform(part, [0.02, 0.12], [0, 1], { clamp: true });

  /* The answer: opacity and a short rise, both pure functions of the same
     progress. No stagger, no per-word mask — a mask sequence is a TIMED
     animation wearing a scroll trigger, and this beat has to be able to run
     backwards under the reader's hand like the rest of the opening. */
  const answerFade = useTransform(openP, [ANSWER_FROM, ANSWER_TO], [0, 1], {
    clamp: true,
    ease: SCRUB_EASE,
  });
  const answerY = useTransform(openP, [ANSWER_FROM, ANSWER_TO], [28, 0], {
    clamp: true,
    ease: SCRUB_EASE,
  });
  const cueFade = useTransform(openP, [0, CUE_OUT], [1, 0], { clamp: true });

  /* THE FILM STARTS WHEN THE READER DOES.
     `preload="none"` and no `src`-side autoplay in the markup, then both are
     turned on the first time the scrub moves off zero. Three things follow
     from that and all three are the point:
       · a reader who never scrolls never fetches 25MB
       · nothing competes with the fonts and the stylesheet for the first
         paint of a page whose first screen is one word of display type on
         cream
       · the film's first visible frame is the one the words open onto,
         rather than whatever the decoder happened to reach three seconds
         after hydration
     REDUCED MOTION KEEPS THE POSTER and never fetches the file at all — a
     looping film under the whole page is exactly the ambient movement the
     preference asks to be spared.
     Driven imperatively off the ref: both values are ones React would
     otherwise re-render the whole page to change, and neither is worth a
     render. */
  const videoRef = useRef<HTMLVideoElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduceMotion) {
      v.pause();
      return;
    }
    const go = (p: number) => {
      if (started.current || p < 0.005) return;
      started.current = true;
      v.preload = "auto";
      /* rejects when the browser declines to start (no user gesture, a
         decode error, the element already gone) — the poster is the fallback
         and it is already on screen, so there is nothing to recover */
      void v.play().catch(() => {});
    };
    go(openP.get());
    return openP.on("change", go);
  }, [reduceMotion, openP]);

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

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main-content" className={styles.page} data-nav-theme="light">
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
            {/* THE FRAME THE SCRUB SCALES. It wraps the film AND the scrim so
                the two shrink together — a full-screen scrim over a
                quarter-screen picture would be a dark page with a bright
                hole in it, which is the opposite of the reading.

                ONE TRANSFORM AND ONE OPACITY, both on this element and
                nothing else on it. That keeps the whole opening on the
                compositor: no width, no height, no top, no left, no
                clip-path (which is a paint-level property in most engines
                and would repaint a playing video every frame).

                Reduced motion gets no style object at all rather than a
                style object holding identity values — an inline transform,
                even `scale(1)`, promotes the element and holds a compositor
                layer under the entire first half of the page for nothing. */}
            <motion.div
              className={styles.filmFrame}
              style={
                reduceMotion
                  ? undefined
                  : { x: filmX, scale: filmScale, opacity: filmFade }
              }
            >
              {/* NO autoPlay AND preload="none" IN THE MARKUP — both are set
                  from the effect above, on the reader's first scroll. See
                  that effect for the three reasons. */}
              <video
                ref={videoRef}
                className={styles.heroVideo}
                src={asset("/videos/belly-hero.mp4")}
                poster={asset("/images/belly.jpg")}
                muted
                loop
                playsInline
                preload="none"
              />
              <div className={styles.videoScrim} />
            </motion.div>
          </div>

          <div className={styles.videoContent}>
            {/* ═══════════════ THE OPENING ═══════════════
                A tall runway with one sticky screen in it. The runway is the
                clock — its progress IS the scrub — and the stage is the only
                thing the reader ever sees. Nothing here touches Lenis, locks
                the root, or adds a scroll listener: `position: sticky` does
                the pinning, and a sticky element cannot leave the page held
                if this component unmounts mid-scroll.

                REDUCED MOTION sizes the runway to its content and unsticks
                the stage (see .opening[data-static]): the title takes one
                still screen and the question and answer take the next, with
                the film at full size behind both. Two screens rather than
                one — collapsing to a single screen was tried first and put
                "ABOUT US" straight through the middle of "MAGINHAWA GROUP?",
                which is not a degraded animation but an unreadable page. */}
            <section
              ref={openRef}
              className={styles.opening}
              /* the runway's height, from the constant rather than from the
                 stylesheet's own fallback — one source for the number that
                 decides how much scrolling the opening takes. The scrub's
                 `offset` is written against this box, so the two can never
                 disagree about the mapping, only about the duration. */
              style={
                { "--opening-vh": OPENING_VH } as CSSProperties
              }
              data-static={reduceMotion ? "" : undefined}
              aria-label="About Maginhawa Group"
            >
              <div className={styles.openStage}>
                {/* THE TRAIL IS FIRST, AHEAD OF THE SCRIM, and the order is
                    the whole of why it is safe — see HeroTrail. */}
                <HeroTrail />

                {/* THE SHAPED SCRIM, on the same fade as the answer it seats.
                    It exists to hold the four lines of the answer off the
                    footage (the derivation is in .heroScrim, and it is a
                    measurement rather than a taste); before the answer
                    arrives there is nothing on the film to seat, and a
                    standing ellipse of ink over the picture while it is
                    still opening is a smudge on the one moment the reader is
                    watching the photograph. */}
                <motion.div
                  className={styles.heroScrim}
                  aria-hidden
                  style={reduceMotion ? undefined : { opacity: answerFade }}
                />

                {/* ── BEATS 1–3: the title, and the film it opens.
                    ONE <h1> WITH TWO SPANS. The words have to move
                    independently, so they cannot be one text node; the space
                    between them is a real character in a `font-size: 0` span
                    (SplitWords' own trick, and .titleSpace's on the home
                    page) so the heading's textContent reads "About Us" for
                    find-in-page, copy-paste and anything that falls back to
                    content, while contributing no advance of its own — the
                    visible gap is the words' own margin, which is the metric
                    the film's clamp is written against. */}
                {/* TITLE AND INDICATOR IN ONE BOX, and that box is what
                    changes shape under reduced motion. Scrubbed, it is an
                    absolute layer filling the stage; static, it becomes an
                    ordinary full-height block so the title gets a screen of
                    its own and the answer gets the next one — see
                    .opening[data-static]. The cue has to travel with the
                    title or it seats itself at the foot of two stacked
                    screens instead of under the words. */}
                <div className={styles.openHead}>
                  <h1 className={styles.openTitle}>
                    <motion.span
                      ref={wordARef}
                      className={styles.openWord}
                      style={reduceMotion ? undefined : { x: wordAX }}
                    >
                      About
                    </motion.span>
                    <span className={styles.openSpace}> </span>
                    <motion.span
                      ref={wordBRef}
                      className={styles.openWord}
                      style={reduceMotion ? undefined : { x: wordBX }}
                    >
                      Us
                    </motion.span>
                  </h1>

                  {/* ── THE INDICATOR. The page is 11,000px tall and its first
                    screen is two words on cream with no edge, no fold and
                    nothing under them to suggest it continues; the reader has
                    to be told that scrolling is what opens this.

                    It is the home hero's own signpost (Hero.module.css
                    .scrollHint) in the same mono-caps voice with the same
                    chevron — deliberately not a new gesture — and it does NOT
                    move once it is there. A signpost that bobs is one more
                    animation on a screen whose whole subject is a single
                    movement, and a slow loop is specifically the ambient
                    motion a reduced-motion reader is asking to be spared.

                    IT IS HONEST BECAUSE IT IS SCROLL-LINKED. It fades over
                    the first 4% of the scrub, so it is gone the moment the
                    reader has demonstrably started and back if they return to
                    the top. Reduced motion keeps it at full strength: an
                    opacity that aids comprehension is exactly what the
                    preference asks to be left alone. */}
                  <motion.div
                    className={styles.scrollCue}
                    style={reduceMotion ? undefined : { opacity: cueFade }}
                    aria-hidden
                  >
                    <div className={styles.scrollCueInner}>
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
                    </div>
                  </motion.div>
                </div>
                {/* ── BEAT 4: the question, and the answer to it.
                    This is the page's old hero, unchanged in layout, copy and
                    type — the kicker on MAGINHAWA's shoulder, GROUP? ranged
                    right with the lede beside it — moved into the stage and
                    handed a scrubbed opacity instead of a three-beat timed
                    entrance. Every class below is the one it already wore, so
                    the ~150 lines of measured typography in .heroKicker,
                    .heroLineTop/.heroLineBottom and .heroBottomRow all still
                    apply.

                    PLAIN TEXT, NOT SplitWords. The word-mask rise is a timed
                    animation, and a timed animation inside a scrub either
                    runs past the reader's hand or has to be re-triggered
                    every time they scroll back over it. The block's arrival
                    is the scrub itself.
                    `.heroMask`'s asymmetric clip goes with the masks — there
                    is nothing clipping these lines now, so MAGINHAWA's
                    negative letter-space and GROUP?'s edges are simply
                    unshorn. */}
                <motion.div
                  className={styles.openAnswer}
                  style={
                    reduceMotion
                      ? undefined
                      : { opacity: answerFade, y: answerY }
                  }
                >
                  <div className="container">
                    <div className={styles.hero}>
                      <p className={styles.heroKicker}>Who is</p>
                      <p className={styles.heroLineTop}>MAGINHAWA</p>
                      <div className={styles.heroBottomRow}>
                        <div className={styles.heroAside}>
                          <p className={styles.heroLede}>
                            A London family of restaurants - from a Camden
                            kitchen in 1987 to seven distinct dining
                            destinations today. Made with heritage and{" "}
                            <em className={styles.emItalic}>
                              served with heart
                            </em>
                            .
                          </p>
                        </div>
                        <p className={styles.heroLineBottom}>GROUP?</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

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
                        <span className={styles.eyebrow}>
                          Chef &amp; Founder
                        </span>
                        <h2 className={styles.chefQuote}>
                          One restaurant became a{" "}
                          <em className={styles.emItalic}>family</em>.
                        </h2>
                      </Reveal>

                      <Reveal className={styles.chefCredit} delay={0.12}>
                        <p className={styles.chefName}>Omar Shah</p>

                        <p className={styles.chefBody}>
                          Omar Shah founded the Maginhawa Group. The first
                          restaurant was his parents&rsquo; - Bintang, opened on
                          Kentish Town Road in 1987, feeding the neighbourhood
                          he grew up in. What carried over was not a recipe but
                          a way of receiving people, which is why the group is
                          named for the Tagalog word for comfort. Every
                          restaurant since has been that same welcome, set in a
                          different kitchen.
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
                {/* THE HEADING STAYS WHEN THE WHEEL GOES. "Our Story" was the
                year wheel's <h2> — and before that an aria-hidden span, which
                once left the nine chapter <h3>s hanging under the chef
                block's heading. The wheel is deleted; the heading is rehomed,
                not removed, and it leads the section as the archive masthead
                now. See .storyHeading for the type law it amends. */}
                <h2 className={styles.storyHeading}>Our Story</h2>

                {/* THE INDEX. One <ol> at every width — the deck/list fork, the
                year wheel and the scroll-driven active chapter are all gone.
                Chronological because it is an archive; each item is its own
                component because each owns a useScroll and an entrance
                observer, and hooks cannot live in a .map. */}
                <ol className={styles.timeline}>
                  {STORY.map((chapter) => (
                    <TimelineItem
                      key={`${chapter.year}-${chapter.title}`}
                      chapter={chapter}
                    />
                  ))}
                </ol>
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
                  <h2 className={styles.coverageTitle}>
                    Awards &amp; Recognition
                  </h2>

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
                    {COVERED_RESTAURANTS.join(", ").replace(
                      /,([^,]*)$/,
                      " and$1",
                    )}
                    .
                  </p>
                </div>

                <ol className={styles.coverageList}>
                  {COVERAGE_GROUPS.map((group) => (
                    <li key={group.outlet}>
                      <div className={styles.coverageGroup}>
                        <div className={styles.coverageOutlet}>
                          {group.outlet}
                        </div>

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

                              <span
                                className={styles.coverageArrow}
                                aria-hidden
                              >
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
                                  src={asset(row.image)}
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
