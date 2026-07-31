"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import styles from "./AboutIntro.module.css";
import Reveal from "./Reveal";
import SplitWords from "./SplitWords";

// the hero's primary kitchen clip (CLIPS[0] in Hero.tsx) — reused here as a
// single looping backdrop, no cycling. The team photograph doubles as the
// poster frame and as the static stand-in under reduced motion.
const ABOUT_CLIP = "/videos/belly-hero.mp4";
const ABOUT_POSTER = "/images/careers-team.jpg";

/**
 * "About Us" chapter — a CLEAR chapter on the shared cream ground: maroon
 * type, no card, no scroll morph. The one piece of theatre is the FILM's
 * entrance — it settles in from a softened clip as the section scrolls
 * into view, then sits still.
 *
 * At full view the film keeps a small, EVEN breath of cream between itself
 * and the screen's top, bottom and left edges (the page margin on all
 * three sides — the section's own padding). Everything seats on the GLOBAL
 * 12-column grid: film on the golden major segment (columns 1–7, full
 * height), display heading + story ranged right on the minor (9–12), the
 * founder's name above his 4:5 portrait (11–12), the Learn More link left
 * of the portrait with their bottoms aligned. The "Maginhawa" wordmark and
 * its dictionary definition ride the film's lower-left corner in cream
 * over a legibility scrim.
 */
export default function AboutIntro() {
  // reduced motion: no film entrance and no autoplaying video — the poster
  // photograph stands in, statically
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  /* NO PARALLAX HERE ANY MORE — not on the film, not on the heading, not on
     the founder's column. It was written to give the chapter depth against a
     ground that was changing underneath it, and that ground has gone: the
     whole band now arrives as one plane climbing over the restaurant grid
     (see MaroonZone). Layering a second, slower motion inside a chapter that
     is already moving as a sheet gave the reader two different speeds to
     track in the same moment, which is the thing that read as unsettled.
     One movement per chapter. */

  // the maroon ground itself lives on the surrounding MaroonZone wrapper
  // (shared with As Seen In and the interlude) — this section is
  // transparent and just wears the cream type
  return (
    <section
      id="about"
      ref={ref}
      className={styles.section}
      data-nav-theme="dark"
    >
      <div className={styles.grid}>
        {/* left — the kitchen film on the golden major segment. Its
            entrance is the section's only staged move: a softened clip
            opens while the frame rises and fades in, one-shot. */}
        <motion.div
          className={styles.mediaFrame}
          initial={
            reduce
              ? false
              : { clipPath: "inset(12% 8% 12% 8%)", opacity: 0, y: 48 }
          }
          whileInView={
            reduce
              ? undefined
              : { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, y: 0 }
          }
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
        >
          {reduce ? (
            <Image
              className={styles.mediaPoster}
              src={ABOUT_POSTER}
              alt="The Maginhawa family at work"
              fill
              sizes="(max-width: 980px) 100vw, 58vw"
            />
          ) : (
            <video
              className={styles.media}
              src={ABOUT_CLIP}
              poster={ABOUT_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Inside the Maginhawa kitchens"
            />
          )}
          <div className={styles.mediaScrim} aria-hidden />
          {/* the definition builds out of its own word masks — the same
              grammar the statement under the hero speaks, so the two
              moments on the page sound alike. The headword leads, the
              gloss and the body follow it in. */}
          <div className={styles.wordmarkBlock}>
            <SplitWords
              as="p"
              className={styles.wordmark}
              text="Maginhawa"
              amount={0.4}
              duration={0.85}
            />
            <SplitWords
              as="p"
              className={styles.defMeta}
              text="ma·gin·ha·wa — adjective · Tagalog"
              amount={0.4}
              delay={0.18}
              stagger={0.03}
              duration={0.6}
            />
            <SplitWords
              as="p"
              className={styles.defBody}
              text="Comfortable; at ease. The brief for everything we do: food with deep roots, rooms that feel like home, and service that treats every guest as family."
              amount={0.4}
              delay={0.3}
              stagger={0.018}
              duration={0.6}
            />
          </div>
        </motion.div>

        {/* top-right, ending flush at column 12's right edge — the display
            heading and the story, ranged right in maroon */}
        <div className={styles.headCell}>
        <Reveal delay={0.08} className={styles.headBlock}>
          <h2 className={styles.title}>About Us.</h2>
          <div className={styles.story}>
            <p className={styles.body}>
              Maginhawa began in 1987 as Chef Omar&apos;s family kitchen on
              Kentish Town Road — one room, one stove, and a menu built from
              what the family cooked at home. Nearly four decades on, the
              same family runs seven distinct dining rooms across London: a
              Filipino fusion table, a Caribbean kitchen, London&apos;s first
              Filipino ice cream parlour, a Filipino-Japanese ramen counter
              in Soho, and a Michelin-listed bistro back where it started.
            </p>
            <p className={styles.body}>
              Each has its own voice, its own room and its own regulars.
              What they share is a way of working: recipes carried down
              rather than researched, produce bought the way a household
              buys it, and a welcome that treats every guest as family —
              which is what maginhawa has meant all along.
            </p>
          </div>
        </Reveal>
        </div>

        {/* lower-right band — the founder's name line riding directly
            above his portrait: name at the left edge, alias sharing the
            name's last line */}
        <div className={styles.founderCell}>
        <Reveal delay={0.14} className={styles.founderBlock}>
          <p className={styles.founderRow}>
            <span className={styles.founderName}>Omar Shah.</span>
            <span className={styles.founderAka}>(a.k.a. Bossman)</span>
          </p>
          <div className={styles.portraitFrame}>
            <Image
              className={styles.portraitImg}
              src="/images/omarshah.jpeg"
              alt="Chef Omar Shah, founder of the Maginhawa Group"
              fill
              sizes="(max-width: 980px) 90vw, 20vw"
            />
          </div>
        </Reveal>
        </div>

        {/* directly left of the portrait, bottoms aligned — the quiet link
            into the full story */}
        <Reveal delay={0.2} className={styles.ctaCell}>
          <Link
            href="/about"
            className={styles.cta}
            aria-label="Learn more about Maginhawa Group"
          >
            <span className={styles.ctaLabel}>Learn More</span>
            <svg
              className={styles.ctaChevron}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
