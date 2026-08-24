"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// shared handle so components can drive smooth scroll (e.g. scroll-assist)
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * The options a PROGRAMMATIC jump takes — an anchor link, back-to-top, the
 * journal's scroll-to-list. They are NOT on the Lenis constructor, and that
 * is the whole point of this export: see THE WHEEL IS NOT THE JUMP below.
 * Spread them at every `lenis.scrollTo()` call site that wants an eased
 * journey rather than the wheel's damping.
 */
export const JUMP = {
  duration: 2.4,
  /* A quartic ease-IN-OUT, where the site used to run a quintic ease-out.
     An ease-out starts at full speed: on a short jump nobody notices, but
     on the long ones this site actually makes — the hero to a chapter four
     screens down, or the footer back to the top of a 20,000px page — it
     launches the whole document at maximum velocity from a standstill,
     which is the one moment in a scroll that reads as a lurch. In-out
     leaves gently, covers the distance, and arrives gently, so the reader
     can follow where the page went instead of finding it already there. */
  easing: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
} as const;

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
      /* ══════════ THE WHEEL IS NOT THE JUMP ══════════
         ⚠️ `duration` AND `easing` ARE DELIBERATELY ABSENT, and removing
         them is the substance of this whole tuning pass rather than a
         tidy-up. Read this before adding either back.

         Lenis routes the wheel through its own `scrollTo` with
         `programmatic: false`, and — crucially — passes ALL THREE of
         `lerp`, `duration` and `easing` from these options when it does
         (lenis.mjs, `onVirtualScroll`). The animation then picks a mode:

             if (this.duration && this.easing) { ...eased ramp... }
             else if (this.lerp)               { ...exponential damp... }

         `duration && easing` is tested FIRST. So for as long as both sat
         on this object, EVERY WHEEL NOTCH RAN A DURATION-BASED EASE and
         the `lerp` beside them was dead code — including the 0.032 that
         used to live here under a comment calling it "pure lerp-based
         scrolling". The comment described a mechanism the file had turned
         off. Measured on the home page (probe: 5 notches at a 60ms
         cadence, 1440×900):

                              tail after input   settle    latency
           was: dur 2.1 + quintic ease-out   133px / 58%    1203ms    31ms
           now: damp, lerp 0.09               80px / 35%     646ms    14ms

         WHY THAT IS THE "CONTROLLED" THE BRIEF ASKED FOR. Under the old
         ramp more than half of every scroll happened AFTER the reader had
         stopped turning the wheel — the page was finishing a gesture that
         was already over, and arriving somewhere nobody chose. Worse, a
         duration-based ramp RESTARTS on every notch: each one re-eases
         from wherever the page is to a new target, so a continuous scroll
         is a series of velocity discontinuities. That is the faint pumping
         underneath the old feel.

         Exponential damping has neither problem. There is one target and
         one decay; a new notch moves the target and the motion absorbs it
         without a seam, which is why this is SMOOTHER as well as tighter.

         WHY 0.09 AND NOT TIGHTER. The sweep ran 0.06 / 0.09 / 0.12 / 0.15
         (tails 110 / 80 / 60 / 42px). 0.12 and above start reading as a
         utility scroll — correct, and wrong for a page that wants to be
         read rather than operated. 0.09 still coasts for two thirds of a
         second. It keeps the glide and gives back the ending.

         The per-frame step stays at 6px at 120Hz, nowhere near the ~100px
         cliff a native wheel notch lands as — the smoothness this
         component exists for is intact. */
      lerp: 0.09,
      smoothWheel: true,
      /* ── 0.46, DOWN FROM 0.58 ──
         THIS is the slower page, and it is the only knob that makes the
         page slower: `lerp` governs the SHAPE of the move, this governs
         how far it goes. A wheel notch (deltaY 100 in Chrome) now moves
         the target 46px instead of 58 — about a fifth less ground each
         time, so a screen of copy takes roughly 20 notches rather than 15
         and the chapters below unfold over more of the reader's own
         effort.
         There is a floor under this that is not worth finding: at some
         point a mouse wheel stops feeling deliberate and starts feeling
         broken, and the people who hit it first are the ones NOT on a
         trackpad. A fifth slower, not half. */
      wheelMultiplier: 0.46,
      // matched restraint on a touch drag, so a phone reads at the same
      // pace as a desktop instead of out-running it
      touchMultiplier: 0.9,
      // Native touch on mobile already glides and supports pull-to-refresh;
      // let the OS own that surface instead of hijacking it.
      syncTouch: false,
    });
    lenisRef.current = lenis;
    // handle for the puppeteer capture scripts, which have to drive scroll
    // through Lenis — a raw window.scrollTo is pulled straight back to
    // Lenis's own target on the next frame
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

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
