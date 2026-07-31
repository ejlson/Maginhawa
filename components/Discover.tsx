"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Discover.module.css";
import { getRestaurant } from "@/lib/restaurants";
import { setChapterReady } from "@/lib/chapter";
import { lenisRef } from "@/lib/SmoothScroll";
import SplitWords from "./SplitWords";

// Local presentation copy for the grid — richer blurbs than the canonical
// lib/restaurants.ts entries, which stay the source of truth for routing,
// bookability and structured data.
type DiscoverItem = {
  slug: string;
  name: string;
  tag: string;
  location: string;
  image: string | null;
  logo: string | null;
  blurb: string;
  // secondary credential mark (e.g. Michelin Guide for Belly)
  badge?: string;
  badgeLabel?: string;
  // menu overlay pages + small-caps subtitle (e.g. "February 2026")
  menuPages?: string[];
  menuLabel?: string;
  bookingUrl?: string;
  // £ / ££ / £££ — rides the caption line and the expansion
  priceRange?: string;
  // founding year — the heritage mark on the caption line
  est?: number;
  // short muted clip that plays inside the plate on hover
  clip?: string;
};

const ITEMS: DiscoverItem[] = [
  {
    slug: "bintang",
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "93 Kentish Town Rd, London NW1 8NY",
    image: "/images/bintang.jpg",
    logo: "/logo/bintang.png",
    menuPages: [
      "/menu/bintang/bintang_menu-1.png",
      "/menu/bintang/bintang_menu-2.png",
    ],
    menuLabel: "February 2026",
    blurb: "A Kentish Town staple since 1987 — Chef Omar's family kitchen, blending Malay, Indonesian, Japanese, Vietnamese and Filipino cooking.",
    priceRange: "££",
    est: 1987,
    clip: "/videos/tile-bintang.mp4",
    bookingUrl: "https://www.opentable.co.uk/booking/restref/availability?lang=en-GB&correlationId=6b35518d-aef1-43a2-8dcc-ad4ef5dc8053&restRef=324126&otSource=Restaurant%20website",
  },
  {
    slug: "guanabana",
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "85 Kentish Town Rd, London NW1 8NY",
    image: "/images/guanabana.jpg",
    logo: "/logo/guanabana.png",
    blurb: "Kentish Town's Caribbean and Latin American room, best known for its oak-smoked Island Roast — since 2007.",
    priceRange: "££",
    est: 2007,
    clip: "/videos/tile-guanabana.mp4",
    bookingUrl: "https://www.opentable.co.uk/guanabana-reservations-london?restref=79453&lang=en-GB&ot_source=Restaurant%20website",
  },
  {
    slug: "mamasons",
    name: "Mamasons",
    tag: "London's First Filipino Ice Cream Parlor",
    location: "91 Kentish Town Rd · 32 Newport China Town",
    image: null,
    logo: "/logo/mamasons.png",
    blurb:
      "London's first Filipino ice cream parlour — Manila-style dirty ice cream, scooped fresh across two sites.",
    priceRange: "£",
    est: 2017,
    clip: "/videos/tile-mamasons.mp4",
  },
  {
    slug: "ramo",
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Ramen",
    location: "28 Brewer St, Soho, London W1F 0SR",
    image: "/images/ramo.jpg",
    logo: "/logo/ramo.png",
    menuPages: [
      "/menu/ramo/lunch-1.png",
      "/menu/ramo/alacarte.png",
      "/menu/ramo/groupset.png",
      "/menu/ramo/drinks-1.png",
      "/menu/ramo/drinks-2.png",
    ],
    menuLabel: "February 2026",
    blurb: "The world's first Filipino-Japanese ramen joint — Originally from Kentish Town, since 2018, with our current location in Soho.",
    priceRange: "££",
    est: 2018,
    clip: "/videos/tile-ramo.mp4",
    bookingUrl: "https://www.sevenrooms.com/reservations/ramosoho/",
  },
  {
    slug: "hoodwood",
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "81 Kentish Town Rd, London NW1 8NY",
    image: "/images/hoowood.jpg",
    logo: "/logo/hoodwood.png",
    blurb:
      "Oak-smoked jerk plates and handmade patties, fire-kissed over an open flame — Caribbean takeaway, done honestly.",
    priceRange: "£",
  },
  {
    slug: "cafemama",
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "83 Kentish Town Rd, London NW1 8NY",
    image: "/images/cafemama.jpg",
    logo: "/logo/cafemama.png",
    menuPages: [
      "/menu/cafemama/page-1.png",
      "/menu/cafemama/page-2.png",
      "/menu/cafemama/page-3.png",
      "/menu/cafemama/page-4.png",
    ],
    menuLabel: "February 2026",
    blurb:
      "Hand-crafted sandos, all-day pandesal breakfasts, homemade baked treats, and quality coffee — your daily escape from the ordinary.",
    priceRange: "£",
    clip: "/videos/tile-cafemama.mp4",
  },
  {
    slug: "belly",
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "157 Kentish Town Rd, London NW1 8PD",
    image: "/images/belly.jpg",
    logo: "/logo/belly.png",
    menuPages: [
      "/menu/belly/food.png",
      "/menu/belly/drinks-1.png",
    ],
    menuLabel: "February 2026",
    // Belly is the group's Michelin Guide listing — the credential rides
    // the plate's top-right corner as a sticker (see .stickerBadge).
    badge: "/logo/michelin-2026-round.png",
    badgeLabel: "Michelin Selected Restaurant 2026",
    blurb: "A modern Filipino bistro drawing on French technique.",
    priceRange: "£££",
    clip: "/videos/belly-hero.mp4",
    bookingUrl: "https://booking.resdiary.com/widget/Standard/BELLYBISTRO/65884",
  },
  {
    // Coming-soon placeholder — no photography or mark yet, so the tile
    // renders a typographic wordmark on a maroon field instead.
    slug: "bunso",
    name: "Bunso",
    tag: "The Youngest of the Family",
    location: "1a Hawley Rd, London NW1 8RP",
    image: null,
    logo: "/images/bunso.png",
    blurb:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
  },
];

// shared enter curve for the head's staged rise
const EASE = [0.22, 1, 0.36, 1] as const;

// the assembly intro plays ONCE per session — client navigations back to
// the home page go straight to the settled section
let discoverIntroPlayed = false;

/* ── the assembly choreography ─────────────────────────────────────────
   Nine ordered beats. Each waits for the one before it to LAND, with a
   short overlap where two motions genuinely belong together (the words
   leaving and the plates departing are one gesture, not two), so the whole
   thing reads as a single continuous motion rather than nine cues.

   The step is the only clock. Nothing carries its own `delay` relative to
   some other stage's start — a delay chain drifts the moment one spring
   settles late, which is exactly what made the old sequence overlap
   itself. Timeouts advance the step; every element animates purely off
   the step it is watching. */
const STEP = {
  /** the reader owns it: the pasteboard's run past the camera is SCRUBBED
      against their own scroll, and nothing has fired yet */
  IDLE: 0,
  /** armed — the glide parks the composition and the last of the field clears */
  DOLLY: 1,
  /** the words part and the deck gathers between them */
  SPLIT: 2,
  /** words leave through their own edges */
  DEPART: 3,
  /** the deck fans out to the grid seats, front plate first */
  FLIGHT: 4,
  /** every plate seated — the overlay retires, the real tiles take over */
  LAND: 5,
  /** the marks fade up inside the plates */
  LOGOS: 6,
  /** the heading, the meta lines and the pills all build word by word */
  CAPTIONS: 7,
  /** the standfirst + view toggle arrive from the right */
  FURNITURE: 8,
  /** choreography over; ordinary scroll-in rules resume */
  DONE: 9,
} as const;

// ms from the moment the sequence arms — the cue sheet, in one place.
// The dolly no longer takes any time here: it is scrubbed against the
// reader's own scroll on the way in (see `dolly` below), so by the moment
// this clock starts the pasteboard has already been pushed through and the
// line can open immediately.
const CUE: Record<number, number> = {
  // the camera starts moving the moment the 0.4s glide has parked the
  // composition — running it while the page is still travelling reads as
  // two motions fighting rather than one
  [STEP.DOLLY]: 420,
  // the line opens underneath the last of the field rather than after a
  // dead beat: DOLLY_MS below is how long the run takes
  [STEP.SPLIT]: 1780,
  [STEP.DEPART]: 4080,
  [STEP.FLIGHT]: 4430,
  [STEP.LAND]: 6630,
  [STEP.LOGOS]: 6730,
  // the head furniture comes back EARLY, over the top of the captions still
  // building — the chapter reassembling itself in one gesture rather than
  // waiting politely for each part to finish
  // the heading builds out of its masks WITH the captions and pills — one
  // settling gesture, not a queue — and the standfirst follows it in
  [STEP.CAPTIONS]: 7380,
  [STEP.FURNITURE]: 8080,
  [STEP.DONE]: 9500,
};

// the camera's run through the pasteboard. Ease IN: the field should be
// gathering pace as it reaches you, not arriving at a constant crawl.
const DOLLY_MS = 1500;
const DOLLY_EASE = [0.4, 0, 0.75, 0.55] as const;

// The flight itself: the plate that leaves first is the one on top of the
// deck, and each following plate leaves a beat later — a dealt-hand
// cascade. ZERO bounce, and a long settle. An overshoot here reads as the
// plate snapping into its seat — it arrives, jerks past and comes back —
// which under eight photographs at once looks like a mistake rather than
// like craft. Critically damped, the plate decelerates onto its seat and
// stops, once. `duration` is the spring's settle time.
const FLIGHT_STAGGER = 0.14;
const FLIGHT_SPRING = { type: "spring", duration: 1.6, bounce: 0 } as const;

// the deck's build order — Bintang at the front (index 0), the other seven
// stacking up behind it
const GATHER_LEAD = 0.3;
const GATHER_FROM = 0.7;
const GATHER_STAGGER = 0.1;

// Deck offsets for the seven plates that gather BEHIND Bintang's during
// the intro — a loose upright stack, edges peeking on every side.
// Expressed as FRACTIONS of the plate's own width (scaled at use), not
// fixed px: the plate is fluid (24vw, capped at 320), so hard offsets
// would swallow the stack whole on a small screen and read as one plate.
const DECK_OFFSETS = [
  // Bintang rides the FRONT of the deck, dead centre — the plate the
  // sentence opens on, and the first to leave for its seat
  { x: 0, y: 0 },
  { x: -0.1375, y: -0.06875 },
  { x: 0.1375, y: -0.05 },
  { x: -0.09375, y: 0.08125 },
  { x: 0.09375, y: 0.06875 },
  { x: -0.05, y: -0.11875 },
  { x: 0.05, y: 0.1125 },
  { x: 0, y: -0.09375 },
];
// the widest |x| in the table above — the deck's visual half-extent is
// the seat's half-width plus this, and the word split must clear it
const BACK_SPREAD = 0.1375;

// the flight only runs where the settled grid is COMPACT enough for the
// spread to read: four columns over two rows. Below that the grid is many
// rows deep, the plates' seats run far past the fold, and most of the
// cascade would fly to somewhere nobody can see — those viewports get the
// settled section directly.
const STAGE_MIN_WIDTH = 981;

// the air the intro line keeps between itself and the screen edges
const STAGE_EDGE = 56;

// the breathing room the settled heading keeps above it when the
// composition is seated (see `seat` below)
const HEAD_AIR = 28;

// The pasteboard around the stage title — TEN editorial prints at varied
// (never large) sizes, free to overlap EACH OTHER but seated in two
// horizontal bands (top ≤ ~14%, bottom ≥ ~66%) that keep the centre band
// completely clear — the prints never touch the title. Spread edge to
// edge. DETERMINISTIC seats. Each carries its own scroll-parallax drift
// and an `out` vector radiating away from the centre — the direction it
// flies off in (while fading) as the grid forms.
// Fifteen prints in four groups — a top band, two flanking pairs at the
// title's own height, and a bottom band. `ar` is the CROP each print is
// cut to (the source photography is almost all 2:3), which is where the
// variety of shape comes from; `w` carries the variety of size. Between
// them they read as a pasteboard rather than a tidy border.
//
// The centre stays clear: nothing is seated inside roughly x 26–74%,
// y 36–64%, which is the box the title and the deck occupy. The flanking
// prints sit at mid-height but hard against the screen edges, so they
// frame the line without ever touching it.
//
// `depth` is how far each print travels TOWARDS the camera and `speed`
// how quickly — the two together are what makes the field break apart at
// different rates instead of moving as one sheet.
// TEN seats, from the ten distinct editorial frames we have — one seat per
// photograph, so nothing appears twice and every print is its own picture.
// (`/images/careers-team.jpg` is deliberately absent: it is the identical
// frame to DSCF2472-web.)
//
// Deliberately mixed shapes. `ar` is the CROP each print is cut to — the
// source photography is almost all 2:3, so the variety is cut here rather
// than found: three squares (1), four wide landscapes (1.35–1.5) and three
// tall portraits (0.67–0.72). `w` carries the variety of size, 96 → 182.
// Between shape and size no two prints read as a matched pair.
//
// Prints are free to OVERLAP: 2 sits on the corner of 1, and 4 on the
// corner of 3. That is what stops the frame reading as a tidy border and
// makes it read as photographs laid out on a desk.
const STAGE_PRINTS = [
  // ---- top band ----
  { src: "/blog/DSCF3035-web.jpg", left: "4%", top: "7%", w: 138, ar: 1, drift: 22, depth: 780, speed: 1 },
  { src: "/blog/DSCF3015-web.jpg", left: "11%", top: "1%", w: 104, ar: 1.5, drift: -14, depth: 900, speed: 1.28 },
  { src: "/blog/DSCF2995-web.jpg", left: "36%", top: "5%", w: 172, ar: 1.45, drift: 16, depth: 700, speed: 0.86 },
  { src: "/blog/DSC07056-web.jpg", left: "47%", top: "13%", w: 94, ar: 1, drift: -18, depth: 840, speed: 1.12 },
  { src: "/blog/DSCF2296-web.jpg", left: "74%", top: "3%", w: 120, ar: 0.67, drift: 12, depth: 760, speed: 0.94 },
  // ---- flanks: the title's own height, hard against the screen edges ----
  { src: "/blog/DSC07722-web.jpg", left: "1%", top: "33%", w: 98, ar: 0.72, drift: 14, depth: 660, speed: 0.8 },
  { src: "/blog/DSCF3052-web.jpg", left: "87%", top: "27%", w: 132, ar: 1, drift: -16, depth: 920, speed: 1.34 },
  // ---- bottom band ----
  { src: "/blog/DSCF2472-web.jpg", left: "5%", top: "63%", w: 158, ar: 1.35, drift: 18, depth: 820, speed: 1.06 },
  { src: "/blog/DSCF2298-web.jpg", left: "57%", top: "75%", w: 182, ar: 1.5, drift: 20, depth: 860, speed: 1.16 },
  { src: "/blog/DSC07739-web.jpg", left: "79%", top: "64%", w: 96, ar: 0.67, drift: -12, depth: 720, speed: 0.9 },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* THE DOLLY — SCRUBBED. The pasteboard doesn't slide away and it doesn't
   play at you: the camera pushes through it at exactly the rate the reader
   scrolls, and pushes back out if they scroll up. Each print rides a real
   translateZ inside the stage's shared `perspective`, so it grows and
   radiates out from the vanishing point at the centre of the screen,
   exactly as it would if you walked into it, and leaves through whichever
   edge it happens to be nearest.

   Scrubbing this beat (and ONLY this beat) is the right split of control:
   the approach is the part the reader is actively driving, so it should
   answer their thumb, while the payoff — the split, the flight, the
   chapter reassembling — is a performance that needs its own timing. It
   also costs nothing: no pin, no sticky spacer, no added document height,
   and the whole 1.3s the timed dolly used to spend is now spent by the
   reader on their way in.

   Deliberately CSS 3D and not WebGL: thirteen composited layers moving on
   transform and opacity alone stay entirely on the compositor, cost no
   main-thread work per frame, need no context, no shaders and no extra
   bytes, and degrade honestly when 3D is unavailable. A canvas would buy
   nothing here and would cost a texture upload for every photograph.

   `depth` and `speed` vary per print, so the field comes apart at
   different rates rather than moving as one sheet. z stays LINEAR in
   scroll on purpose — the perspective divide (p / (p − z)) is what turns a
   constant approach into an accelerating one, which is exactly what a real
   camera does. Easing it as well would double the acceleration. */
function StagePrint({
  p,
  i,
  enter,
  dolly,
}: {
  p: (typeof STAGE_PRINTS)[number];
  // place in the reveal wave
  i: number;
  // the pasteboard rising onto the paper as the chapter arrives
  enter: MotionValue<number>;
  // the run past the camera, 0 → 1
  dolly: MotionValue<number>;
}) {
  // Each print takes its own slice of the entrance: it starts 4% of the
  // range after the one before it and ramps over half of it, so the
  // pasteboard LAYS ITSELF OUT print by print instead of switching on as
  // one sheet. That reads better, and it stops thirteen photographs
  // crossing the visibility threshold on a single frame.
  const e = useTransform(enter, (v) => clamp01((v - i * 0.04) / 0.5));
  // the entrance rise doubles as the print's parallax drift: it settles out
  // of its own offset rather than carrying a second, competing scroll link
  const y = useTransform(e, [0, 1], [p.drift + 26, 0]);
  const z = useTransform(dolly, (v) => Math.min(1, v * p.speed) * p.depth);
  // Fades only in the last stretch, once the print is already large and
  // leaving — an image that dims the moment it starts moving reads as a
  // fade, not as something passing you. The tail is keyed to the RUN's
  // progress rather than the print's own depth so every one of them is
  // genuinely gone at the end: tying it to depth left the slowest prints
  // sitting at ~47% opacity when the line opened underneath them.
  const fadeFrom = 0.52 + (p.speed - 0.8) * 0.24;
  const opacity = useTransform([e, dolly], ([v, d]: number[]) =>
    v * (d < fadeFrom ? 1 : clamp01(1 - (d - fadeFrom) / (1 - fadeFrom))),
  );

  return (
    // OUTER: the seat only, and a plain div — thirteen extra motion
    // components would each cost a subscription for a box that never moves.
    // INNER: one element owning the entire transform (drift + depth) and
    // the fade, so nothing ever fights over a property.
    <div
      className={styles.stagePrint}
      style={{ left: p.left, top: p.top, width: p.w }}
      aria-hidden
    >
      <motion.div className={styles.stagePrintDepth} style={{ y, z, opacity }}>
        {/* Sized and cropped to this seat, and served at that size —
            thirteen full-resolution photographs would cost far more than
            the effect is worth. */}
        <Image
          className={styles.stagePrintImg}
          src={p.src}
          alt=""
          width={p.w}
          height={Math.round(p.w / p.ar)}
          sizes={`${p.w}px`}
          draggable={false}
          // Fetched EAGERLY but at idle priority. Left lazy, all thirteen
          // arrive within a few hundred milliseconds of each other exactly
          // as the pasteboard is being revealed, and the decode lands as
          // one 42ms frame right at the start of the effect. At ~5KB each
          // (they are served at their seat size) buying them early is
          // cheap, and `low` keeps them behind everything on the first
          // screen.
          loading="eager"
          fetchPriority="low"
          // The crop has to be stated in CSS, not left to the width/height
          // attributes: those only hold the box until the file arrives,
          // after which `height: auto` goes back to the photograph's own
          // proportions and every seat snaps to the same 2:3.
          style={{ aspectRatio: String(p.ar) }}
        />
      </motion.div>
    </div>
  );
}

// Per-cell slide choreography for the view switch (and the scroll-in
// entrance). A custom with d < 0 means "appear in place, instantly" — the
// first grid render after the assembly intro, where the plates' layoutId
// morph IS the entrance and any cell fade would hide it.
// Each cell gets a custom {x, d}: its slide-from offset in vw —
// PAST the viewport edge, so tiles genuinely arrive from off screen (the
// section clips horizontally, see .section) — and its stagger delay.
// Grid: the top row arrives from the LEFT, the bottom row from the RIGHT;
// the reel draws in from the right. Each group moves as one rigid unit
// (shared delay), so cards hold their spacing in flight and never overlap.
// Opacity stays 1 while sliding — the travel IS the reveal.
// Exits run the same paths in reverse, faster and accelerating (ease-in):
// the system responding, not deciding. Reduced motion passes x: 0 and gets
// a plain crossfade.
const cellVariants = {
  hidden: (c: { x: number; d: number }) =>
    c.d < 0
      ? { opacity: 1 }
      : c.x === 0
        ? { opacity: 0 }
        : { opacity: 1, transform: `translateX(${c.x}vw)` },
  show: (c: { x: number; d: number }) =>
    c.d < 0
      ? { opacity: 1 }
      : c.x === 0
        ? { opacity: 1, transition: { duration: 0.4, ease: "easeOut" as const } }
        : {
            opacity: 1,
            transform: "translateX(0vw)",
            transition: { duration: 0.8, ease: EASE, delay: c.d },
          },
  exit: (c: { x: number; d: number }) =>
    c.d < 0 || c.x === 0
      ? { opacity: 0, transition: { duration: 0.25, ease: "easeOut" as const } }
      : {
          opacity: 1,
          transform: `translateX(${c.x}vw)`,
          transition: {
            duration: 0.45,
            ease: [0.5, 0, 0.75, 0.4] as const,
            delay: c.d * 0.35,
          },
        },
};

// the App Store morph — quick, critically damped, and interruptible
// mid-flight (a spring keeps its velocity when retargeted). Zero bounce:
// a panel that overshoots its own edges reads as elastic, not as glass.
const EXPAND_SPRING = { type: "spring", duration: 0.62, bounce: 0 } as const;

type ViewMode = "grid" | "strip";

export default function Discover() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();

  // the App Store expansion — which tile's plate is currently open as the
  // full detail card (null = none)
  const [active, setActive] = useState<DiscoverItem | null>(null);

  // GRID ⟷ STRIP: the layout toggle. Grid is the resting editorial view;
  // strip lays the same tiles in one continuous horizontal reel.
  const [mode, setMode] = useState<ViewMode>("grid");

  // one-shot entrance reveal — watches the SECTION (always mounted, never
  // transformed), since the ul is absent while the assembly intro plays
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

  // THE ASSEMBLY STAGE — an overlay pasteboard that opens the chapter,
  // once per session: "Our Restaurants." holds the middle of the screen on
  // ONE line with ten editorial prints scattered around it. When the title
  // reaches the middle band of the viewport the sequence arms: the title
  // splits, the Bintang plate opens up between the two words, the other
  // seven gather behind it as a loose deck, the words and prints leave,
  // and the deck fans out — every plate flying to the exact seat its grid
  // tile already occupies underneath. Slow throughout: this is the rare,
  // once-per-session tier where delight is allowed.
  //
  // The settled section is mounted THE WHOLE TIME, at its final size, with
  // the plates and captions simply held invisible. That is what makes the
  // flight land cleanly: the seats are real, measured boxes rather than a
  // layout that only comes into existence on the frame the plates start
  // moving. Nothing reflows, the document height never changes, and the
  // scroll position the flight was measured against still means the same
  // thing when the plates arrive.
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(() =>
    discoverIntroPlayed ? STEP.DONE : STEP.IDLE,
  );
  const [plateW, setPlateW] = useState(320);
  // how far the head furniture parks off screen — measured at arm time, so
  // it clears any viewport instead of trusting a magic vw number
  const [offX, setOffX] = useState(1600);
  // the words' widths differ hugely ("Our" vs "Restaurants."), so the
  // splits are measured per word at arm time: each moves just far enough
  // for the deck to sit clear between them
  const ourRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const [splitL, setSplitL] = useState(60);
  const [splitR, setSplitR] = useState(320);
  // the intro line's fitted size (see the arming effect) — held in state so
  // React keeps it across the many re-renders the step clock causes
  const [titlePx, setTitlePx] = useState<number | null>(null);
  // per-plate flight vectors, measured the instant the flight begins
  const [flight, setFlight] = useState<
    { dx: number; dy: number; s: number }[] | null
  >(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Does THIS mount own the assembly intro? LATCHED on the first render.
  // It must never change underneath an element that has already committed
  // an intro `initial`: dropping the `animate` prop later leaves Framer
  // holding whatever it last drove, which is how a skipped intro used to
  // strand the heading off screen a viewport and a half to the left.
  const [introOwned] = useState(() => !discoverIntroPlayed);
  // The chapter settled WITHOUT the sequence playing — the viewport is too
  // narrow for it, the reader scrolled straight past, or they drove the
  // toggle mid-flight. Same resting targets, reached instantly rather than
  // performed: an entrance they already missed shouldn't play late.
  const [snapped, setSnapped] = useState(false);
  // set the instant the sequence arms — the veil starts closing during the
  // glide, a beat before the first step fires
  const [armed, setArmed] = useState(false);
  // …and the same fact as a ref, so the scroll handler can read it without
  // re-subscribing every time the step advances
  const armedRef = useRef(false);
  // the composition is most of the way to the middle of the screen — the
  // cue for the intro line to build itself out of its word masks
  const [nearing, setNearing] = useState(false);
  const nearLatch = useRef(false);
  const intro = !reduce && introOwned;

  /* THE SCRUB. Three values, all written from ONE getBoundingClientRect in
     the scroll handler below — not three separate scroll subscriptions, and
     not an IntersectionObserver (whose rootMargins measure against the
     TOP-LEVEL viewport inside embedded contexts, which displaces the whole
     mapping). They drive style directly through MotionValues, so scrolling
     the pasteboard costs zero React renders. */
  // the pasteboard rising onto the paper as the chapter arrives
  const enter = useMotionValue(0);
  // the camera's run through it, 0 → 1
  const dolly = useMotionValue(0);
  // the cream paper dissolving the neighbouring chapters away
  const veil = useMotionValue(0);

  /* WHERE THE COMPOSITION SITS. The glide parks this point at the middle of
     the screen, so it decides the framing of the entire sequence.

     What it wants to be is the centre of the PLATE BLOCK: for most of the
     choreography the head is empty — the title has left through the left
     edge, the standfirst through the right — so the eight plates are the
     only thing on screen, and anything else leaves them visibly low under a
     band of nothing. Centring on the section's own box was worse again: the
     chapter carries a big top padding to set it apart from the statement
     above, and every one of those pixels was being spent on screen.

     What it CAN'T do is push the heading off the top, because at the end of
     the sequence the title slides back into a seat that has to be there to
     receive it. So the plate centre is clamped between "the last caption
     still fits" and "the heading keeps HEAD_AIR of breathing room". On a
     tall viewport the clamp never binds and the plates land dead centre; on
     a short one the heading wins and the plates sit as high as they can.
     Measured off the settled layout — mounted at full size the whole
     time — so these are real boxes, not a guess. */
  const [seat, setSeat] = useState<{ top: number; shift: number } | null>(null);
  useEffect(() => {
    if (!intro) return;
    const measure = () => {
      const sec = sectionRef.current?.getBoundingClientRect();
      const head = headRef.current?.getBoundingClientRect();
      const grid = gridRef.current?.getBoundingClientRect();
      const plates = gridRef.current?.querySelectorAll<HTMLElement>("[data-plate]");
      if (!sec || !head || !grid || !plates?.length) return;
      let pt = Infinity;
      let pb = -Infinity;
      plates.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < pt) pt = r.top;
        if (r.bottom > pb) pb = r.bottom;
      });
      const vh = window.innerHeight;
      const want = (pt + pb) / 2 - sec.top;
      const lo = grid.bottom - sec.top - vh / 2;
      const hi = head.top - sec.top + vh / 2 - HEAD_AIR;
      const top = Math.round(
        // the chapter is taller than the viewport: no seat satisfies both
        // ends, so fall back to framing it as a whole
        lo > hi
          ? (head.top + grid.bottom) / 2 - sec.top
          : Math.min(Math.max(want, lo), hi),
      );
      // the pasteboard's vanishing point has to travel with the title, or
      // the prints would radiate from a point the composition has left
      setSeat({ top, shift: Math.round(top - sec.height / 2) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [intro]);

  // what the choreography is showing right now — every animated element
  // reads these rather than carrying its own delay chain
  const stageUp = intro && !snapped && step < STEP.LAND;
  const platesOn = step >= STEP.LAND;
  const logosOn = step >= STEP.LOGOS;
  const capsOn = step >= STEP.CAPTIONS;
  const furnitureIn = step >= STEP.FURNITURE;

  /* NAMING THE CHAPTER. The last thing to happen here, after every plate,
     caption and control has settled: "Restaurants." warms from maroon to
     saffron. It has to be last — lit any earlier it would be one more
     thing arriving, and the whole point of it is that it happens when
     nothing else is moving.

     A one-way latch rather than a mirror of `step`, because the two paths
     light it off different clocks: the assembly's step machine here, and
     an observer on the line itself on an ordinary visit. The warming
     belongs to the type, so it is a CSS colour transition on the word
     rather than a value React re-renders — see .titleRise[data-lit]. */
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (step >= STEP.DONE) setLit(true);
  }, [step]);

  /* HANDS OFF THE VIEWPORT until the chapter has arrived. The pin around
     this section would otherwise start holding the page ~170px before the
     composition is centred — this section is shorter than a viewport and
     parks its stage two thirds of the way down itself — and a hold that
     cancels the scroll exactly leaves the title unable to reach the
     trigger band at all. See lib/chapter.ts. */
  useEffect(() => {
    if (!intro) return;
    setChapterReady(step >= STEP.DONE);
  }, [intro, step]);
  // never leave the page pinned to a chapter that has unmounted
  useEffect(() => () => setChapterReady(true), []);

  /* HOLDING THE PAGE. `lenis.stop()` alone is not a lock — it declines to
     act on wheel and touch, but the document is still a scrollable box, so
     the scrollbar, the keyboard and any programmatic scroll walk straight
     past it (measured: a 1426px jump mid-flight). Taking overflow off the
     root element is the actual lock, and it is the same thing the expansion
     below already does. Both are used together: Lenis is stopped so it
     isn't fighting for the scroll position, and the root is locked so
     nothing can move it. */
  const lockedRef = useRef<string | null>(null);
  const lockPage = useCallback(() => {
    if (lockedRef.current !== null) return;
    lockedRef.current = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }, []);
  const unlockPage = useCallback(() => {
    if (lockedRef.current === null) return;
    document.documentElement.style.overflow = lockedRef.current;
    lockedRef.current = null;
  }, []);

  // stop the clock and put everything at rest, now
  const settle = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    discoverIntroPlayed = true;
    unlockPage();
    lenisRef.current?.start();
    setSnapped(true);
    setStep(STEP.DONE);
  }, [unlockPage]);

  // THE PERFORMANCE. Once the composition is parked mid-screen the whole
  // thing plays on its own clock, and the page is held for the duration —
  // the reader gets it back when the chapter is finished and the grid is
  // standing, not part-way through the flight with plates still in the air.
  const runTimeline = useCallback(() => {
    for (const s of [
      STEP.DOLLY,
      STEP.SPLIT,
      STEP.DEPART,
      STEP.FLIGHT,
      STEP.LAND,
      STEP.LOGOS,
      STEP.CAPTIONS,
      STEP.FURNITURE,
      STEP.DONE,
    ]) {
      timers.current.push(setTimeout(() => setStep(s), CUE[s]));
    }
    // The camera's run, as ONE animation driving all ten prints through a
    // single MotionValue — ten independent keyframe animations would each
    // carry their own driver for a value that is really one clock. The
    // page is locked on the same cue: not a moment sooner, because the
    // centring glide still has to be able to move it.
    timers.current.push(
      setTimeout(() => {
        lockPage();
        animate(dolly, 1, { duration: DOLLY_MS / 1000, ease: DOLLY_EASE });
      }, CUE[STEP.DOLLY]),
    );
    // scroll comes back when the chapter is FINISHED — the grid standing,
    // the head back in its seat — not while plates are still in the air
    timers.current.push(
      setTimeout(() => {
        unlockPage();
        lenisRef.current?.start();
      }, CUE[STEP.DONE]),
    );
  }, [dolly, lockPage, unlockPage]);

  // The veil is scrubbed CLOSED on the way in (with everything else) and
  // animated back OPEN as the plates fly, so the page returns underneath
  // the grid forming on it. One value, two owners, never at the same time.
  useEffect(() => {
    if (step >= STEP.FLIGHT) {
      const a = animate(veil, 0, { duration: 0.9, ease: "easeOut" });
      return () => a.stop();
    }
  }, [step, veil]);

  // reduced motion never sees the stage
  useEffect(() => {
    if (reduce && step < STEP.DONE) settle();
  }, [reduce, step, settle]);

  // pending cues are dropped if the section unmounts mid-sequence — and the
  // page must never be left locked behind it
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      unlockPage();
    },
    [unlockPage],
  );

  // ARM the sequence when the TITLE ITSELF sits in the middle band of the
  // viewport (its centre within the central 24% of the screen) — the user
  // is provably looking at "Our Restaurants." mid-screen when the split
  // begins. A plain geometry check on scroll, not an IntersectionObserver:
  // observer rootMargins measure against the TOP-LEVEL viewport inside
  // embedded/iframe contexts, which displaces the band, whereas
  // getBoundingClientRect is always the page's own viewport.
  useEffect(() => {
    if (step !== STEP.IDLE || reduce) return;
    // narrow viewports stack the grid many rows deep — most of the flight
    // would land below the fold, so they skip straight to the settled section
    if (window.innerWidth < STAGE_MIN_WIDTH) {
      settle();
      return;
    }
    const el = titleRef.current;
    if (!el) return;

    const start = () => {
      discoverIntroPlayed = true;
      setOffX(Math.round(window.innerWidth * 1.15));
      const cx = window.innerWidth / 2;

      // The deck plate is sized to the GRID TILE it will become. Matching
      // them exactly makes the flight a pure translation — no scaling, so
      // no resampling of eight photographs in mid-air — and it lets the
      // deck read as a literal stack of the cards about to be dealt.
      const seat = gridRef.current
        ?.querySelector<HTMLElement>("[data-plate]")
        ?.getBoundingClientRect();
      const plate = Math.max(
        150,
        Math.min(360, Math.round(seat?.width || window.innerWidth * 0.24)),
      );

      // The deck's VISUAL extent is the seat's half-width PLUS the back
      // plates' spread — clearing only the seat is exactly why the plates
      // used to overlap the words. 16px of air past the outermost plate
      // keeps the words hugging the deck rather than drifting wide of it.
      const pad = plate / 2 + plate * BACK_SPREAD + 16;

      // FIT THE LINE. Both words must sit the same 16px off the deck AND
      // stay on screen, and "Restaurants." is three times the width of
      // "Our" — at the stylesheet's size it simply does not fit beside a
      // centred deck. So the intro line is scaled down to buy that room
      // before the splits are measured. Measured, not guessed: the display
      // face's metrics decide how much room the words actually need.
      const titleEl = titleRef.current;
      const base = titleEl
        ? parseFloat(getComputedStyle(titleEl).fontSize)
        : 0;
      let ourB = ourRef.current?.getBoundingClientRect();
      let restB = restRef.current?.getBoundingClientRect();
      if (titleEl && base && ourB && restB) {
        const widest = Math.max(ourB.width, restB.width);
        const k = Math.min(1, (cx - pad - STAGE_EDGE) / widest);
        if (k < 1) {
          const px = Math.round(base * k);
          titleEl.style.fontSize = `${px}px`;
          setTitlePx(px);
          // re-read against the new metrics — the splits below have to be
          // computed from the line as it will actually be drawn
          ourB = ourRef.current?.getBoundingClientRect();
          restB = restRef.current?.getBoundingClientRect();
        }
      }

      setPlateW(plate);
      if (ourB && restB) {
        // no floor: a floor is what made the gaps uneven. Each word moves
        // exactly as far as it needs to, so the air on the left of the
        // deck equals the air on its right.
        setSplitL(Math.max(0, Math.round(ourB.right - (cx - pad))));
        setSplitR(Math.max(0, Math.round(cx + pad - restB.left)));
      }

      // The trigger band guarantees we are CLOSE to centre; this short
      // glide closes the last few dozen pixels so the composition sits
      // exactly mid-viewport, then the page holds still. Scroll is handed
      // back the moment the plates are seated — after that nothing in the
      // choreography depends on the viewport staying put.
      // The trigger band guarantees we are CLOSE to centre; this short
      // glide closes the last few dozen pixels so the composition sits
      // exactly mid-viewport, then the page is held for the whole
      // sequence. Stopped FIRST and glided with `force`, so the reader's
      // input is out of the way from the very first frame rather than for
      // everything except the glide.
      const lenis = lenisRef.current;
      const centre = stageRef.current;
      lenis?.stop();
      if (centre && lenis) {
        const r = centre.getBoundingClientRect();
        const delta = r.top + r.height / 2 - window.innerHeight / 2;
        lenis.scrollTo(window.scrollY + delta, { duration: 0.4, force: true });
      }

      // the veil finishes closing over whatever is left of the page
      animate(veil, 1, { duration: 0.3, ease: "easeOut" });

      setArmed(true);
      runTimeline();

      // The marks are fetched now, in the slack the scrub has, so revealing
      // eight of them a few seconds later costs nothing.
      for (const it of ITEMS) {
        for (const src of [it.logo, it.badge]) {
          if (src) {
            const pre = new window.Image();
            pre.src = src;
          }
        }
      }
    };

    const check = () => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const vh = window.innerHeight;

      /* THE APPROACH, from the one rect we already read for the trigger.
         Two ranges as the composition rises up the screen:
           1.18vh → 0.88vh   the pasteboard lays itself out on the paper
           1.00vh → 0.72vh   the veil closes over the neighbouring chapters
         Both reversible — scroll back up and the pasteboard comes apart
         again, because nothing here has "played" yet. The DOLLY is not on
         this clock: it does not begin until the line is parked in the
         middle of the screen, and from there it is driven by the reader's
         own scrolling (see the pin effect). */
      enter.set(clamp01((vh * 1.18 - c) / (vh * 0.3)));
      veil.set(clamp01((vh * 1 - c) / (vh * 0.28)));
      // the intro line builds itself out of its masks as it comes up into
      // the middle of the screen — the same word-rise the manifesto uses,
      // so the two moments on the page speak one language
      if (!nearLatch.current && enter.get() >= 0.62) {
        nearLatch.current = true;
        setNearing(true);
      }

      if (armedRef.current) return;
      // a tight band (the central 20%) leaves the glide only a few dozen
      // pixels to close, so the composition is parked almost as soon as it
      // arms and the line can open straight away
      if (c >= vh * 0.4 && c <= vh * 0.6) {
        armedRef.current = true;
        start();
        return;
      }
      // A fast flick can carry the reader clean past the band without ever
      // landing in it. The head is parked off screen until the sequence
      // runs, so failing to arm would leave the chapter permanently
      // headless — settle it instead of waiting for a trigger that is now
      // behind them.
      const section = sectionRef.current?.getBoundingClientRect();
      if (section && section.bottom < 0) {
        armedRef.current = true;
        settle();
      }
    };
    // checked directly per scroll event (one getBoundingClientRect — no
    // rAF deferral, which throttled tabs would freeze)
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, [step, reduce, settle, runTimeline, enter, veil]);

  // THE FLIGHT, measured. Each plate's vector is the gap between where it
  // rests in the deck and where its own grid tile already sits — read off
  // both boxes in one pass, with scroll held, so the numbers are exact and
  // the plate lands pixel-on-seat. Nothing here is a layout animation:
  // it's one translate and one uniform scale per plate (deck seat and tile
  // are both 3:2), which is why it stays smooth under eight of them.
  useEffect(() => {
    if (step !== STEP.FLIGHT || flight) return;
    const grid = gridRef.current;
    const seat = deckRef.current;
    if (!grid || !seat) return;
    const s = seat.getBoundingClientRect();
    const deckCx = s.left + s.width / 2;
    const deckCy = s.top + s.height / 2;
    const plates = grid.querySelectorAll<HTMLElement>("[data-plate]");
    setFlight(
      ITEMS.map((_, i) => {
        const r = plates[i]?.getBoundingClientRect();
        if (!r || !s.width) return { dx: 0, dy: 0, s: 1 };
        const o = DECK_OFFSETS[i] ?? { x: 0, y: 0 };
        return {
          dx: r.left + r.width / 2 - (deckCx + o.x * plateW),
          dy: r.top + r.height / 2 - (deckCy + o.y * plateW),
          s: r.width / s.width,
        };
      }),
    );
  }, [step, flight, plateW]);

  // mouse drag-to-scroll for the strip (touch scrolls natively). A drag
  // that actually travelled suppresses the click so releasing over a plate
  // never pops the expansion by accident.
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: 0 });
  const onStripDown = (e: React.PointerEvent) => {
    if (mode !== "strip" || e.pointerType !== "mouse") return;
    const el = gridRef.current;
    if (!el) return;
    // capture the pointer so the drag survives leaving the reel's box —
    // without it a fast drag ends the moment the cursor crosses the edge
    el.setPointerCapture(e.pointerId);
    drag.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
    };
  };
  const onStripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = gridRef.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    el.scrollLeft = d.startScroll - dx;
  };
  const endStripDrag = (e: React.PointerEvent) => {
    drag.current.down = false;
    const el = gridRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };
  const onStripClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved > 8) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = 0;
    }
  };

  // SIENA-STYLE wheel glide: over the reel, the wheel drives HORIZONTAL
  // travel through a slow lerp (each frame closes ~9% of the remaining
  // distance), so the reel drifts and settles instead of stepping. At
  // either end the wheel falls through to the page so nobody gets trapped.
  // Reduced motion keeps native (instant) scrolling.
  useEffect(() => {
    if (mode !== "strip" || reduce) return;
    const el = gridRef.current;
    if (!el) return;
    let target = el.scrollLeft;
    let raf = 0;
    let running = false;
    const tick = () => {
      const cur = el.scrollLeft;
      const next = cur + (target - cur) * 0.09;
      el.scrollLeft = Math.abs(target - next) < 0.5 ? target : next;
      if (Math.abs(target - el.scrollLeft) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // at the ends, let the page take the wheel
      if (
        (delta > 0 && target >= max - 1) ||
        (delta < 0 && target <= 1)
      ) {
        return;
      }
      e.preventDefault();
      target = Math.max(0, Math.min(max, target + delta * 0.9));
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    // a grab-drag moves scrollLeft directly — resync the glide target
    const onScrollSync = () => {
      if (!running) target = el.scrollLeft;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScrollSync, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScrollSync);
      cancelAnimationFrame(raf);
    };
  }, [mode, reduce]);

  // the head's furniture flies in from the edges while the intro owns the
  // section; ordinary visits keep the quiet scroll-in rise
  const fromAssembly = intro;
  // a skipped sequence lands on the same targets with no travel
  const spring = (duration: number, bounce: number, delay = 0) =>
    snapped
      ? ({ duration: 0 } as const)
      : ({ type: "spring", duration, bounce, delay } as const);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="restaurants"
      data-nav-theme="light"
      // read by scripts/shoot-assembly.mjs to sync its capture clock to the
      // exact frame the sequence arms
      data-assembly-armed={armed ? "1" : undefined}
      data-assembly-step={intro && step < STEP.DONE ? step : undefined}
    >
      {stageUp ? (
        /* The pasteboard stage — an overlay ON TOP of the settled section,
           which is already mounted at full size underneath with its plates
           and captions held invisible. Nothing here affects layout, so the
           flight measures real seats and the page never reflows. */
        <div className={styles.stage} aria-hidden>
          {/* THE VEIL. While the sequence runs the chapter should be the
              only thing on screen, so a cream field reaching well past the
              section's own box dissolves its neighbours away. It also
              CLIPS the pasteboard: prints run to several times their size
              on the way past the camera, and this keeps that growth from
              spilling into the sections above and below.

              It fades up as the sequence arms and back down as the plates
              fly, so the page returns underneath the grid forming on it. */}
          <div className={styles.stageVeil}>
            {/* only the PAPER fades — the pasteboard above it has to stay
                visible while the reader is still approaching. Scrubbed
                closed on the way in, animated open as the plates fly. */}
            <motion.div
              className={styles.stageVeilPaper}
              style={{ opacity: veil }}
            />
            {/* the depth field: one shared perspective, its vanishing point
                at the centre of the box — which the glide has parked at the
                centre of the screen, so every print radiates away from
                where the reader is looking */}
            <div
              className={styles.stageField}
              style={
                seat ? { transform: `translateY(${seat.shift}px)` } : undefined
              }
            >
              {STAGE_PRINTS.map((p, i) => (
                <StagePrint
                  key={p.src + i}
                  p={p}
                  i={i}
                  enter={enter}
                  dolly={dolly}
                />
              ))}
            </div>
          </div>

          {/* The centred composition, seated on the SECTION's own centre —
              which is what the glide then parks at the middle of the
              viewport. Because the settled section is roughly a viewport
              tall, centring it there frames the whole chapter at once: the
              title splits mid-screen, and when it later slides back to its
              seat that seat is on screen waiting for it.

              Geometry is TRANSFORM-ONLY: the two words push apart to their
              measured clearances and the deck sits in a CSS-centred seat,
              so the arrangement is dead centre at every frame. */}
          <div
            className={styles.stageCenter}
            ref={stageRef}
            style={seat ? { top: seat.top } : undefined}
          >
            {/* the deck's seat — absolutely centred behind the words */}
            <div
              className={styles.deckSeat}
              ref={deckRef}
              style={{ width: plateW, height: Math.round((plateW * 2) / 3) }}
            >
              {ITEMS.map((it, i) => {
                const o = DECK_OFFSETS[i] ?? { x: 0, y: 0 };
                // fractions of the plate's width — the stack keeps its
                // shape at every viewport size
                const gx = Math.round(o.x * plateW);
                const gy = Math.round(o.y * plateW);
                const f = flight?.[i];
                return (
                  <motion.div
                    key={it.slug}
                    className={styles.introPlate}
                    // Bintang on top, then the deck in dealing order — the
                    // same order they leave in
                    style={{ zIndex: ITEMS.length - i, borderRadius: 2 }}
                    initial={{ opacity: 0, scale: 0.86, x: gx, y: gy }}
                    animate={
                      f
                        ? // FLIGHT: one translate + one uniform scale onto
                          // the tile's exact rectangle
                          {
                            opacity: 1,
                            scale: f.s,
                            x: gx + f.dx,
                            y: gy + f.dy,
                          }
                        : step >= STEP.SPLIT
                          ? { opacity: 1, scale: 1, x: gx, y: gy }
                          : { opacity: 0, scale: 0.86, x: gx, y: gy }
                    }
                    transition={
                      f
                        ? { ...FLIGHT_SPRING, delay: i * FLIGHT_STAGGER }
                        : {
                            // gathering plates arrive on long, quiet
                            // springs — controlled, never busy
                            type: "spring",
                            duration: i === 0 ? 1.2 : 1.1,
                            bounce: 0,
                            delay:
                              i === 0
                                ? GATHER_LEAD
                                : GATHER_FROM + (i - 1) * GATHER_STAGGER,
                          }
                    }
                  >
                    {it.image ? (
                      // SAME next/image pipeline (and sizes) as the grid
                      // tiles, so the plate lands on a file the browser has
                      // already decoded instead of swapping URL on arrival
                      <Image
                        className={styles.introPlateImg}
                        src={it.image}
                        alt=""
                        fill
                        sizes="25vw"
                        draggable={false}
                      />
                    ) : (
                      <div className={styles.introFallback} />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* The line BUILDS ITSELF as it rises into the middle of the
                screen: each word climbs out of its own clip, on the exact
                word-mask grammar the manifesto's "A vibrant Filipino…" uses
                (translateY 115% → 0, the same curve, the same short
                stagger). Two elements per word, and they never fight: the
                MASK owns the horizontal split, the WORD inside owns the
                vertical build. */}
            <h2
              ref={titleRef}
              className={`${styles.title} ${styles.introTitle}`}
              style={titlePx ? { fontSize: titlePx } : undefined}
            >
              {/* the SPLIT, in two phases: first the words part just far
                  enough for the whole deck to gather BETWEEN them (their
                  measured per-word clearances — a momentum push, slight
                  settle); then, once the deck is complete, they carry on
                  out through their own screen edges (critically damped —
                  things leaving don't bounce), clipped by the section's
                  overflow-x */}
              {(
                [
                  ["Our", ourRef, -splitL, -offX],
                  ["Restaurants.", restRef, splitR, offX],
                ] as const
              ).map(([word, ref, apart, away], i) => (
                <motion.span
                  key={word}
                  ref={ref}
                  className={styles.introWord}
                  animate={
                    step >= STEP.DEPART
                      ? { x: away }
                      : step >= STEP.SPLIT
                        ? { x: apart }
                        : { x: 0 }
                  }
                  transition={
                    step >= STEP.DEPART
                      ? { type: "spring", duration: 1.2, bounce: 0 }
                      : { type: "spring", duration: 1.4, bounce: 0 }
                  }
                >
                  <motion.span
                    className={styles.introRise}
                    initial={{ transform: "translateY(115%)" }}
                    animate={{
                      transform:
                        nearing || armed
                          ? "translateY(0%)"
                          : "translateY(115%)",
                    }}
                    transition={{ duration: 0.85, ease: EASE, delay: i * 0.09 }}
                  >
                    {word}
                  </motion.span>
                </motion.span>
              ))}
            </h2>
          </div>
        </div>
      ) : null}

      {/* 12-column editorial head seated on the inset span: display heading
          across columns 1–6 (explicit two-line break at the 4-up breakpoint)
          and the small caption right-ranged in the far columns, sharing the
          heading's bottom baseline band. Both rise once on scroll-in —
          heading first, caption a beat behind. */}
      <div className={styles.head} ref={headRef}>
        {/* The heading BUILDS OUT OF ITS OWN LINES, on the manifesto's
            word-mask grammar — the same one the caption lines below it use,
            and the same one the intro title used on the way in. It arrives
            WITH the captions and pills rather than after them: the chapter
            names itself at the moment its contents finish describing
            themselves, which reads as one settling gesture instead of a
            queue of separate arrivals.

            Driven by `animate`, never `whileInView` on the intro path: the
            step machine is the clock there, and an observer would be racing
            it. Ordinary visits keep the observer. */}
        <h2 className={styles.title}>
          {["Our", "Restaurants."].map((line, i) => (
            <span className={styles.titleLine} key={line}>
              <motion.span
                className={styles.titleRise}
                // "Restaurants." turns saffron once the chapter is finished
                data-lit={i === 1 && lit ? "on" : undefined}
                // the ordinary path has no step machine to wait for, so the
                // same observer that raises the line also lights it
                onViewportEnter={
                  i === 1 && !fromAssembly ? () => setLit(true) : undefined
                }
                initial={reduce ? false : { transform: "translateY(115%)" }}
                animate={
                  reduce || !fromAssembly
                    ? undefined
                    : {
                        transform: capsOn
                          ? "translateY(0%)"
                          : "translateY(115%)",
                      }
                }
                whileInView={
                  reduce || fromAssembly
                    ? undefined
                    : { transform: "translateY(0%)" }
                }
                viewport={{ once: true, amount: 0.5 }}
                transition={
                  snapped
                    ? { duration: 0 }
                    : { duration: 0.75, ease: EASE, delay: i * 0.08 }
                }
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>
        {/* The standfirst BUILDS word by word rather than sliding in — the
            same grammar as the statement under the hero and as the heading
            beside it. Only the switch still travels from the right edge:
            one thing arriving from off screen reads as a control taking its
            place, where two read as the layout being assembled twice. */}
        <SplitWords
          as="p"
          className={styles.caption}
          text="Ranging from Filipino Ice-Cream Parlours to Caribbean Inspired Smokehouse."
          amount={0.5}
          stagger={0.03}
          duration={0.65}
          {...(fromAssembly ? { on: capsOn } : {})}
        />

        {/* the GRID ⟷ STRIP segmented switch: the maroon thumb slides
            between options on a spring; the resting option tints on hover.
            Post-assembly it's the LAST arrival, after the caption. */}
        <motion.div
          className={styles.toggleSeat}
          initial={fromAssembly ? { opacity: 1, x: offX } : false}
          animate={
            fromAssembly ? { opacity: 1, x: furnitureIn ? 0 : offX } : undefined
          }
          // a hair behind the standfirst — the two arrive as one gesture
          // from the right, not as a single rigid block
          transition={spring(1, 0.18, fromAssembly && furnitureIn ? 0.08 : 0)}
        >
          <div
            className={styles.viewToggle}
            role="group"
            aria-label="Restaurant layout"
          >
            {(["grid", "strip"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.toggleOpt} ${
                  mode === m ? styles.toggleOptOn : ""
                }`}
                aria-pressed={mode === m}
                aria-label={m === "grid" ? "Grid view" : "Horizontal scroll view"}
                title={m === "grid" ? "Grid" : "Scroll"}
                onClick={() => {
                  // once the user drives the view, the slide choreography
                  // owns every entrance again
                  settle();
                  setMode(m);
                }}
              >
                {mode === m ? (
                  <motion.span
                    className={styles.toggleThumb}
                    layoutId="discoverViewThumb"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", duration: 0.5, bounce: 0 }
                    }
                    aria-hidden
                  />
                ) : null}
                <svg
                  className={styles.toggleIcon}
                  viewBox="0 0 14 14"
                  aria-hidden
                  focusable="false"
                >
                  {m === "grid" ? (
                    <>
                      <rect x="1" y="1" width="5" height="5" rx="1" />
                      <rect x="8" y="1" width="5" height="5" rx="1" />
                      <rect x="1" y="8" width="5" height="5" rx="1" />
                      <rect x="8" y="8" width="5" height="5" rx="1" />
                    </>
                  ) : (
                    /* the reel: two full plates and a third running off the
                       edge — the icon says "this keeps going sideways",
                       which two equal rectangles never did */
                    <>
                      <rect x="1" y="3" width="4.4" height="8" rx="1" />
                      <rect x="6.6" y="3" width="4.4" height="8" rx="1" />
                      <rect x="12.2" y="3" width="1.8" height="8" rx="0.9" />
                    </>
                  )}
                </svg>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* the view switch: AnimatePresence waits for the outgoing layout's
          cells to slide off before the incoming one slides on — grid rows
          part to the left/right, the reel draws in from the right */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={mode}
          ref={gridRef}
          className={`${styles.grid} ${
            mode === "strip" ? styles.gridStrip : ""
          }`}
          aria-label="Our restaurants"
          // the seats are invisible until the plates land on them — nothing
          // there is pressable yet, and the page is held still anyway
          style={stageUp ? { pointerEvents: "none" } : undefined}
          variants={{ hidden: {}, show: {}, exit: {} }}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          exit="exit"
          onPointerDown={onStripDown}
          onPointerMove={onStripMove}
          onPointerUp={endStripDrag}
          onPointerCancel={endStripDrag}
          onClickCapture={onStripClickCapture}
          // the photos would otherwise start a NATIVE image drag that
          // cancels our pointer stream — the reel's grab-drag depends on
          // suppressing it
          onDragStart={(e) => e.preventDefault()}
        >
          {ITEMS.map((it, i) => {
            // slide-from offset + group delay for this cell in this mode:
            // 110vw guarantees even the far column starts past the edge.
            // Every cell in a group shares ONE delay — the row/reel moves
            // as a rigid unit, so cards keep their spacing in flight and
            // never overlap (a per-cell stagger would concertina them).
            // The bottom row starts a beat after the top — two clean
            // passes, not eight independent travellers.
            // LATCHED, like `introOwned` above: a tile that has already
            // committed its intro `initial` must keep the matching
            // `animate`, or Framer strands it at opacity 0 forever.
            const tileIntro = fromAssembly && mode === "grid";
            // …whereas the cell's own slide is cleared the moment the
            // reader drives the view, so the toggle choreography resumes
            const fromIntro = tileIntro && !snapped;
            const motionCustom = reduce
              ? { x: 0, d: 0 }
              : fromIntro
                ? // the intro owns this cell's entrance — the flying plate
                  // is the reveal, so the cell itself never slides
                  { x: 0, d: -1 }
                : mode === "strip"
                  ? { x: 110, d: 0 }
                  : Math.floor(i / 4) % 2 === 0
                    ? { x: -110, d: 0 }
                    : { x: 110, d: 0.08 };
            return (
              <Tile
                key={it.slug}
                item={it}
                mode={mode}
                index={i}
                motionCustom={motionCustom}
                // during the intro the tile is a measured, invisible SEAT:
                // the overlay's plate is the thing on screen until it lands
                plateHidden={tileIntro && !platesOn}
                furnitureOn={!tileIntro || logosOn}
                captionsOn={!tileIntro || capsOn}
                introSettle={tileIntro}
                snapped={snapped}
                onOpen={() => setActive(it)}
              />
            );
          })}
        </motion.ul>
      </AnimatePresence>

      {/* the expanded detail card + backdrop — mounted only while open, so
          AnimatePresence can run the morph back into the grid on close */}
      <AnimatePresence>
        {active && (
          <ExpandedCard
            key={active.slug}
            item={active}
            mode={mode}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function Tile({
  item,
  mode,
  index,
  motionCustom,
  plateHidden,
  furnitureOn,
  captionsOn,
  introSettle,
  snapped,
  onOpen,
}: {
  item: DiscoverItem;
  mode: ViewMode;
  // seat index — lets the overlay's flight find this tile's plate
  index: number;
  motionCustom: { x: number; d: number };
  // while the assembly intro runs, this tile is a measured but INVISIBLE
  // seat: the overlay's deck plate is the thing on screen, and it flies
  // onto this exact rectangle before the two are swapped on one frame
  plateHidden?: boolean;
  // the logo + scrim, which fade up once the plate has landed
  furnitureOn?: boolean;
  // the meta line and pills, which build after the marks
  captionsOn?: boolean;
  // true for the whole intro — turns the staged entrances on at all
  introSettle?: boolean;
  // the sequence was cut short: land on the resting state without playing
  // an entrance the reader never saw begin
  snapped?: boolean;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  // staged furniture entrances for the assembly settle; statically visible
  // in every other flow
  // Each tile's mark comes up a beat after the one to its left — the marks
  // read ACROSS the grid the way the caption lines below them do, and the
  // eight scrims + eight logos + Belly's sticker are built over five frames
  // instead of all inside one (which is what cost a dropped frame here).
  const furnitureMotion = introSettle
    ? {
        initial: { opacity: 0 },
        animate: { opacity: furnitureOn ? 1 : 0 },
        transition: snapped
          ? { duration: 0 }
          : {
              duration: 0.8,
              ease: "easeOut" as const,
              delay: index * 0.05,
            },
      }
    : {};
  // bookability comes from the canonical data, not the local display copy
  const bookable = getRestaurant(item.slug)?.bookable ?? false;
  // neighbourhood pill copy — the canonical location minus the ", London"
  // every entry shares ("Camden, London" → "Camden"; plain "London" stays)
  const neighbourhood = getRestaurant(item.slug)
    ?.location.replace(/,\s*London$/, "");

  // HOVER FILM: the plate's clip mounts on the FIRST hover (so eight videos
  // never load up front — preload="none" and no element until needed) and
  // stays mounted after, so re-hovers resume instantly. Fine-pointer,
  // full-motion surfaces only: touch and reduced-motion keep the still.
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);
  const [clipMounted, setClipMounted] = useState(false);
  const [clipOn, setClipOn] = useState(false);
  /* Has this clip ever actually produced a frame? `preload="none"` means
     the element has NOTHING to draw at the moment the pointer arrives, so
     fading it in on hover alone crossfaded the photograph into an empty
     black box for however long the fetch took — 2.5MB on the smallest tile
     and 25MB on Belly's, which read as the picture vanishing under the
     cursor. The film is revealed on `playing` and not a moment before; a
     clip that never loads simply never appears, and the still stays. */
  const [clipLive, setClipLive] = useState(false);
  const clipRef = useRef<HTMLVideoElement>(null);

  const filmable = Boolean(item.clip) && canHover && !reduce;
  const onEnter = () => {
    if (!filmable) return;
    setClipMounted(true);
    setClipOn(true);
  };
  const onLeave = () => setClipOn(false);

  useEffect(() => {
    const v = clipRef.current;
    if (!v) return;
    if (clipOn) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [clipOn, clipMounted]);

  return (
    <motion.li
      className={styles.cell}
      variants={cellVariants}
      custom={motionCustom}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* the photo plate — a fixed landscape tile whose media zooms gently
          inside the clip while the whole cell is hovered/focused (see
          .tileMedia in the module). Rows never reflow. Pressing it opens
          the App Store expansion: the plate carries a layoutId so the
          detail card morphs OUT of this exact rectangle and back into it. */}
      <button
        type="button"
        className={styles.plateHit}
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Open ${item.name}`}
      >
        <motion.div
          className={styles.tileMedia}
          // the seat the assembly flight measures and lands on
          data-plate={index}
          // NAMESPACED per view mode — grid and reel tiles must never share
          // an id, or the view switch runs a cross-mode layout morph (old
          // grid rect → new reel rect) that overrides the slide choreography
          layoutId={reduce ? undefined : `card-${mode}-${item.slug}`}
          // one radius at both ends of the morph — no corner animation.
          // Held invisible (never unmounted) while the intro's plate is in
          // flight, so the box stays measurable and the handoff at the end
          // is a single-frame swap between two identical rectangles.
          style={{ borderRadius: 2, opacity: plateHidden ? 0 : 1 }}
        >
          {/* the GROWER: an out-of-flow clip pinned to the plate's top that
              gets slightly TALLER on hover — the bottom edge reaches down
              over the caption gap while the layout box (and everything
              below it) never moves */}
          <div className={styles.mediaGrow}>
          {item.image ? (
            <Image
              className={styles.photo}
              src={item.image}
              alt=""
              fill
              sizes="(max-width: 460px) 100vw, (max-width: 700px) 50vw, (max-width: 980px) 34vw, 25vw"
            />
          ) : (
            // photo-less tiles (Mamasons, Bunso) — deep maroon field so
            // the centered cream mark / wordmark carries the tile
            <div className={styles.fallback} aria-hidden />
          )}
          {/* the hover film — fades in over the still while playing */}
          {clipMounted && item.clip ? (
            <video
              ref={clipRef}
              className={`${styles.hoverClip} ${
                clipOn && clipLive ? styles.hoverClipOn : ""
              }`}
              src={item.clip}
              muted
              loop
              playsInline
              preload="none"
              onPlaying={() => setClipLive(true)}
            />
          ) : null}
          {/* legibility scrim behind the centred mark — resting state only.
              After the assembly it fades on WITH the logo, once the bare
              plate has landed. */}
          <motion.div className={styles.scrim} aria-hidden {...furnitureMotion} />

          {/* center — the brand group commands the plate; post-assembly
              it appears only after the plate reaches its seat */}
          <motion.div className={styles.center} {...furnitureMotion}>
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
          </motion.div>

          {/* the Michelin credential as a STICKER riding the plate's
              top-right corner (Belly) — slightly rotated, like it was
              pressed onto the photograph */}
          {item.badge ? (
            // Served through next/image rather than a raw image tag. The
            // source mark is 2965² (8.8 megapixels) and this box is 64px —
            // unoptimised, the browser decodes the whole thing and scales it
            // down, on the exact frame the marks are revealed, which is
            // where the one remaining paint spike in the sequence was.
            <motion.span
              className={styles.stickerBadge}
              title={item.badgeLabel}
              {...furnitureMotion}
            >
              <Image
                src={item.badge}
                alt={item.badgeLabel ?? ""}
                width={128}
                height={128}
                sizes="128px"
                draggable={false}
              />
            </motion.span>
          ) : null}

          {/* the story surfaces INSIDE the plate on hover/focus — cream
              copy rising into the bottom-left over the deepened scrim.
              Hover-only furniture: touch surfaces get it in the expansion
              instead. */}
          <span className={styles.hoverBlurb} aria-hidden>
            {item.blurb}
          </span>
          </div>
        </motion.div>
      </button>

      {/* the quiet caption line below the plate — cuisine · price on the
          left (with Belly's inline Michelin mark), the neighbourhood pill
          and Book on the right. Name, address and blurb live on the plate
          and in the expansion. Post-assembly it appears after the logos. */}
      <div className={styles.cellCaption}>
        <span className={styles.cellLine}>
          <span className={styles.cellTag}>
            {/* post-assembly the meta line builds WORD BY WORD out of its
                own masks — the manifesto's split-text grammar, reused so
                the two moments speak the same language */}
            <CaptionWords
              text={
                item.tag +
                (item.est ? ` · Est. ${item.est}` : "") +
                (item.priceRange ? ` · ${item.priceRange}` : "")
              }
              split={Boolean(introSettle) && !reduce}
              on={Boolean(captionsOn)}
              instant={Boolean(snapped)}
              // Each tile's line starts a beat after the one to its left,
              // so the captions read across the grid instead of snapping on
              // as one block — and the ~50 word-masks are built over five
              // frames rather than all inside one, which is what was
              // costing a dropped frame here.
              delay={snapped ? 0 : index * 0.05}
            />
          </span>
          <motion.span
            className={styles.pillRow}
            initial={introSettle && !reduce ? { opacity: 0, y: 8 } : false}
            animate={
              introSettle && !reduce
                ? captionsOn
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
                : { opacity: 1, y: 0 }
            }
            // the pills settle just behind the words they sit beside
            transition={
              snapped
                ? { duration: 0 }
                : { duration: 0.6, ease: EASE, delay: 0.28 + index * 0.05 }
            }
          >
            {neighbourhood ? (
              <span className={styles.pill}>{neighbourhood}</span>
            ) : null}
            {bookable && item.bookingUrl ? (
              <a
                href={item.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pillBook}
                aria-label={`Book at ${item.name}`}
              >
                Book
              </a>
            ) : null}
          </motion.span>
        </span>
      </div>
    </motion.li>
  );
}

/* the caption meta line as split text — each word rises out of its own
   clip on a short stagger (the Manifesto's exact grammar, so the two
   moments on the page speak the same language). When `split` is false it
   renders as plain, static words; `on` is the cue to build. */
function CaptionWords({
  text,
  split,
  on,
  instant,
  delay = 0,
}: {
  text: string;
  split: boolean;
  on: boolean;
  // the sequence was cut short — put the words up with no build
  instant?: boolean;
  // this tile's place in the wave across the grid
  delay?: number;
}) {
  if (!split) return <>{text}</>;
  return (
    <motion.span
      aria-label={text}
      initial="hidden"
      animate={on ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: instant ? 0 : 0.03,
            delayChildren: instant ? 0 : delay,
          },
        },
      }}
    >
      {text.split(" ").map((w, i) => (
        <span className={styles.capMask} key={i} aria-hidden>
          <motion.span
            className={styles.capWord}
            variants={{
              hidden: { transform: "translateY(115%)" },
              show: {
                transform: "translateY(0%)",
                transition: instant ? { duration: 0 } : { duration: 0.65, ease: EASE },
              },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* The App Store morph: the plate's rectangle becomes a centred detail card.
   The card element shares the plate's layoutId, so Framer Motion FLIPs it
   from the tile's bounds to the card's — transform-only, spring-driven,
   interruptible — while the body content fades up a beat behind. Closing
   (backdrop, ×, or Escape) runs the same morph in reverse. Reduced motion
   swaps the morph for a plain crossfade. */
function ExpandedCard({
  item,
  mode,
  onClose,
}: {
  item: DiscoverItem;
  mode: ViewMode;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bookable = getRestaurant(item.slug)?.bookable ?? false;

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
          layoutId={reduce ? undefined : `card-${mode}-${item.slug}`}
          style={{ borderRadius: 2 }}
          transition={EXPAND_SPRING}
          initial={reduce ? { opacity: 0 } : undefined}
          animate={reduce ? { opacity: 1 } : undefined}
          exit={reduce ? { opacity: 0 } : undefined}
        >
          {item.image ? (
            <Image
              className={styles.photo}
              src={item.image}
              alt=""
              fill
              sizes="(max-width: 780px) 100vw, 720px"
            />
          ) : (
            <div className={styles.fallback} aria-hidden />
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
            <span className={styles.stickerBadge}>
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
            {bookable && item.bookingUrl ? (
              <a
                href={item.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pillBook}
              >
                Book a Table
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
