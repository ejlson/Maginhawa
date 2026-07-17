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
      // but laggier; 0.04 leans hard into glide — the page coasts rather
      // than tracks, matching the slower editorial pacing.
      lerp: 0.04,
      smoothWheel: true,
      // Tamed further so a single wheel notch moves the target position a
      // shorter distance — combined with the low lerp, scrolling reads as
      // deliberate page-turning rather than flicking.
      wheelMultiplier: 0.72,
      touchMultiplier: 1.3,
      // `easing` + `duration` are still consulted by `lenis.scrollTo()` for
      // programmatic jumps (anchor links, route transitions). Quintic
      // ease-out so those jumps also coast in instead of snapping; the
      // longer duration keeps them in step with the slower wheel feel.
      easing: (t) => 1 - Math.pow(1 - t, 5),
      duration: 1.8,
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
