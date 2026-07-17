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
    const visibleMediaAt = (x: number, y: number): boolean => {
      for (const n of document.elementsFromPoint(x, y)) {
        if (n.tagName === "IMG" || n.tagName === "VIDEO") {
          // photography/footage only — logos, wordmarks and other UI
          // marks are too small to be a "scene", but they don't block
          // the check either (the nav logo rides over the hero footage)
          const r = n.getBoundingClientRect();
          if (r.width >= 180 && r.height >= 120) return true;
          continue;
        }
        // an opaque backdrop hides everything beneath it
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "transparent") {
          const a = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : 1;
          if (a >= 0.99) return false;
        }
      }
      return false;
    };

    const resolve = (x: number, y: number, el: Element | null): Mode => {
      const zone = el?.closest?.('[data-cursor="glass"]');
      if (!zone && !visibleMediaAt(x, y)) return "off";
      return el?.closest?.("a, button") ? "button" : "zone";
    };

    const apply = (m: Mode) => {
      setMode(m);
      // the native cursor hides wherever the glass one is active —
      // media lives everywhere, so this can't be a static CSS rule
      document.documentElement.classList.toggle("glass-cursor", m !== "off");
    };

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      mx.set(e.clientX);
      my.set(e.clientY);
      apply(resolve(e.clientX, e.clientY, e.target as Element | null));
    };
    // content scrolls under a stationary pointer — re-resolve from the
    // last known coordinates
    const onScroll = () => {
      const { x: px, y: py } = pos.current;
      apply(resolve(px, py, document.elementFromPoint(px, py)));
    };
    const onLeave = () => apply("off");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("glass-cursor");
    };
  }, [mx, my, reduce]);

  if (reduce) return null;

  return (
    <motion.div
      className={styles.cursor}
      style={{ x, y }}
      initial={false}
      animate={{
        scale: mode === "zone" ? 1 : mode === "button" ? 0.5 : 0,
        opacity: mode === "off" ? 0 : 1,
      }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      aria-hidden
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
  );
}
