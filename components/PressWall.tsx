"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./PressWall.module.css";
import { FEATURED_OUTLETS } from "@/lib/press";

// shared enter curve — the same rise the other chapters use
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "As Seen In" — the press credential after the About story: a quiet label
 * over ONE continuously drifting line of mastheads. A single lane rather
 * than a stacked wall: this is a credential, not a chapter, and three rows
 * of it competed with the story above for weight it does not need. The line
 * fades out at both ends, so marks dissolve in and out instead of being cut
 * by an edge.
 */

// One lane, in a hand-set order that mixes wide and compact wordmarks so the
// line never bunches. DETERMINISTIC (no measurement, no Math.random): server
// and client render identical markup. Names must match FEATURED_OUTLETS
// entries; each seat's `s` multiplies the outlet's canonical `scale`.
const LANE: { name: string; s: number }[] = [
    { name: "The Sunday Times", s: 1.25 },
    { name: "Michelin Guide", s: 1.1 },
    { name: "Evening Standard", s: 1.1 },
    { name: "Forbes", s: 1.15 },
    { name: "Time Out", s: 0.95 },
    { name: "The Guardian", s: 1.3 },
    { name: "BBC Good Food", s: 0.95 },
    { name: "Metro", s: 1.05 },
    { name: "The Infatuation", s: 1.0 },
    { name: "Country & Townhouse", s: 0.9 },
    { name: "The Week", s: 1.25 },
    { name: "The Independent", s: 1.35 },
    { name: "Hypebeast", s: 0.85 },
  { name: "That's Up", s: 0.8 },
];

export default function PressWall() {
  const reduce = useReducedMotion();

  return (
    <section
      className={styles.section}
      aria-label="As seen in"
      data-nav-theme="dark"
    >
      <motion.h2
        className={styles.label}
        initial={reduce ? false : { opacity: 0 }}
        whileInView={reduce ? undefined : { opacity: 0.45 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        As Seen In
      </motion.h2>

      <motion.div
        className={styles.lane}
        initial={reduce ? false : { opacity: 0, transform: "translateY(14px)" }}
        whileInView={
          reduce ? undefined : { opacity: 1, transform: "translateY(0px)" }
        }
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        {/* The track holds the line TWICE and travels exactly -50%, so the
            moment it wraps, the copy that has scrolled off the left is
            sitting precisely where the original was — no seam, no jump. The
            second copy is aria-hidden: it is the same mastheads again, and a
            screen reader should hear the list once. */}
        <ul className={styles.track}>
          {[0, 1].map((copy) =>
            LANE.map((seat) => {
              const outlet = FEATURED_OUTLETS.find((o) => o.name === seat.name);
              if (!outlet?.logo) return null;
              return (
                <li
                  key={`${copy}-${seat.name}`}
                  className={styles.logoSeat}
                  aria-hidden={copy === 1}
                  style={
                    {
                      "--s": seat.s * (outlet.scale ?? 1),
                    } as React.CSSProperties
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.logo}
                    src={outlet.logo}
                    alt={copy === 0 ? outlet.name : ""}
                    draggable={false}
                  />
                </li>
              );
            }),
          )}
        </ul>
      </motion.div>

    </section>
  );
}
