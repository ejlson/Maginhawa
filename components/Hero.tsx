"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { lenisRef } from "@/lib/SmoothScroll";
import { useRouteTransition } from "./PageTransition";
import styles from "./Hero.module.css";

// Lenis owns the scroll, so a raw scrollIntoView is pulled straight back —
// same hand-off the footer's "Back to top" uses. The native path is the
// fallback for before hydration and for reduced motion, where Lenis is off.
//
// THE SEAT MOVES WHILE YOU TRAVEL TO IT. Everything between the hero and the
// booking index is pinned or sticky — the chapter pin over the grid, the
// interlude under the journal — and a pin's runway only resolves as it is
// scrolled through. So the offset Lenis computes at click time is the offset
// of a page that has not happened yet: measured, "Book a table" travelled to
// y1745 and left #book 4495px further down, having aimed at where the section
// sat before the pins above it unfolded.
//
// Re-aiming fixes it. Scroll, let it land, measure the target again, and go
// again if it is still off-screen — each pass starts from a page that is more
// settled than the last, so it converges quickly. Three passes is a stop, not
// a budget: "Find a restaurant" arrives on the first and never uses the rest.
const LANDING_SLOP = 8; // px — inside this, the reader cannot tell
function scrollToSection(hash: string, pass = 0) {
  const el = document.querySelector(hash);
  if (!el) return;
  const lenis = lenisRef.current;
  if (!lenis) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  lenis.scrollTo(el as HTMLElement, {
    onComplete: () => {
      if (pass >= 2) return;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) > LANDING_SLOP) scrollToSection(hash, pass + 1);
    },
  });
}

// the kitchens take turns behind the wordmark — each clip plays through
// to its end, then the next one starts on a clean hard cut. BOTH videos
// stay mounted and preloaded the whole time; the swap only flips
// visibility, so there's no loading gap or flash between clips.
const CLIPS = ["/videos/belly-hero.mp4", "/videos/mamasons-hero.mp4"];

export default function Hero({ started }: { started: boolean }) {
  const [clip, setClip] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // depth for the cover parallax: as the cream sheet rides up over the
  // pinned hero at 1×, the lockup drifts up at a fraction of that —
  // scroll-linked transform on one element, clamped to the first viewport
  // of travel. Reduced motion pins it.
  const reduce = useReducedMotion();
  // the curtain transition, same hand-off the navbar and footer links use —
  // a raw <Link> would change route without it
  const navigate = useRouteTransition();
  const { scrollY } = useScroll();
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const lockupY = useTransform(scrollY, [0, vh], [0, -vh * 0.18], {
    clamp: true,
  });

  const advance = () => {
    const next = (clip + 1) % CLIPS.length;
    const el = videoRefs.current[next];
    if (el) {
      el.currentTime = 0;
      void el.play();
    }
    setClip(next);
  };

  return (
    <section
      className={styles.hero}
      id="top"
      data-nav-theme="blend"
      data-cursor="glass"
    >
      <div className={styles.panel}>
        {CLIPS.map((src, i) => (
          <video
            key={src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            className={styles.video}
            src={src}
            autoPlay={i === 0}
            muted
            playsInline
            preload="auto"
            onEnded={i === clip ? advance : undefined}
            style={{ visibility: i === clip ? "visible" : "hidden" }}
          />
        ))}
      </div>

      {/* ONE LOCKUP, CENTRED IN THE FILM.
          The hero used to seat this block on its floor, above a MAGINHAWA
          set edge-to-edge. The wordmark has moved to the navbar (see
          Nav.tsx), where it is on screen for every route rather than only
          the top of the home page — so the hero no longer has to spend its
          whole floor naming the group, and what is left is the sentence and
          the two ways in, centred on the frame. */}
      <motion.div
        className={styles.lockup}
        style={reduce ? undefined : { y: lockupY }}
      >
        {/* WHAT THIS IS, AND THE PAGE'S <h1>.

            The hero was a film, the wordmark and the word "Scroll": nothing
            on it said Filipino, said London, said how many rooms, or gave
            anyone anything to do. The sentence that identifies the group sat
            a full screen further down, so a reader arriving from press or
            from Instagram met a beautiful screen that could have belonged to
            any restaurant in Europe. The <title> was doing work the design
            was not.

            The cue went rather than moved: with two real actions sitting
            here, "Scroll" was a third instruction for the same gesture, and
            the hero budget (brand, one line, one action group, one image) has
            no room for a fourth thing. The arrow pointed at what the buttons
            now name.

            THE HEADING MOVED HERE WITH THE WORDMARK'S DEPARTURE. The h1 used
            to be the MAGINHAWA lockup, taking its accessible name from the
            SVG's aria-label; that element is gone, and a page with no h1 was
            the exact defect its comment was written to fix. This sentence is
            the better heading anyway — it names the cuisine, the city and the
            year, where the wordmark only named the group the navbar already
            names on every route. */}
        <motion.h1
          className={styles.lede}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: started ? 1 : 0, y: started ? 0 : 10 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 1.3 }}
        >
          {/* One block per sentence, so the line breaks land on the clauses
              instead of wherever the measure happens to run out. Set as a
              single string it broke "Filipino at heart. Seven / London
              kitchens," — an orphan that made the first line read as a
              different claim than the one being made. Only the middle
              sentence is long enough to wrap, and the measure governs it. */}
          <span className={styles.clause}>Filipino at heart.</span>
          <span className={styles.clause}>
            Seven London kitchens, pan-Asian and Caribbean.
          </span>
          <span className={styles.clause}>Since 1987.</span>
        </motion.h1>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: started ? 1 : 0, y: started ? 0 : 10 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 1.45 }}
        >
          <button
            type="button"
            className={styles.actionPrimary}
            onClick={() => scrollToSection("#restaurants")}
          >
            Find a restaurant
          </button>
          {/* A ROUTE, NOT AN ANCHOR, AND THE PAGE DECIDED THAT.
              This pointed at #book — the booking index at the foot of the
              page — and could not get there. Measured: it travelled 1746px
              and stopped, leaving the target 4494px below, on every attempt
              and with re-aiming. The restaurants chapter stages itself as
              you enter it and clamps the scroll while it does; a jump that
              tries to cross it is held at the boundary, which is the
              chapter working, not a bug to route around.

              /restaurants is the better destination anyway. There is no
              group-level booking to send anyone to — four venues, four
              different hosts (OpenTable ×2, SevenRooms, ResDiary) — so
              "book a table" HAS to mean "choose a room first", and the
              index is the chooser, with a Book action on every bookable
              venue. It also stops the two hero actions being the same
              action: one browses the grid in place, one goes to the
              transactional page. */}
          <button
            type="button"
            className={styles.actionSecondary}
            onClick={() => navigate("/restaurants")}
          >
            Book a table
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
