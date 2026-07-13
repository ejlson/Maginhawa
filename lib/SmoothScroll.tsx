"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// shared handle so components can drive smooth scroll (e.g. scroll-assist)
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * Wraps the app in Lenis smooth scrolling — gives the weighty, gliding
 * scroll feel the parallax + reveal animations are tuned against.
 * Disabled automatically when the user prefers reduced motion.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      // Pure lerp-based scrolling: every frame the rendered position is
      // pulled toward the target by `lerp` (0–1). With no duration-based
      // animation in the wheel path, momentum decays smoothly toward zero
      // each frame and never snaps to a halt. Lower values feel smoother
      // but laggier; 0.055 leans toward glide for the editorial feel.
      lerp: 0.055,
      smoothWheel: true,
      // Slightly tamed so a single wheel notch doesn't punch the target
      // position far ahead of where the user expects.
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      // `easing` + `duration` are still consulted by `lenis.scrollTo()` for
      // programmatic jumps (anchor links, route transitions). Quintic
      // ease-out so those jumps also coast in instead of snapping.
      easing: (t) => 1 - Math.pow(1 - t, 5),
      duration: 1.4,
      // Native touch on mobile already glides and supports pull-to-refresh;
      // let the OS own that surface instead of hijacking it.
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
