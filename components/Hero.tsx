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
import PillCta from "./PillCta";
import { asset } from "@/lib/media";

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
            // resolved at the attribute only — `key` and the CLIPS table
            // stay on the raw path (see the banner in lib/media.ts)
            src={asset(src)}
            autoPlay={i === 0}
            muted
            playsInline
            preload="auto"
            onEnded={i === clip ? advance : undefined}
            style={{ visibility: i === clip ? "visible" : "hidden" }}
          />
        ))}

      {/* ═══ THE PLATE'S FOOT ═══
          INSIDE .panel, which is what crops the wordmark: the word is sized
          to the frame (10.5vw, no max) and the plate's `overflow: hidden`
          turns the overrun into a crop.

          THE RAMP IS A SIBLING OF THE VIDEOS AND PRECEDES THE LOCKUP, so it
          paints over the film and under the type. Its own note in the
          stylesheet carries the contrast measurement that put it there. */}
        <div className={styles.ramp} aria-hidden />
        {/* the grain goes OVER the ramp as well as the film — see its note */}
        <div className={styles.grain} aria-hidden />

        <motion.div
          className={styles.lockup}
          style={reduce ? undefined : { y: lockupY }}
        >
          {/* THE PAGE'S <h1>, AND IT IS THE NAME AGAIN.
              It was this sentence at display size; the wordmark had moved to
              the navbar and the hero had no name on it at all. The heading is
              the group's own logotype once more — set in Contralto, the face
              globals.css reserves for exactly this role — and the sentence
              below has become its caption.

              WHY THAT IS THE BETTER HEADING HERE, given the note this
              replaces argued the opposite: the navbar's wordmark is 20px
              chrome that a screen reader meets as a link to "/", where this
              is the page's subject stated at 150px. And the word is the one
              the Manifesto three chapters down stops to translate — showing
              it here is what makes that payoff land. */}
          {/* THE DELAYS BELOW ARE A BREATH, NOT A WAIT. `started` flips the
              moment the loader unmounts, and the loader now hands off ~100ms
              after its reveal completes — the old 1.25s/1.45s delays dated
              from a slower hand-off and left film + nav sitting alone for
              well over a second before the name arrived. */}
          <motion.h1
            className={styles.mark}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: started ? 1 : 0, y: started ? 0 : 14 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
          >
            Maginhawa
          </motion.h1>

          <motion.div
            className={styles.copy}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: started ? 1 : 0, y: started ? 0 : 10 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
          >
            {/* the identifying sentence, as one paragraph rather than three
                clause spans: at 15px it sets as a caption and the clause
                breaks that mattered at 80px would now be arbitrary rags */}
            {/* ⚠️ TWO LINES, AND THE LENGTH IS LOAD-BEARING. The caption
                column is only as tall as the wordmark's cap-to-baseline
                (see .lockup), and the alignment the design asks for holds
                only while this paragraph plus the control FIT inside that
                height. Measured at 1440: cap height 106px against a
                two-line caption (44) + gap (14) + pill (44) = 102. A third
                line makes the column the taller of the two, the wordmark
                stretches to it, and the button's foot leaves the baseline.
                THE LENGTH CEILING IS GONE with the side-by-side layout.
                Three earlier drafts were cut to 62 characters because the
                caption had to fit inside the wordmark's cap height; on its
                own row it does not, so the cuisines are back and the line
                about the Camden kitchen with them. It sets in three lines
                on the nav's measure.

                IT STILL DOES NOT TRANSLATE THE WORD ABOVE IT. "Tagalog for
                comfort" is the Manifesto's line, three chapters down;
                spending it here would cash the payoff that chapter exists
                to deliver.

                IT DELIBERATELY DOES NOT TRANSLATE THE WORD ABOVE IT. "Tagalog
                for comfort" was the obvious caption and it is the Manifesto's
                line, three chapters down; spending it here would cash the
                payoff that chapter exists to deliver. The hero shows the
                word, the Manifesto explains it. */}
            <p className={styles.sentence}>
              Seven rooms across North London - Filipino, Filipino-Japanese
              and Caribbean. It began with one Camden kitchen in 1987 and it
              is still the same family cooking, room by room, night after
              night.
            </p>

            {/* ── THE HOUSE ACTION, at the user's instruction ──
                It was a bespoke cream pill with a disc beside it. It is
                <PillCta> now: the same object the journal's head carries,
                so a reader who has learned what that control does knows
                this one before reading it. The merge, the magnet and the
                arrow's delayed step all come with it. */}
            {/* CREAM, at the user's instruction — the same ink as the
                wordmark above it. It is still the house control; the tone is
                the component's own per-ground variant, and on a photograph
                cream is the one fill that is legible whatever the frame is
                doing. It is also the only OPAQUE thing on the film, which is
                what makes it the loudest without any colour at all.
                (`accent` was tried first and rendered green: the token is
                still called --saffron but the palette behind it is
                #2a5c4a now.) */}
            <PillCta href="/restaurants" tone="cream" className={styles.cta}>
              Pick a restaurant
            </PillCta>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
