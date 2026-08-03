"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import styles from "./RestaurantsShowcase.module.css";
import Nav from "./Nav";
import Menu from "./Menu";
import { useRouteTransition } from "./PageTransition";
import VideoBackdrop from "./VideoBackdrop";
import Placeholder from "./Placeholder";
// ALIASED, and it has to be: this file declares its own `RESTAURANTS` below
// (L70) — the carousel's ordered list with its per-venue video and display
// overrides. Importing the canonical array under the same name is a
// module-scope redeclaration that fails at runtime with "Cannot access
// 'RESTAURANTS' before initialization", not at build time.
import {
  RESTAURANTS as CANONICAL,
  SLUG_BY_NAME,
  getRestaurant,
} from "@/lib/restaurants";
import MenuOverlay from "./MenuOverlay";

// The venues you can simply turn up to. DERIVED, never typed out: booking
// policy already lives in lib/restaurants.ts, and this page has only just
// finished deleting the last hardcoded copy of it (the old NO_BOOKING set).
// `comingSoon` is excluded on purpose — Bunso is `bookable: false` because it
// has not opened, which is not a walk-in policy, and telling a reader to walk
// into it would be a lie. ReviewUs.tsx:11 draws the same distinction.
const WALK_IN = CANONICAL.filter((r) => !r.bookable && !r.comingSoon);

// "A, B and C" — an editorial list, not a comma-joined array dump.
function nameList(names: string[]) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// scroll-wheel view: stacked lines with the centre one highlighted
function WheelIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden>
      <line x1="3.5" y1="4" x2="12.5" y2="4" strokeWidth="1" opacity="0.55" />
      <line x1="3.5" y1="8" x2="12.5" y2="8" strokeWidth="1.6" />
      <line x1="3.5" y1="12" x2="12.5" y2="12" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

// card-list view: 2×2 grid
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
    </svg>
  );
}

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M4 10l4-4 4 4" />
    </svg>
  );
}

// NOTE: one video ships today (hero-draft3). Drop a per-restaurant clip in
// /public/videos and point `video` at it — the background crossfades on its own.
const RESTAURANTS = [
  {
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "Camden, London",
    video: "/videos/bintang-hero.mp4",
  },
  {
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "Kentish Town, London",
    video: "/videos/guanabana.mp4",
  },
  {
    name: "Mamasons",
    tag: "Filipino Ice Cream Parlour",
    location: "Camden · Soho, London",
    video: "/videos/mamasons-hero.mp4",
  },
  {
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Ramen",
    location: "Kentish Town · Soho",
    video: "/videos/hero-ramo.mp4",
  },
  {
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "London",
    video: "/videos/hero-draft3-1080.mp4",
  },
  {
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "London",
    video: "/videos/hero-draft3-1080.mp4",
  },
  {
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "Camden, London",
    video: "/videos/belly-hero.mp4",
  },
  {
    // coming-soon — no photography, logo or clip yet; the card view renders
    // a typographic wordmark on a maroon field, and thes wheel falls back to
    // the generic house clip
    name: "Bunso",
    tag: "Filipino-Japanese Kissaten Listening Jazz Bar",
    location: "London",
    video: "/videos/forpilot1.mp4",
  },
];

const N = RESTAURANTS.length;

const LOGOS: Record<string, string> = {
  Bintang: "/logo/bintang.png",
  Belly: "/logo/belly.png",
  Mamasons: "/logo/mamasons.png",
  "Café Mama & Sons": "/logo/cafemama.png",
  Guanabana: "/logo/guanabana.png",
  "Ramo Ramen": "/logo/ramo.png",
  Hoodwood: "/logo/hoodwood.png",
  Bunso: "/logo/bunso.png",
};

const PHOTOS: Record<string, string> = {
  Bintang: "/images/bintang.jpg",
  Belly: "/images/belly3.jpg",
  "Café Mama & Sons": "/images/cafemama.jpg",
  Guanabana: "/images/guanabana.jpg",
  "Ramo Ramen": "/images/ramo.jpg",
  Hoodwood: "/images/hoowood.jpg",
  Mamasons: "/images/mamasons.jpg",
};

// many stacked copies → an endless loop. We don't touch scrollTop mid-scroll
// (that kills inertia and feels janky); instead we silently re-centre on the
// middle copy once scrolling settles. The jump is a whole-copy multiple, so the
// content is pixel-identical and the move is invisible.
const COPIES = 11;
const MID = Math.floor(COPIES / 2);

// wheel feel — lower = slower. SENS scales raw wheel delta into scroll pixels.
const WHEEL_SENS = 0.22;

/* ---------------------------------------------------------------------------
   THE WHEEL'S MOTION MODEL

   Every input — notch, drag, flick, chevron, click, arrow key — writes ONE
   target and the same critically damped spring carries the list to it. That
   is what removes the stepping: the old loop covered 6% of the remaining
   distance per frame with a 0.75px floor under the step, so the last ~12px
   of every settle ran at a constant 0.75px/frame and then hard-snapped when
   the gap fell under a pixel. A spring has no floor and no cliff — it arrives.

   Apple's two parameters rather than the physics triplet (WWDC18, "Designing
   Fluid Interfaces"): RESPONSE is how long the value takes to reach the
   target in seconds, DAMPING is overshoot. Damping is exactly 1.0 here — a
   picker that springs past a name and comes back has, for a moment, the
   wrong restaurant under the selection band, and that reads as a bug rather
   than as bounce. The buttons beside it are damped 1.0 for the same reason.

   Mass is 1, so k = ω² and c = 2ζω with ω = 2π / response. */
const SPRING_RESPONSE = 0.42;
const SPRING_W = (2 * Math.PI) / SPRING_RESPONSE;
const SPRING_K = SPRING_W * SPRING_W;
const SPRING_C = 2 * SPRING_W; // ζ = 1.0, critically damped
/* Fixed sub-steps. A spring integrated at whatever interval rAF happens to
   deliver is a spring whose stiffness depends on the frame rate — and on a
   dropped frame (or a 120Hz display) the explicit-Euler form diverges. */
const SUB_H = 1 / 240;
const DT_CAP = 0.05; // a backgrounded tab must not resume with a 3s step

/* MOMENTUM PROJECTION — where a flick is GOING, not where it was released.
   Apple's exponential-decay form from the Fluid Interfaces sample code, NOT
   the textbook v²/2a. Tuned down from their 0.998 scroll-view value: 0.998
   throws a 1000px/s flick eight names, which on a list of seven means you
   cannot tell where you landed. 0.9965 throws it ~4.7 rows — fast enough to
   feel thrown, short enough to read. */
const FLICK_DECAY = 0.9965;
const project = (v: number) => (v / 1000) * (FLICK_DECAY / (1 - FLICK_DECAY));

/* Hysteresis before the wheel claims a pointer, and the reason a tap on a
   name still selects it rather than nudging the list a pixel and swallowing
   the click. Also the point at which direction is decided: past this, a
   gesture that is more horizontal than vertical is handed back untouched. */
const DRAG_THRESH = 8;
const VEL_WINDOW = 90; // ms of pointer history a release velocity is read from
const VEL_CAP = 4200; // px/s — a trackpad can report absurd single-sample speeds

/* How many rows either side of centre get their shading rewritten each frame.
   Beyond this the opacity/scale ramps are already clamped at their floors, so
   writing them again every frame is 60+ style mutations that cannot change a
   pixel. The window is what keeps the per-frame cost flat. */
const SHADE_SPAN = 5;

// scrollTop writes land on device pixels — pre-round targets the same way so
// the final snap lands exactly instead of parking a sub-pixel off
const snapToDevice = (v: number) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(v * dpr) / dpr;
};
const LOOP = Array.from({ length: COPIES * N }, (_, k) => ({
  ...RESTAURANTS[k % N],
  realIndex: k % N,
  gpos: k,
}));

export default function RestaurantsShowcase() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"wheel" | "cards">("wheel");
  // slug of the restaurant whose menu modal is currently open (or null)
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const navigate = useRouteTransition();

  // helper: open the menu overlay for a given display name, but only if the
  // restaurant actually has menu pages set in lib/restaurants.ts
  const openMenuFor = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    const r = slug ? getRestaurant(slug) : undefined;
    if (slug && r?.menuPages && r.menuPages.length > 0) setMenuFor(slug);
  };
  const hasMenu = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    const r = slug ? getRestaurant(slug) : undefined;
    return !!(r?.menuPages && r.menuPages.length > 0);
  };
  // A Book action exists exactly when lib/restaurants.ts says the venue takes
  // bookings AND gives somewhere to send them. Both halves are checked here so
  // callers have ONE thing to test. This replaced a hand-maintained set of
  // display names that restated `bookable: false` verbatim — with the
  // Reservations index now reading the same field, a second restatement was a
  // copy waiting to drift.
  const getBookingUrl = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    const restaurant = slug ? getRestaurant(slug) : undefined;
    return restaurant?.bookable ? restaurant.bookingUrl : undefined;
  };
  // the restaurant's own site for the Visit actions — entries without one
  // fall back to the internal detail page
  const getWebsite = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    return slug ? getRestaurant(slug)?.website : undefined;
  };
  const menuRestaurant = menuFor ? getRestaurant(menuFor) : undefined;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const copyH = useRef(0); // pixel height of one full copy (N rows)
  const rowH = useRef(0);
  const activeRef = useRef(0);
  const settle = useRef(0);

  /* THE ONE rAF ID, and it is also the "a loop is already running" latch —
     which is why every place that cancels it NULLS it in the same breath. A
     cancelled-but-uncleared id wedges this wheel shut permanently: every
     later kick() sees a truthy value and declines to schedule, and the list
     never moves again. That has shipped on this component once already; the
     cleanup below and the guards inside frame() are the fix, not a
     precaution. */
  const raf = useRef(0);
  const lastT = useRef(0);

  /* pos is the AUTHORITATIVE scroll offset and it is fractional. scrollTop
     rounds to device pixels on write, so reading it back as the integrator's
     state quantises the spring and reintroduces the crawl this replaced. */
  const pos = useRef(0);
  const vel = useRef(0); // px/s, positive = the list is travelling downward
  const targetTop = useRef(0);
  const mode = useRef<"idle" | "drag" | "spring">("idle");
  const wrote = useRef(-1); // the last value WE wrote, so onScroll can tell

  /* the snap grid, measured once: the first row's centre inside the scroll
     content and the uniform row pitch. Every snap target is
     rowC0 + n·rowH − clientHeight/2, so a projection of any length resolves
     analytically instead of by walking 77 elements. */
  const rowC0 = useRef(0);
  const shaded = useRef<{ lo: number; hi: number }>({ lo: 0, hi: -1 });

  const drag = useRef<{
    id: number;
    x0: number;
    y0: number;
    pos0: number;
    live: boolean;
    hist: { y: number; t: number }[];
  } | null>(null);
  /* set the moment a drag commits and cleared on the next frame after the
     gesture ends — it is what stops the pointerup that finished a 200px
     throw from also counting as a click on whichever name it landed under */
  const dragged = useRef(false);

  /* A reduced-motion reader gets a DIFFERENT wheel, not this one with the
     animation stripped out: native scrolling, no pointer drag, no wheel
     interception, and selections that land instantly. Read live rather than
     latched at mount, because the setting can change while the tab is open. */
  const reduced = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const on = () => {
      reduced.current = mq.matches;
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // this route is all dark — paint the page (and overscroll) maroon so no
  // cream/white ever shows, and release the global loader scroll lock
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    html.style.backgroundColor = "#2f0000";
    document.body.style.backgroundColor = "#2f0000";
    document.body.classList.remove("is-loading");
    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  /* Fade and scale each name by its distance from the centre line, and pick
     the nearest as active.

     TWO THINGS THIS DELIBERATELY DOES NOT DO, both of which it used to:

     1. It does not read `offsetTop`/`offsetHeight` off 77 buttons every
        frame. The rows are a uniform pitch, so the i-th centre IS
        rowC0 + i·rowH — measured once, computed thereafter. 154 layout
        property reads per frame became zero.
     2. It does not write a style to all 77. Past ~5 rows out the opacity and
        scale ramps are already pinned at their floors, so those writes cannot
        change a pixel. Only the live window is written; rows that have just
        left it are pushed to the floor once and then left alone. */
  const render = useCallback(() => {
    const root = scrollerRef.current;
    const unit = rowH.current;
    if (!root || !unit) return;

    const center = pos.current + root.clientHeight / 2;
    const fi = (center - rowC0.current) / unit; // fractional row index at centre
    const mid = Math.round(fi);
    const items = itemRefs.current;
    const last = items.length - 1;

    const lo = Math.max(0, mid - SHADE_SPAN);
    const hi = Math.min(last, mid + SHADE_SPAN);
    const prev = shaded.current;

    // rows that just left the window settle at the floor, once
    for (let i = prev.lo; i <= prev.hi; i++) {
      if (i >= lo && i <= hi) continue;
      const el = items[i];
      if (!el) continue;
      el.style.opacity = "0.12";
      el.style.transform = "scale(0.78)";
    }

    for (let i = lo; i <= hi; i++) {
      const el = items[i];
      if (!el) continue;
      const dist = Math.abs(fi - i);
      el.style.opacity = String(Math.max(0.12, 1 - dist * 0.32));
      el.style.transform = `scale(${Math.max(0.78, 1 - dist * 0.1)})`;
    }
    shaded.current = { lo, hi };

    const bestReal = items[Math.min(last, Math.max(0, mid))]
      ? Number(items[Math.min(last, Math.max(0, mid))]!.dataset.real)
      : activeRef.current;
    if (bestReal !== activeRef.current) {
      activeRef.current = bestReal;
      setActive(bestReal);
    }
  }, []);

  /* Commit `pos` to the DOM, keeping it inside the middle copy. Whole-copy
     jumps are invisible because every copy is pixel-identical — but the
     DRAG'S ANCHOR has to move with them, or a recentre mid-gesture teleports
     the list out from under the finger. */
  const write = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const ch = copyH.current;
    if (ch) {
      const k = Math.round((pos.current - MID * ch) / ch);
      if (k !== 0) {
        const shift = k * ch;
        pos.current -= shift;
        targetTop.current -= shift;
        if (drag.current) drag.current.pos0 -= shift;
      }
    }
    const v = snapToDevice(pos.current);
    root.scrollTop = v;
    wrote.current = root.scrollTop;
  }, []);

  const frame = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) {
      raf.current = 0;
      return;
    }
    const now = performance.now();
    let dt = (now - lastT.current) / 1000;
    lastT.current = now;
    if (!(dt > 0)) dt = SUB_H;
    if (dt > DT_CAP) dt = DT_CAP;

    if (mode.current === "spring") {
      let acc = dt;
      while (acc > 0) {
        const h = acc > SUB_H ? SUB_H : acc;
        acc -= h;
        const f =
          -SPRING_K * (pos.current - targetTop.current) - SPRING_C * vel.current;
        vel.current += f * h;
        pos.current += vel.current * h;
      }
      // settled — park exactly on the target so the seat is pixel-honest
      if (
        Math.abs(pos.current - targetTop.current) < 0.12 &&
        Math.abs(vel.current) < 3
      ) {
        pos.current = targetTop.current;
        vel.current = 0;
        mode.current = "idle";
      }
    }

    write();
    render();

    if (mode.current === "idle") {
      raf.current = 0; // CLEAR, never merely stop — see the note on `raf`
      return;
    }
    raf.current = requestAnimationFrame(frame);
  }, [render, write]);

  const kick = useCallback(() => {
    if (raf.current) return;
    lastT.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  /* THE SNAP GRID, resolved arithmetically. Row centres are rowC0 + n·rowH,
     so the scrollTop that seats row n is that minus half the window. Works
     for a projection of any length, including one that runs past the ends of
     the 77 rendered rows — the copy recentring in write() folds it back. */
  const snapTop = useCallback((p: number) => {
    const root = scrollerRef.current;
    const r = rowH.current;
    if (!root || !r) return p;
    const base = rowC0.current - root.clientHeight / 2;
    return snapToDevice(base + Math.round((p - base) / r) * r);
  }, []);

  // centre of a row inside the scroll content, in fractional pixels — measured
  // off the <li>, not the button: offsetTop/offsetHeight round to integers
  // (parking the wheel off whenever --row is fractional, e.g. 58.5px at 768),
  // and the button carries the optical --wheel-name-nudge which would skew the
  // target off the geometric row centre
  const rowCenter = (el: HTMLElement, rootTop: number, scrollTop: number) => {
    const r = (el.parentElement as HTMLElement).getBoundingClientRect();
    return r.top - rootTop + scrollTop + r.height / 2;
  };

  /* Aim at a scrollTop. `instant` is the reduced-motion path — the seat
     changes on the frame the input arrived, with no travel to watch. */
  const glideTo = useCallback(
    (to: number, instant = false) => {
      targetTop.current = to;
      if (instant || reduced.current) {
        pos.current = to;
        vel.current = 0;
        mode.current = "idle";
        write();
        render();
        return;
      }
      mode.current = "spring";
      kick();
    },
    [kick, render, write],
  );

  // snap whatever we are nearest to, dead centre
  const settleNow = useCallback(() => {
    if (mode.current === "drag") return; // the finger is still in charge
    glideTo(snapTop(pos.current));
  }, [glideTo, snapTop]);

  const scheduleSettle = useCallback(() => {
    clearTimeout(settle.current);
    settle.current = window.setTimeout(settleNow, 130);
  }, [settleNow]);

  // scroll to a clicked name through the same spring
  const selectEl = (el: HTMLElement) => {
    const root = scrollerRef.current;
    if (!root) return;
    clearTimeout(settle.current);
    const rootRect = root.getBoundingClientRect();
    const c = rowCenter(el, rootRect.top, root.scrollTop);
    glideTo(snapToDevice(c - rootRect.height / 2));
  };

  /* Step one restaurant. Measured from the TARGET when one is live, so a
     reader tapping the chevron four times quickly travels four names rather
     than four times the same partial distance. */
  const step = useCallback(
    (dir: number) => {
      const root = scrollerRef.current;
      if (!root || !rowH.current) return;
      clearTimeout(settle.current);
      const from =
        mode.current === "spring" ? targetTop.current : pos.current;
      glideTo(snapTop(from) + dir * rowH.current);
    },
    [glideTo, snapTop],
  );

  /* The scroller's scrollTop moving without us: a focus ring landing on a
     name deep in the list makes the browser scrollIntoView it, and in
     reduced-motion mode the list is natively scrollable on purpose. Adopt
     whatever happened and settle onto the nearest name — that turns a Tab
     into a selection, which is the behaviour a picker owes a keyboard. */
  const onScroll = () => {
    const root = scrollerRef.current;
    if (!root) return;
    if (Math.abs(root.scrollTop - wrote.current) < 0.6) return; // our own write
    pos.current = root.scrollTop;
    vel.current = 0;
    if (mode.current === "spring") mode.current = "idle";
    render();
    scheduleSettle();
  };

  /* Tabbing onto a name selects THAT name. Without this the browser scrolls
     the focused button barely into view, `onScroll` adopts the result and the
     settle above seats whichever name is nearest the centre — which, for a
     button that has just been scrolled to the very edge of a five-row window,
     is two names away from the one the focus ring is on. */
  const onFocusIn = (e: React.FocusEvent) => {
    const el = (e.target as HTMLElement)?.closest("button");
    if (el && el.dataset.real !== undefined) selectEl(el);
  };

  /* ---- the wheel notch ----

     Still intercepted, because the browser's own rate over a 5-row window is
     far too fast to read names by. A notch is a nudge on the TARGET; the
     spring does the smoothing, which is why the 0.75px-per-frame floor the
     old ease needed is gone.

     Reduced motion does not take this path at all: the handler returns before
     preventDefault, the browser scrolls the box natively, and `onScroll`
     picks the result up. `data-lenis-prevent` on the scroller is what makes
     that possible — Lenis preventDefaults the wheel document-wide, so without
     it a non-intercepted notch over this box would reach nothing at all. */
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      if (reduced.current) return;
      if (mode.current === "drag") return; // a finger outranks a notch
      e.preventDefault();
      const from = mode.current === "spring" ? targetTop.current : pos.current;
      targetTop.current = from + e.deltaY * WHEEL_SENS;
      mode.current = "spring";
      kick();
      scheduleSettle();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [kick, scheduleSettle]);

  /* ---- the drag ----

     GESTURE OWNERSHIP, stated once so it can be argued with:

     · A pointerdown ARMS but does not claim. Nothing moves and no capture is
       taken until the pointer has travelled DRAG_THRESH. Below that the
       gesture is a tap and the name under it selects normally.
     · At the threshold the direction decides. More horizontal than vertical
       and the drag is abandoned outright — the pointer is never captured, so
       a two-finger side-swipe or a stylus flick across the column passes
       through untouched.
     · Vertical, and the wheel takes the pointer and keeps it. THERE ARE NO
       ENDS TO HAND BACK AT: the list is eleven pixel-identical copies of
       seven names, recentred every frame, so a drag can run in either
       direction forever. Rubber-banding would be a lie about the content and
       "the page takes over at the end" has no end to trigger on. This is the
       iOS picker contract — the control owns vertical inside its own bounds
       and the page is scrolled by touching anywhere else. The scroller is
       `width: max-content`, roughly half a phone's width, so there is always
       somewhere else.
     · The gesture is re-anchored at the moment it commits, so the list does
       not jump the threshold's 8px when tracking starts. From there it is
       1:1 with the pointer, respecting where it was grabbed.

     INTERRUPTIBILITY: pointerdown reads the PRESENTATION value — the live
     on-screen scrollTop — and drops the spring on the spot. A grab mid-glide
     continues from where the eye last saw the list, not from wherever the
     spring was heading, and the new release velocity replaces the old
     outright rather than queueing behind it. */
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const endDrag = (d: NonNullable<typeof drag.current>) => {
      drag.current = null;
      if (root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id);
      root.removeAttribute("data-dragging");
    };

    const onDown = (e: PointerEvent) => {
      if (reduced.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      clearTimeout(settle.current);
      dragged.current = false;
      // adopt what is ON SCREEN, then drop the spring
      pos.current = root.scrollTop;
      vel.current = 0;
      mode.current = "idle";
      drag.current = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        pos0: pos.current,
        live: false,
        hist: [{ y: e.clientY, t: performance.now() }],
      };
    };

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const dy = e.clientY - d.y0;
      const dx = e.clientX - d.x0;

      if (!d.live) {
        if (Math.abs(dy) < DRAG_THRESH && Math.abs(dx) < DRAG_THRESH) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          drag.current = null; // horizontal intent — hand it straight back
          return;
        }
        d.live = true;
        dragged.current = true;
        // re-anchor so tracking starts where the finger is, with no jump
        d.y0 = e.clientY;
        d.pos0 = pos.current;
        d.hist = [{ y: e.clientY, t: performance.now() }];
        root.setPointerCapture(d.id);
        root.setAttribute("data-dragging", "true");
        mode.current = "drag";
        kick();
        return;
      }

      e.preventDefault();
      // 1:1 — pull down, the list comes down with you
      pos.current = d.pos0 - (e.clientY - d.y0);
      d.hist.push({ y: e.clientY, t: performance.now() });
      if (d.hist.length > 8) d.hist.shift();
    };

    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const live = d.live;
      endDrag(d);
      if (!live) {
        mode.current = "idle";
        return;
      }

      /* Release velocity over the last VEL_WINDOW ms rather than the last
         sample. One sample is whatever the final 4ms happened to be, which
         on a slow lift is zero — a throw that dies the instant it leaves the
         finger is the seam the whole model exists to remove. */
      const now = performance.now();
      const h = d.hist.filter((p) => now - p.t <= VEL_WINDOW);
      let v = 0;
      if (h.length >= 2) {
        const a = h[0];
        const b2 = h[h.length - 1];
        const ms = b2.t - a.t;
        // scrollTop runs opposite to the finger
        if (ms > 4) v = ((a.y - b2.y) / ms) * 1000;
      }
      if (v > VEL_CAP) v = VEL_CAP;
      if (v < -VEL_CAP) v = -VEL_CAP;

      // project where the momentum is going, snap THAT to a name, hand the
      // velocity to the spring so there is no seam between drag and animation
      vel.current = v;
      targetTop.current = snapTop(pos.current + project(v));
      mode.current = "spring";
      kick();
    };

    const onCancel = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      endDrag(d);
      settleNow();
    };

    /* A pointerup that ended a throw must not also count as a click on the
       name it happened to land over. Capture phase, so it is decided before
       the button's own handler runs — and it swallows exactly ONE click, the
       one this gesture produced. Leaving the flag up for the length of the
       glide would eat a real click made while the list was still coasting,
       which is the interruption the whole model is built to welcome. */
    const onClickCapture = (e: MouseEvent) => {
      if (!dragged.current) return;
      dragged.current = false;
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove, { passive: false });
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onCancel);
    root.addEventListener("click", onClickCapture, true);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel);
      root.removeEventListener("click", onClickCapture, true);
    };
  }, [kick, settleNow, snapTop]);

  /* ---- keyboard ----
     The names are real buttons and Tab/Enter already worked; this adds the
     picker's own idiom on top so a keyboard reader does not have to tab
     through a list to move one name. Arrow keys must preventDefault or the
     browser natively scrolls the box underneath the spring. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir =
      e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowUp"
          ? -1
          : e.key === "PageDown"
            ? 3
            : e.key === "PageUp"
              ? -3
              : 0;
    if (!dir) return;
    e.preventDefault();
    step(dir);
  };

  // measure rows, park on the middle copy, paint the first frame
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const measure = () => {
      // rect height keeps fractional --row values (58.5px at 768) —
      // offsetHeight rounds and would compute every target a little off
      const li = root.querySelector("li");
      rowH.current = li?.getBoundingClientRect().height ?? 0;
      copyH.current = rowH.current * N;
      root.scrollTop = snapToDevice(MID * copyH.current); // park on the middle copy
      pos.current = root.scrollTop;
      targetTop.current = pos.current;
      wrote.current = root.scrollTop;
      // the snap grid's origin, taken off the <li> for the reasons in rowCenter
      if (li) {
        rowC0.current = rowCenter(
          li.firstElementChild as HTMLElement,
          root.getBoundingClientRect().top,
          root.scrollTop,
        );
      }
      // every row to the floor once, so render()'s window has a known outside
      for (const el of itemRefs.current) {
        if (!el) continue;
        el.style.opacity = "0.12";
        el.style.transform = "scale(0.78)";
      }
      shaded.current = { lo: 0, hi: -1 };
      render();
      settleNow(); // seat the nearest row dead-centre from the first frame
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      // CLEAR, don't merely cancel — the id is the "is a loop running?" latch
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
      mode.current = "idle";
      drag.current = null;
      clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- the actions arrive ----
     Selection changes, and Visit / Book / Menu rise the last 10px into place
     rather than blinking to the new restaurant. Critically damped with a
     ~360ms response: a control that springs past its position and comes back
     reads as unserious on something you are about to click.

     `useAnimationControls` rather than a `key` remount, deliberately. A
     remount on every selection would drop focus out of whichever action a
     keyboard reader was on the instant the wheel moved. The DOM identity
     stays; only transform and opacity are touched. */
  /* ---- the film follows the CHOICE, not the blur ----

     VideoBackdrop mounts a fresh <video> with a new src every time this
     changes, and that is the single most expensive thing on the page. It used
     to be wired straight to `active`, which was survivable when the only way
     to move the list was a wheel notch — and is not now a flick crosses four
     or five names in a second. Measured on the production build at 1440x900:
     one frame of 38.6ms during a flick, every other frame under 16, i.e. the
     spring is cheap and the video swap is not.

     140ms of quiet before the film commits. Below the threshold at which a
     background crossfade reads as lagging the name, and long enough that a
     throw loads ONE clip instead of five. The name, the actions and the
     selection band all still track `active` on the frame it changes — this
     delays the film and nothing else. */
  const [filmFor, setFilmFor] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setFilmFor(active), 140);
    return () => clearTimeout(t);
  }, [active]);
  const film = RESTAURANTS[filmFor];

  const actionsCtl = useAnimationControls();
  useEffect(() => {
    if (reduced.current) {
      actionsCtl.set({ opacity: 1, y: 0 });
      return;
    }
    actionsCtl.set({ opacity: 0, y: 10 });
    actionsCtl.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        bounce: 0, // ζ = 1.0 — no overshoot
        duration: 0.36, // Apple's "response", not a play length
        delay: i * 0.05,
      },
    }));
  }, [active, actionsCtl]);

  const item = RESTAURANTS[active];

  return (
    <main className={styles.page}>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <section className={styles.hero} data-nav-theme="blend">
        {/* full-bleed background; the active restaurant's clip crossfades in */}
        <div className={styles.bg} aria-hidden>
          {/* `film`, not `item` — see the note by filmFor: the clip commits
              140ms after the list settles so a flick loads one video and not
              one per name it flew past. */}
          <VideoBackdrop src={film.video} className={styles.bgVideo} />
          <div className={styles.scrim} />
        </div>

        {/* phrase · name wheel · visit link, centred */}
        <div className={styles.stage} data-hidden={view !== "wheel"}>
          <div className={styles.panel}>
            <div className={styles.wheel}>
              <button
                type="button"
                className={styles.step}
                onClick={() => step(-1)}
                aria-label="Previous restaurant"
              >
                <Chevron up />
              </button>

              <div className={styles.scrollWrap}>
                {/* selection window over the centre row */}
                <span className={styles.selBand} aria-hidden />
                {/* `data-lenis-prevent`: Lenis preventDefaults the wheel for
                    the whole document, so in reduced-motion mode — where this
                    component deliberately does NOT intercept the notch — the
                    box would otherwise be unscrollable by wheel. Harmless on
                    the normal path, where our own listener preventDefaults
                    first. The same attribute is on .cards for the same
                    reason. */}
                <div
                  ref={scrollerRef}
                  className={styles.scroller}
                  onScroll={onScroll}
                  onKeyDown={onKeyDown}
                  onFocus={onFocusIn}
                  data-lenis-prevent
                >
                  <ul className={styles.list}>
                    {LOOP.map((r) => (
                      <li key={r.gpos} className={styles.row}>
                        <button
                          type="button"
                          data-real={r.realIndex}
                          ref={(el) => {
                            itemRefs.current[r.gpos] = el;
                          }}
                          className={`${styles.name} ${active === r.realIndex ? styles.nameActive : ""}`}
                          onClick={(ev) => selectEl(ev.currentTarget)}
                          aria-current={active === r.realIndex}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                className={styles.step}
                onClick={() => step(1)}
                aria-label="Next restaurant"
              >
                <Chevron />
              </button>
            </div>

            <div className={styles.actions}>
              {/* Visit → the restaurant's own site in a new tab; the
                  internal detail page (footer-linked) is the fallback */}
              {getWebsite(item.name) ? (
                <motion.a
                  custom={0}
                  initial={{ opacity: 0, y: 10 }}
                  animate={actionsCtl}
                  href={getWebsite(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.actBtn} ${styles.actBtnSolid}`}
                >
                  <span className={styles.actLabel}>Visit {item.name}</span>
                  <span aria-hidden>→</span>
                </motion.a>
              ) : (
                <motion.button
                  custom={0}
                  initial={{ opacity: 0, y: 10 }}
                  animate={actionsCtl}
                  type="button"
                  className={`${styles.actBtn} ${styles.actBtnSolid}`}
                  onClick={() => {
                    const slug = SLUG_BY_NAME[item.name];
                    if (slug) navigate(`/restaurants/${slug}`);
                  }}
                >
                  <span className={styles.actLabel}>Visit {item.name}</span>
                  <span aria-hidden>→</span>
                </motion.button>
              )}
              {getBookingUrl(item.name) && (
                <motion.a
                  custom={1}
                  initial={{ opacity: 0, y: 10 }}
                  animate={actionsCtl}
                  href={getBookingUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.actBtn}
                >
                  Book a Table
                </motion.a>
              )}
              <motion.button
                custom={2}
                initial={{ opacity: 0, y: 10 }}
                animate={actionsCtl}
                type="button"
                className={styles.actBtn}
                onClick={() => openMenuFor(item.name)}
                disabled={!hasMenu(item.name)}
                aria-label={`View ${item.name} menu`}
              >
                Menu
              </motion.button>
            </div>
          </div>
        </div>

        {/* Card-list view — photo grid on a clean cream surface.

            `data-lenis-prevent`: below 980px this box becomes its own
            scroller (see the media query in the stylesheet), and Lenis
            preventDefaults the wheel for the whole document — so the notch
            never reached the grid and the bottom rows were simply
            unreachable. Measured at 900x800: 489px of cards below the fold,
            0px of travel. The attribute tells Lenis to skip any wheel whose
            composed path passes through here and let the browser scroll this
            element natively. Harmless above the breakpoint, where the grid
            fits the screen and there is nothing to scroll. */}
        <div
          className={styles.cards}
          data-hidden={view !== "cards"}
          data-lenis-prevent
        >
          <div className={styles.cardsGrid}>
            {RESTAURANTS.map((r) => (
              <article key={r.name} className={styles.card}>
                <span className={styles.cardImg}>
                  {PHOTOS[r.name] ? (
                    <img src={PHOTOS[r.name]} alt={r.name} />
                  ) : r.name === "Bunso" ? (
                    <span className={styles.cardField} aria-hidden>
                      Bunso
                    </span>
                  ) : (
                    <Placeholder ratio="auto" label={r.name} />
                  )}
                </span>
                <div className={styles.cardOverlay}>
                  {LOGOS[r.name] ? (
                    <img
                      className={`${styles.cardMark} ${
                        r.name === "Bintang" ? styles.cardMarkLg : ""
                      }`}
                      src={LOGOS[r.name]}
                      alt={r.name}
                    />
                  ) : r.name !== "Bunso" ? (
                    // Bunso's field wordmark already names the card
                    <span className={styles.cardName}>{r.name}</span>
                  ) : null}
                  <span className={styles.cardLoc}>{r.location}</span>
                  <div className={styles.cardActions}>
                    {/* Bunso has no menu yet — skip even the disabled stub */}
                    {r.name !== "Bunso" && (
                      <button
                        type="button"
                        className={styles.cardBtn}
                        onClick={() => openMenuFor(r.name)}
                        disabled={!hasMenu(r.name)}
                        aria-label={`View ${r.name} menu`}
                      >
                        Menu
                      </button>
                    )}
                    {getBookingUrl(r.name) && (
                      <a
                        href={getBookingUrl(r.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.cardBtn}
                      >
                        Book a Table
                      </a>
                    )}
                    {/* Visit → the restaurant's own site in a new tab;
                        internal detail page as the no-website fallback */}
                    {getWebsite(r.name) ? (
                      <a
                        href={getWebsite(r.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.cardBtn} ${styles.cardBtnSolid}`}
                      >
                        Visit
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.cardBtn} ${styles.cardBtnSolid}`}
                        onClick={() => {
                          const slug = SLUG_BY_NAME[r.name];
                          if (slug) navigate(`/restaurants/${slug}`);
                        }}
                      >
                        Visit
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* view switch, bottom-left */}
        <div className={styles.viewToggle} role="group" aria-label="View">
          <motion.span
            className={styles.toggleThumb}
            animate={{ x: view === "cards" ? 38 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            aria-hidden
          />
          <button
            type="button"
            data-active={view === "wheel"}
            onClick={() => setView("wheel")}
            aria-label="Wheel view"
            aria-pressed={view === "wheel"}
          >
            <WheelIcon />
          </button>
          <button
            type="button"
            data-active={view === "cards"}
            onClick={() => setView("cards")}
            aria-label="Card view"
            aria-pressed={view === "cards"}
          >
            <GridIcon />
          </button>
        </div>

        {/* Walk-in note — the toggle's mirror image on the right-hand end of
            the same optical line. The homepage now sends everyone here to
            "choose a restaurant", so the three that need no choosing have to
            say so at the point of choice rather than back on the film.

            `data-view` is what lets the note invert with its ground instead
            of carrying a plaque everywhere: cream on the film, maroon on the
            card sheet. See .walkIn in the stylesheet for the measurements. */}
        <p className={styles.walkIn} data-view={view}>
          No booking needed at {nameList(WALK_IN.map((r) => r.name))}.
        </p>
      </section>

      <MenuOverlay
        open={!!menuFor && !!menuRestaurant?.menuPages?.length}
        onClose={() => setMenuFor(null)}
        pages={menuRestaurant?.menuPages ?? []}
        restaurantName={menuRestaurant?.name ?? ""}
        subtitle={menuRestaurant?.menuLabel}
      />
    </main>
  );
}
