"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { JUMP, lenisRef } from "@/lib/SmoothScroll";
import { useRouteTransition } from "./PageTransition";
import styles from "./Hero.module.css";
import PillCta from "./PillCta";
import { asset } from "@/lib/media";
import { registerIntroFilm } from "@/lib/introWindow";

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
  /* JUMP carries the duration + easing this used to inherit from the Lenis
     constructor. They are not there any more — the wheel path reads the same
     two options and was being eased by them, which is the bug lib/SmoothScroll
     documents — so an anchor jump has to ask for them by name. */
  lenis.scrollTo(el as HTMLElement, {
    ...JUMP,
    onComplete: () => {
      if (pass >= 2) return;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) > LANDING_SLOP) scrollToSection(hash, pass + 1);
    },
  });
}

// the kitchens take turns behind the wordmark — each clip plays through
// to its end, then the next one starts on a clean hard cut. BOTH videos
// stay mounted the whole time; the swap only flips visibility, so there's
// no loading gap or flash between clips.
//
// ⚠️ THE CUT IS THE USER'S CHOICE, AND A DISSOLVE WAS TRIED AND REMOVED.
// The motion crit's Finding 04 argued a hard splice reads as a glitch and
// shipped a 600ms opacity crossfade; the user asked for it to come out.
// A cut is a legitimate piece of film grammar — kitchens cut, montages
// cut — and it is faster and cleaner than a blend of two moving frames,
// which can read as mush. If the splice ever bothers again, the stronger
// alternative is not the dissolve back but ONE longer single-take clip
// (see the redesign blueprint) — a film that never needs a transition at
// all.
//
// ⚠️ ONLY THE FIRST ONE IS PRELOADED, AND ON A PHONE THAT IS THE DIFFERENCE
// BETWEEN A PAGE AND A DOWNLOAD. Both carried `preload="auto"`, which fetches
// each file in full: 9.3MB + 7.4MB = 16.7MB pulled down the wire before the
// reader has scrolled a pixel, on a first screen that can only ever show one
// of them. Measured on a 390px walk of the whole page, the two hero clips
// were 70% of its entire 24MB.
//
// THE SECOND IS PROMOTED PART-WAY THROUGH THE FIRST, which is what makes
// this a deferral rather than a trade. belly-hero.mp4 runs 22.3s and the cut
// cannot happen before it ends, so starting the second fetch at WARM_AT
// leaves 14 seconds to move 7.4MB — far more than it needs — while keeping
// those bytes off the first screen entirely.
//
// ⚠️ NOT `onPlaying`. That was the first attempt and it fires about a second
// in, which puts the second clip's whole download back inside the opening
// screen and buys nothing. The trigger has to be a POSITION IN THE FIRST
// CLIP, not the fact that it started.
const CLIPS = ["/videos/belly-hero.mp4", "/videos/mamasons-hero.mp4"];

// seconds into the first clip before its successor is fetched — see above.
// It is a floor, not a schedule: `timeupdate` fires roughly four times a
// second and the warm is a one-shot.
const WARM_AT = 8;

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

  /* the second clip's fetch, started WARM_AT seconds into the first — see the
     note on CLIPS. Idempotent, and it has to be: `timeupdate` keeps firing
     for the rest of the clip, and `load()` on an element already loading
     would restart the fetch from zero every quarter second. */
  const warmNext = () => {
    const first = videoRefs.current[0];
    if (!first || first.currentTime < WARM_AT) return;
    const el = videoRefs.current[1];
    if (!el || el.preload === "auto") return;
    el.preload = "auto";
    el.load();
  };

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
      /* everything inside this chapter that hides itself for an entrance is
         restored by the <noscript> block in app/layout.tsx — see the note on
         the attribute in components/Reveal.tsx */
      data-entrance="scope"
      /* ⚠️ THE LOCKUP IS CREAM BECAUSE THE FILM IS DARK, and if the film
         never paints the hero is cream type on a cream sheet — measured, with
         scripts off, as a completely blank first screen even though every
         element in it was present, positioned and at full opacity. Nothing
         was hidden; it was simply invisible.

         The film does not need JavaScript to play (a muted autoplay video is
         a browser feature), but it needs to decode and arrive, and the one
         thing a page cannot do is bet its legibility on that. The <noscript>
         block paints this ground dark so the type reads either way — behind a
         film that plays it is never seen, and behind one that does not it is
         the difference between a hero and an empty screen. */
      id="top"
      data-nav-theme="blend"
      data-cursor="glass"
    >
      <div
        className={styles.panel}
        /* ⚠️ THE LOCKUP IS CREAM BECAUSE THE FILM UNDER IT IS DARK. If the
           film does not paint — and it needs to decode and arrive, which no
           page can promise — this plate's own `--placeholder` ground leaves
           cream type on a cream sheet. The <noscript> block paints it dark:
           behind a film that plays it is never seen, and behind one that does
           not it is the difference between a hero and an empty screen.
           (Autoplay itself is a browser feature, not a script one, so the
           first clip does still play with JavaScript off.) */
        data-nojs-ground="film"
      >
        {/* ═══ THE ZOOM WRAPPER ═══
            The intro's window is one scalar `k`: four cream panels open a
            centred k·vw × k·vh aperture and THIS BOX scales by k about the
            viewport centre, so the picture itself grows into the hole instead
            of merely being uncovered. See lib/introWindow.ts for the whole
            mechanism and for the two approaches that were built, measured and
            rejected before it.

            THE RAMP AND THE GRAIN ARE INSIDE IT, so the hero picture zooms as
            ONE object; a ramp left outside would sit at full size over a
            postcard-sized film and read as a black band, not as shading.

            THE LOCKUP IS DELIBERATELY OUTSIDE IT, as a SIBLING. `lockupY` is a
            scroll-linked transform on that element; nesting it here would
            MULTIPLY the two and the wordmark would ride the intro's scale as
            well as the scroll. As siblings they compose and neither knows
            about the other.

            Its resting transform is identity (see .zoom), which is also the
            reveal's last keyframe — that is what makes the hand-off, and the
            short path that never animates at all, snap-free. */}
        <div className={styles.zoom} ref={registerIntroFilm} aria-hidden={false}>
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
            preload={i === 0 ? "auto" : "none"}
            onTimeUpdate={i === 0 ? warmNext : undefined}
            onEnded={i === clip ? advance : undefined}
            style={{ visibility: i === clip ? "visible" : "hidden" }}
            /* ⚠️ NOT AN ENTRANCE — A CAROUSEL SEAT. Only the clip currently
               playing is visible; the others are `preload="none"` and have
               never fetched a frame. The chapter's data-entrance="scope"
               restores everything inside it for readers without JavaScript,
               and that briefly included these: the un-hidden empty layers
               stacked over the playing one (all four are `position:absolute;
               inset:0`) and painted the hero blank. This opts them out.
               Autoplay itself is a browser feature, not a script one, so the
               first clip still plays with JavaScript off. */
            data-entrance="hold"
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
        </div>

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
            transition={{ duration: 1.15, ease: "easeOut", delay: 0.25 }}
          >
            Maginhawa
          </motion.h1>

          <motion.div
            className={styles.copy}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: started ? 1 : 0, y: started ? 0 : 10 }}
            transition={{ duration: 1.05, ease: "easeOut", delay: 0.45 }}
          >
            {/* ══════════ THE CLAIM, IN ONE LINE ══════════
                At the user's instruction, and it is the redesign blueprint's
                Chapter 01 landing early: the first screen now ANSWERS the
                question it used to only gesture at. The old caption was an
                inventory — "Seven rooms across North London — Filipino,
                Filipino-Japanese and Caribbean. It began with one Camden
                kitchen in 1987…" — three lines of what and where, and no
                why. This is the why, in twelve words.

                ⚠️ THE LINE IS ABOUTSPLIT's OPENING SENTENCE, VERBATIM, AND
                THE ECHO IS THE DEVICE, NOT A COLLISION. It is the group's
                thesis: spoken once at the top of the page as the claim, and
                met again four screens down where the story chapter expands
                it ("…A table you are not hurried from…"). A magazine runs
                its cover line into the feature the same way. Do not "fix"
                either copy to differ from the other — if the sentence ever
                changes, it changes in BOTH places or the echo dies.

                WHAT THE OLD CAPTION CARRIED IS NOT LOST: the cuisines and
                the eight rooms are the Rooms chapter's whole job, and the
                Camden-1987 dateline is the story chapter's first caption.
                The hero no longer summarises the page; it opens it.

                IT STILL DOES NOT TRANSLATE THE WORD ABOVE IT. "Tagalog for
                comfort" is the Manifesto's line, chapters down; spending it
                here would cash the payoff that chapter exists to deliver.
                The hero shows the word, the Manifesto explains it.

                (The old length ceiling — 62 characters, when the caption
                had to fit inside the wordmark's cap height — is moot twice
                over: the layout that imposed it is gone, and this line is
                63 characters anyway.) */}
            <p className={styles.sentence}>
              We cook the food we grew up on, for people we treat like
              family.
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
