"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import styles from "./CustomCursor.module.css";

type Mode = "off" | "zone" | "button";

/**
 * Glass cursor — a liquid-glass disc that takes over from the native
 * cursor ONLY inside elements marked data-cursor="glass" (home hero,
 * About card, Locations film, the About page's pinned video). The glass
 * is CSS: `backdrop-filter: url(#lg-lens)` (GlassFilters.tsx) refracts
 * the real page behind the disc — type stays visible, just bent — with
 * a plain blur/saturate fallback where SVG displacement isn't
 * supported. It springs after the pointer, scales away everywhere else,
 * and condenses to a small ring over links/buttons. The zone check
 * re-runs on scroll so content sliding under a stationary pointer can't
 * leave a stale cursor behind. Fine-pointer devices only; reduced
 * motion opts out entirely.
 */
export default function CustomCursor() {
  const [mode, setMode] = useState<Mode>("off");
  const reduce = useReducedMotion();
  const pos = useRef({ x: -200, y: -200 });
  // the clip layer crops the disc to the current zone's rect, so when the
  // pointer nears an edge the part of the glass past the boundary is cut off
  const clipRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const x = useSpring(mx, { stiffness: 380, damping: 38, mass: 0.55 });
  const y = useSpring(my, { stiffness: 380, damping: 38, mass: 0.55 });

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;

    // active over any photography/footage anywhere on the site (media
    // usually sits under scrims and links, so the whole hit-test stack
    // is checked, not just the event target) and inside the explicit
    // data-cursor zones; over links/buttons it flips to the arrow.
    /* is there VISIBLE photography/footage at this point? Walk the
       hit-test stack top-down and stop at the first opaque layer —
       elementsFromPoint also returns media buried under solid sections
       (pinned/sticky videos especially), which must NOT count. */
    const visibleMediaAt = (x: number, y: number): Element | null => {
      for (const n of document.elementsFromPoint(x, y)) {
        if (n.tagName === "IMG" || n.tagName === "VIDEO") {
          // photography/footage only — logos, wordmarks and other UI
          // marks are too small to be a "scene", but they don't block
          // the check either (the nav logo rides over the hero footage)
          const r = n.getBoundingClientRect();
          if (r.width >= 180 && r.height >= 120) return n;
          continue;
        }
        // an opaque backdrop hides everything beneath it
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "transparent") {
          const a = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : 1;
          if (a >= 0.99) return null;
        }
      }
      return null;
    };

    // the element the cursor is confined to (its zone, or the piece of media
    // it's over) — used both to decide the mode and to clip the disc to it
    const resolve = (
      x: number,
      y: number,
      el: Element | null
    ): { mode: Mode; bound: Element | null } => {
      /* Resolve to the NEAREST data-cursor ancestor and then ask what it
         says, rather than searching for the nearest "glass" one. The two
         differ wherever a zone is nested inside a glass zone, which is the
         only way a nested section can own its cursor.

         `default` IS AN OPT-OUT, and it was not. It only declined to be a
         glass ZONE, then fell through to the media test below — so it worked
         on an opaque cream page (where the test finds nothing) and did
         nothing at all anywhere the section contains photography. The About
         page's story deck is exactly that case: nine large photographs inside
         the pinned video's glass scope, so the disc still sprang across the
         chapter being read, over the copy beside it and over the year wheel,
         with the cards themselves rotating in 3D underneath it. The attribute
         now means what its name says — this subtree has no glass cursor,
         whatever is in it — and it is used (see .story in About.tsx).
         Anything else is a no-op, so `data-cursor` values other than the two
         still fall through to the media test as before. */
      const z = el?.closest?.("[data-cursor]") ?? null;
      const declared = z?.getAttribute("data-cursor");
      if (declared === "default") return { mode: "off", bound: null };
      const zone = declared === "glass" ? z : null;
      const bound = zone ?? visibleMediaAt(x, y);
      if (!bound) return { mode: "off", bound: null };
      return { mode: el?.closest?.("a, button") ? "button" : "zone", bound };
    };

    /* ONE resolve per animation frame, reads first, writes last.

       This used to run per EVENT: a trackpad emits mousemove at ~120Hz, and
       Lenis's long coast (lerp 0.032) turns one wheel notch into seconds of
       scroll events, so the block below was executing several times per
       frame, site-wide, on every route. Worse, it interleaved reads and
       writes — elementsFromPoint and getBoundingClientRect, then a
       classList.toggle on <html>, then getComputedStyle again — and that
       toggle invalidates style for the WHOLE document, so every read after
       it had to recompute from scratch. Measured cost: ~47% of frames over
       32ms while scrolling a plain section with no animation in it.

       Now the events do nothing but record the pointer and ask for a frame.
       Inside the frame every read happens before every write, and each
       write is skipped unless its value actually changed — the class toggle
       and the React state in particular now fire only when the cursor
       genuinely crosses between zones, not on every sample. */
    let raf = 0;
    let queued = false;
    let lastMode: Mode = "off";
    let lastClip = "";
    let lastGlass = false;

    const frame = () => {
      raf = 0;
      queued = false;
      const { x: px, y: py } = pos.current;

      // ---- reads ----
      const { mode, bound } = resolve(px, py, document.elementFromPoint(px, py));
      let clip = "none";
      if (mode !== "off" && bound) {
        // insets from the viewport edges, so the crop stays fixed to the
        // zone while the disc springs through it; the element's own corner
        // radius makes rounded cards/films crop on their curve
        const r = bound.getBoundingClientRect();
        const radius =
          parseFloat(getComputedStyle(bound).borderTopLeftRadius) || 0;
        clip =
          `inset(${Math.max(0, r.top)}px ${Math.max(0, window.innerWidth - r.right)}px` +
          ` ${Math.max(0, window.innerHeight - r.bottom)}px ${Math.max(0, r.left)}px` +
          ` round ${radius}px)`;
      }

      // ---- writes, each only if it changed ----
      const glass = mode !== "off";
      if (glass !== lastGlass) {
        // the native cursor hides wherever the glass one is active — media
        // lives everywhere, so this can't be a static CSS rule
        document.documentElement.classList.toggle("glass-cursor", glass);
        lastGlass = glass;
      }
      if (clip !== lastClip) {
        if (clipRef.current) clipRef.current.style.clipPath = clip;
        lastClip = clip;
      }
      if (mode !== lastMode) {
        lastMode = mode;
        setMode(mode);
      }
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      // the disc itself still tracks at full pointer rate — these are
      // MotionValues feeding a spring, so they cost no layout and no render
      mx.set(e.clientX);
      my.set(e.clientY);
      schedule();
    };
    // content scrolls under a stationary pointer — re-resolve from the last
    // known coordinates
    const onScroll = () => schedule();
    // parked off-screen, so the next frame resolves to "off" on its own
    const onLeave = () => {
      pos.current = { x: -200, y: -200 };
      schedule();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("glass-cursor");
    };
  }, [mx, my, reduce]);

  if (reduce) return null;

  return (
    // the clip layer is cropped (via clip-path set in JS) to the current zone,
    // so the disc that springs inside it is cut off at the zone boundary
    <div ref={clipRef} className={styles.clip} aria-hidden>
      <motion.div
        className={styles.cursor}
        style={{ x, y }}
        initial={false}
        animate={{
          scale: mode === "zone" ? 1 : mode === "button" ? 0.5 : 0,
          opacity: mode === "off" ? 0 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* zone: a hollow ring; over a link/button it hands off to the
            small arrow (the two crossfade in place) */}
        <motion.span
          className={styles.ring}
          animate={{ opacity: mode === "button" ? 0 : 1, scale: mode === "button" ? 0.6 : 1 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: mode === "button" ? 1 : 0, scale: mode === "button" ? 1 : 0.6 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </motion.svg>
      </motion.div>
    </div>
  );
}
