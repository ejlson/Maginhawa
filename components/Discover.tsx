"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Discover.module.css";
import { getRestaurant } from "@/lib/restaurants";
import { lenisRef } from "@/lib/SmoothScroll";

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
    clip: "/videos/bintang.mp4",
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
    clip: "/videos/guanabana.mp4",
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
    clip: "/videos/mamasons.mp4",
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
    clip: "/videos/ramo.mp4",
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
    clip: "/videos/cafemama.mp4",
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
    clip: "/videos/belly-hero.mov",
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

// deck offsets for the seven plates that gather BEHIND Bintang's during
// the intro — a loose upright stack, edges peeking on every side
const BACK_OFFSETS = [
  { x: -44, y: -22 },
  { x: 44, y: -16 },
  { x: -30, y: 26 },
  { x: 30, y: 22 },
  { x: -16, y: -38 },
  { x: 16, y: 36 },
  { x: 0, y: -30 },
];

// The pasteboard around the stage title — TEN editorial prints at varied
// (never large) sizes, free to overlap, filling the whitespace like a
// contact sheet. DETERMINISTIC seats. Each carries its own scroll-
// parallax drift and an `out` vector radiating away from the centre —
// the direction it flies off in (while fading) as the grid forms.
const STAGE_PRINTS = [
  { src: "/blog/DSCF3035-web.jpg", left: "6%", top: "8%", w: 150, drift: 22, out: { x: -160, y: -120 } },
  { src: "/blog/DSCF2472-web.jpg", left: "16%", top: "56%", w: 128, drift: -16, out: { x: -180, y: 80 } },
  { src: "/blog/DSC07722-web.jpg", left: "30%", top: "12%", w: 104, drift: 12, out: { x: -90, y: -170 } },
  { src: "/blog/DSCF2298-web.jpg", left: "27%", top: "70%", w: 112, drift: 18, out: { x: -120, y: 160 } },
  { src: "/blog/DSCF3015-web.jpg", left: "58%", top: "66%", w: 148, drift: -20, out: { x: 90, y: 170 } },
  { src: "/blog/DSCF3052-web.jpg", left: "72%", top: "10%", w: 126, drift: 14, out: { x: 150, y: -140 } },
  { src: "/blog/DSCF2296-web.jpg", left: "86%", top: "44%", w: 102, drift: -12, out: { x: 190, y: 20 } },
  { src: "/blog/DSC07056-web.jpg", left: "84%", top: "64%", w: 118, drift: 20, out: { x: 170, y: 140 } },
  { src: "/blog/DSC07739-web.jpg", left: "44%", top: "78%", w: 96, drift: -14, out: { x: -30, y: 190 } },
  { src: "/blog/DSCF2995-web.jpg", left: "63%", top: "4%", w: 138, drift: 16, out: { x: 60, y: -180 } },
];

type PrintCustom = { i: number; out: { x: number; y: number } };

// prints: rise in as the stage arrives; when the grid forms they fly off
// in their own directions while fading — slow both ways, accelerating
// away on exit (ease-in), per the once-per-session tier
const printVariants = {
  hidden: { opacity: 0, x: 0, y: 24 },
  shown: (c: PrintCustom) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 1, ease: EASE, delay: 0.15 + c.i * 0.1 },
  }),
  out: (c: PrintCustom) => ({
    opacity: 0,
    x: c.out.x,
    y: c.out.y,
    transition: {
      duration: 1.1,
      ease: [0.45, 0, 0.75, 0.4] as const,
      delay: 2.6 + c.i * 0.06,
    },
  }),
};

/* one pasteboard print. Transform ownership is split so nothing fights:
   the OUTER owns only the scroll-linked parallax drift, the INNER owns
   the fade-in / fly-out variants, and the IMG floats on a slow CSS
   oscillation — parallax + fade + motion layered without conflict. */
function StagePrint({
  p,
  i,
  deckOn,
  inView,
  progress,
}: {
  p: (typeof STAGE_PRINTS)[number];
  i: number;
  deckOn: boolean;
  inView: boolean;
  progress: MotionValue<number>;
}) {
  const y = useTransform(progress, [0, 1], [p.drift, -p.drift]);
  return (
    <motion.div
      className={styles.stagePrint}
      style={{ left: p.left, top: p.top, width: p.w, y }}
      aria-hidden
    >
      <motion.div
        variants={printVariants}
        custom={{ i, out: p.out }}
        initial="hidden"
        animate={deckOn ? "out" : inView ? "shown" : "hidden"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.src} alt="" draggable={false} loading="lazy" />
      </motion.div>
    </motion.div>
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

// the App Store morph — an Apple-style spring: quick, barely-there bounce,
// interruptible mid-flight (a spring keeps its velocity when retargeted)
const EXPAND_SPRING = { type: "spring", duration: 0.55, bounce: 0.15 } as const;

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

  // THE ASSEMBLY STAGE — a full-viewport pasteboard that opens the
  // chapter, once per session: "Our Restaurants." holds the middle of the
  // screen on ONE line with the six editorial prints scattered around it.
  // Only when the stage genuinely FILLS the viewport (not when it first
  // peeks — that was invisible below the fold) does the sequence start:
  // the title splits in the middle, the Bintang plate opens up between
  // the two words, the other seven gather behind it as a loose deck, the
  // prints dissolve, and the whole composition flies apart — the title to
  // its head seat and every plate to its own grid cell (layoutId FLIPs).
  // Slow throughout: this is the rare, once-per-session tier where
  // delight is allowed. The page holds still while it plays; reduced
  // motion skips straight to the settled section.
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"stage" | "settled">(() =>
    discoverIntroPlayed ? "settled" : "stage",
  );
  const [deckOn, setDeckOn] = useState(false);
  // marks the first settled render so cells appear IN PLACE (the plates'
  // morph is the entrance); cleared again on the first view toggle
  const postIntro = useRef(false);
  const [plateW, setPlateW] = useState(420);

  // reduced motion never sees the stage
  useEffect(() => {
    if (reduce && phase === "stage") setPhase("settled");
  }, [reduce, phase]);

  // arm the sequence only once the stage fills half the screen
  useEffect(() => {
    if (phase !== "stage" || reduce || deckOn) return;
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5) {
          setDeckOn(true);
          observer.disconnect();
        }
      },
      { threshold: [0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase, reduce, deckOn]);

  // the sequence clock: lock the page, let the deck build (slow), then
  // settle — the FLIP to the grid runs as scroll control returns
  useEffect(() => {
    if (!deckOn) return;
    discoverIntroPlayed = true;
    // the deck plate's landing width — measured here (vw-based clamps
    // can't be tweened), only ever read while the stage is on screen
    setPlateW(Math.min(Math.round(window.innerWidth * 0.34), 460));
    const lenis = lenisRef.current;
    lenis?.stop();
    const t = setTimeout(() => {
      postIntro.current = true;
      setPhase("settled");
      lenis?.start();
    }, 3600);
    return () => {
      clearTimeout(t);
      lenis?.start();
    };
  }, [deckOn]);

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

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${phase === "stage" ? styles.sectionIntro : ""}`}
      id="restaurants"
      data-nav-theme="light"
    >
      {phase === "stage" ? (
        /* the pasteboard stage — the one-line title mid-screen with the
           prints scattered around it. Every deck plate carries the SAME
           layoutId as its grid tile, so ending the stage FLIPs each one
           to its seat. */
        <div className={styles.stage} ref={stageRef}>
          {STAGE_PRINTS.map((p, i) => (
            <motion.div
              key={p.src}
              className={styles.stagePrint}
              style={{ left: p.left, top: p.top, width: p.w }}
              variants={printVariants}
              custom={i}
              initial="hidden"
              animate={deckOn ? "out" : inView ? "shown" : "hidden"}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" draggable={false} loading="lazy" />
            </motion.div>
          ))}

          <motion.h2
            className={`${styles.title} ${styles.introTitle}`}
            layoutId="discoverTitle"
            layout="position"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <span>Our</span>
            {/* the SPLIT: this seat sits closed mid-word until the
                sequence arms, then opens up slowly and the deck builds
                inside it */}
            <motion.span
              className={styles.introStack}
              style={{ height: Math.round((plateW * 2) / 3) }}
              initial={{ width: 0 }}
              animate={deckOn ? { width: plateW } : { width: 0 }}
              transition={{
                duration: 1.1,
                ease: [0.32, 0.72, 0, 1],
                delay: 0.1,
              }}
            >
              {ITEMS.slice(1).map((it, i) => (
                <motion.div
                  key={it.slug}
                  className={styles.introPlate}
                  layoutId={`card-grid-${it.slug}`}
                  style={{
                    zIndex: 8 - i,
                    x: BACK_OFFSETS[i]?.x ?? 0,
                    y: BACK_OFFSETS[i]?.y ?? 0,
                    borderRadius: 2,
                  }}
                  initial={{ opacity: 0 }}
                  animate={deckOn ? { opacity: 1 } : { opacity: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: "easeOut",
                    delay: 1.5 + i * 0.12,
                  }}
                >
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" draggable={false} />
                  ) : (
                    <div className={styles.introFallback} aria-hidden />
                  )}
                </motion.div>
              ))}
              {/* Bintang rides the FRONT of the deck — the first plate the
                  sentence opens on */}
              <motion.div
                className={styles.introPlate}
                layoutId={`card-grid-${ITEMS[0].slug}`}
                style={{ zIndex: 9, borderRadius: 2 }}
                initial={{ opacity: 0 }}
                animate={deckOn ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ITEMS[0].image ?? ""} alt="" draggable={false} />
              </motion.div>
            </motion.span>
            <span>Restaurants.</span>
          </motion.h2>
        </div>
      ) : (
        <>
      {/* 12-column editorial head seated on the inset span: display heading
          across columns 1–6 (explicit two-line break at the 4-up breakpoint)
          and the small caption right-ranged in the far columns, sharing the
          heading's bottom baseline band. Both rise once on scroll-in —
          heading first, caption a beat behind. */}
      <div className={styles.head}>
        <motion.h2
          className={styles.title}
          // arriving FROM the intro: the layoutId flies the title from
          // mid-screen to this seat, so the scroll-in rise must not run
          layoutId={postIntro.current && !reduce ? "discoverTitle" : undefined}
          layout={postIntro.current && !reduce ? "position" : undefined}
          initial={
            reduce || postIntro.current
              ? false
              : { opacity: 0, transform: "translateY(36px)" }
          }
          whileInView={
            reduce || postIntro.current
              ? undefined
              : { opacity: 1, transform: "translateY(0px)" }
          }
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: 0.9,
            ease: EASE,
            // the flight from mid-stage to this seat — slow, quiet spring
            layout: { type: "spring", duration: 1.2, bounce: 0.08 },
          }}
        >
          Our <br className={styles.titleBreak} />
          Restaurants.
        </motion.h2>
        <motion.p
          className={styles.caption}
          initial={reduce ? false : { opacity: 0, transform: "translateY(20px)" }}
          whileInView={
            // settles at the stylesheet's resting 0.75
            reduce ? undefined : { opacity: 0.75, transform: "translateY(0px)" }
          }
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        >
          Ranging from Filipino Ice-Cream Parlours to Caribbean Inspired
          Smokehouse.
        </motion.p>

        {/* the GRID ⟷ STRIP segmented switch: the maroon thumb slides
            between options on a spring; the resting option tints on hover */}
        <div className={styles.toggleSeat}>
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
                  postIntro.current = false;
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
                        : { type: "spring", duration: 0.45, bounce: 0.2 }
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
                    <>
                      <rect x="1" y="4" width="5" height="6" rx="1" />
                      <rect x="8" y="4" width="5" height="6" rx="1" />
                    </>
                  )}
                </svg>
              </button>
            ))}
          </div>
        </div>
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
            const motionCustom = reduce
              ? { x: 0, d: 0 }
              : postIntro.current && mode === "grid"
                ? // settling out of the assembly intro — cells appear in
                  // place while the plates' layoutId morph carries the show
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
                motionCustom={motionCustom}
                onOpen={() => setActive(it)}
              />
            );
          })}
        </motion.ul>
      </AnimatePresence>
        </>
      )}

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
  motionCustom,
  onOpen,
}: {
  item: DiscoverItem;
  mode: ViewMode;
  motionCustom: { x: number; d: number };
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
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
          // NAMESPACED per view mode — grid and reel tiles must never share
          // an id, or the view switch runs a cross-mode layout morph (old
          // grid rect → new reel rect) that overrides the slide choreography
          layoutId={reduce ? undefined : `card-${mode}-${item.slug}`}
          // one radius at both ends of the morph — no corner animation
          style={{ borderRadius: 2 }}
          // the assembly morph (stage deck → grid seat) rides a slow,
          // quiet spring when this plate is the arriving element
          transition={{ layout: { type: "spring", duration: 1.2, bounce: 0.08 } }}
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
              className={`${styles.hoverClip} ${clipOn ? styles.hoverClipOn : ""}`}
              src={item.clip}
              muted
              loop
              playsInline
              preload="none"
            />
          ) : null}
          {/* legibility scrim behind the centred mark — resting state only */}
          <div className={styles.scrim} aria-hidden />

          {/* center — the brand group commands the plate */}
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

          {/* the Michelin credential as a STICKER riding the plate's
              top-right corner (Belly) — slightly rotated, like it was
              pressed onto the photograph */}
          {item.badge ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.stickerBadge}
              src={item.badge}
              alt={item.badgeLabel}
              title={item.badgeLabel}
              draggable={false}
            />
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
          and in the expansion. */}
      <div className={styles.cellCaption}>
        <span className={styles.cellLine}>
          <span className={styles.cellTag}>
            {item.tag}
            {item.est ? ` · Est. ${item.est}` : null}
            {item.priceRange ? ` · ${item.priceRange}` : null}
          </span>
          <span className={styles.pillRow}>
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
          </span>
        </span>
      </div>
    </motion.li>
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.stickerBadge}
              src={item.badge}
              alt=""
              draggable={false}
            />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.expandCredentialMark}
                src={item.badge}
                alt=""
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
