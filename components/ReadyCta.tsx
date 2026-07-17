"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./ReadyCta.module.css";
import Reveal from "./Reveal";

// The closing line, typed on letter-by-letter — 16 characters including
// the two word spaces and the full stop. Split at render time; the spaces
// become their own spans so each one holds a stagger beat without visibly
// animating (white-space: pre keeps the browser from collapsing them).
const CLOSING_LINE = "starts with you.";

/* ---- type-on variants ---------------------------------------------- */

// the run owns the orchestration only: ~45ms/char left→right, with a short
// hold after the h2's trigger fires so the line doesn't jump the Reveal.
// 0.15 + 15 × 0.045 + 0.16 lands the last flap just under a second.
const runVariants: Variants = {
  lineHidden: {},
  lineShown: {
    transition: { staggerChildren: 0.045, delayChildren: 0.15 },
  },
};

// one letter locking in — the Loader's split-flap pop, verbatim: the cell
// swings up from a baseline hinge (rotateX -78° → 0) while fading in.
// Opacity starts at 0 (not the Loader's 0.4) because these letters begin
// absent rather than mid-cycle.
const charVariants: Variants = {
  lineHidden: { transform: "rotateX(-78deg)", opacity: 0 },
  lineShown: {
    transform: "rotateX(0deg)",
    opacity: 1,
    transition: { duration: 0.16, ease: [0.2, 0.7, 0.3, 1] },
  },
};

// spaces participate in the stagger count (they ARE the beat between
// words) but carry no visible change of their own
const spaceVariants: Variants = {
  lineHidden: {},
  lineShown: {},
};

/**
 * The italic line's letter-by-letter type-on — each character locks in
 * with the Loader's MGNHW flap pop. The in-view trigger lives on the
 * parent h2; the run and its letters inherit the variant switch through
 * framer's propagation (plain DOM elements in between don't break it).
 * The animated run is aria-hidden with an .srOnly twin so screen readers
 * hear one clean sentence, not sixteen fragments. Reduced motion skips
 * the split entirely — the whole string fades in once, mirroring the old
 * masked-line fallback.
 */
function TypeOnLine() {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <motion.span
        variants={{
          lineHidden: { opacity: 0 },
          lineShown: {
            opacity: 1,
            transition: { duration: 0.4, ease: "easeOut", delay: 0.14 },
          },
        }}
      >
        {CLOSING_LINE}
      </motion.span>
    );
  }

  return (
    <>
      <span className={styles.srOnly}>{CLOSING_LINE}</span>
      <motion.span className={styles.charRun} variants={runVariants} aria-hidden>
        {CLOSING_LINE.split("").map((ch, i) =>
          ch === " " ? (
            <motion.span
              key={i}
              className={styles.titleSpace}
              variants={spaceVariants}
            >
              {ch}
            </motion.span>
          ) : (
            <motion.span
              key={i}
              className={styles.titleChar}
              variants={charVariants}
            >
              {ch}
            </motion.span>
          )
        )}
      </motion.span>
    </>
  );
}

/**
 * Ready-to-join CTA — a full-breath cream moment after the Open-Roles
 * Index: the invitation at display scale (second line in the italic
 * serif inflection, typed on with the Loader's flap pop), one
 * soft-recessed pill beneath leading to the careers page. Nothing else
 * shares the stage.
 */
export default function ReadyCta() {
  return (
    <section
      className={styles.section}
      data-nav-theme="light"
      aria-label="Join the Maginhawa family"
    >
      <Reveal className={styles.inner}>
        {/* the h2 owns the in-view trigger; the type-on letters pick the
            variant switch up through framer's propagation. Line 1 doesn't
            animate on its own — it simply arrives with the outer Reveal. */}
        <motion.h2
          className={styles.title}
          initial="lineHidden"
          whileInView="lineShown"
          viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
        >
          <span className={styles.titleLine}>The next great service</span>
          <em className={styles.titleItalic}>
            <TypeOnLine />
          </em>
        </motion.h2>

        <Link href="/join-us" className={styles.pill}>
          <span className={styles.pillLabel}>Join Us</span>
          <svg
            className={styles.pillArrow}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </Reveal>
    </section>
  );
}
