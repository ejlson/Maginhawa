"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./AboutIntro.module.css";
import Parallax from "./Parallax";

/**
 * One masked title line — the Hero wordmark's rise-in, retold per line.
 * The outer span clips (overflow: hidden), the inner motion span rises
 * translateY(110%) → 0. The in-view trigger lives on the parent h2 (a
 * fully clipped span never intersects, so whileInView here would never
 * fire) — the lines inherit its variant switch via propagation. Reduced
 * motion swaps the rise for a plain fade, mirroring Reveal's fallback.
 */
function TitleLine({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduce = useReducedMotion();

  const variants: Variants = shouldReduce
    ? {
        lineHidden: { opacity: 0 },
        lineShown: {
          opacity: 1,
          transition: { duration: 0.4, ease: "easeOut", delay },
        },
      }
    : {
        lineHidden: { transform: "translateY(110%)" },
        lineShown: {
          transform: "translateY(0%)",
          transition: { duration: 1, ease: [0.22, 1, 0.36, 1], delay },
        },
      };

  return (
    <span className={`${styles.titleLine}${className ? ` ${className}` : ""}`}>
      <motion.span className={styles.titleLineInner} variants={variants}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Editorial "who we are" chapter that follows the Press strip.
 *
 * A full-bleed, one-screen maroon card split near-evenly at the midline:
 * the big "ABOUT US" display title rules the top-left (difference-blended
 * over the video, each line rising in behind a mask like the Hero
 * wordmark), a quiet est. meta sits top-right, the statement copy +
 * Read More CTA hold the minor column's vertical centre (≈column 7 of
 * the mockup's 12-column grid), and the founder's portrait anchors
 * bottom-left on column 2 — drifting on its own parallax and straddling
 * the card's lower edge onto the cream band below.
 */
export default function AboutIntro() {
  return (
    <section className={styles.section} data-nav-theme="dark" data-cursor="glass">
      <div className={styles.card}>
        {/* darkened video plays behind everything in the card — and, like
            the Locations video, drifts vertically inside the clipped card as
            the section scrolls through the viewport (Parallax's inset mode:
            the frame stays put, the over-scaled footage pans within it, so
            no edge is ever exposed); the scrim keeps the text highly legible */}
        <div className={styles.cardVideoLayer} aria-hidden>
          <Parallax inset fill speed={0.62}>
            <video
              className={styles.cardVideo}
              src="/videos/belly-hero.mov"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </Parallax>
        </div>
        <div className={styles.cardScrim} aria-hidden />

        {/* the est. meta holds the left column, level with the title's first
            line; the title and the copy stack down the right column */}
        <span className={styles.headMeta}>Est. 1987 — London</span>

        <motion.h2
          className={styles.title}
          initial="lineHidden"
          whileInView="lineShown"
          viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
        >
          <TitleLine>About</TitleLine>
          <TitleLine className={styles.titleLineUs} delay={0.08}>
            <em className={styles.titleItalic}>Us</em>
          </TitleLine>
        </motion.h2>

        {/* the statement column sits on the golden section of the card, with
            the CTA directly beneath it */}
        <div className={styles.body}>
          <div className={styles.copy}>
            <p>
              A family of London restaurants that carries deep culinary
              tradition with a distinctly{" "}
              <em className={styles.highlight}>modern voice</em> —{" "}
              <em className={styles.highlight}>Filipino at heart</em>,
              pan-Asian and Caribbean by kitchen.
            </p>
          </div>

          <Link
            href="/about"
            className={styles.cta}
            aria-label="Read about Maginhawa Group"
          >
            <span className={styles.ctaLabel}>Our story</span>
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
        </div>

      </div>
    </section>
  );
}
