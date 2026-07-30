"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./PressWall.module.css";
import { FEATURED_OUTLETS } from "@/lib/press";

// shared enter curve — the same rise the other chapters use
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "As Seen In" — the press credential after the About story: the label
 * centred, then the full masthead set in justified rows underneath. Each
 * hand-set row stretches edge to edge of the chapter's span, so the stack
 * reads as one set block rather than a ragged pile. Rows rise in once
 * with a short stagger; nothing else moves.
 */

// Hand-set rows — 4–5 marks each, mixing wide and compact wordmarks so no
// row bunches. DETERMINISTIC (no measurement, no Math.random): server and
// client render identical markup. Names must match FEATURED_OUTLETS
// entries; each seat's `s` multiplies the outlet's canonical `scale`.
const ROWS: { name: string; s: number }[][] = [
  [
    { name: "The Sunday Times", s: 1.25 },
    { name: "Michelin Guide", s: 1.1 },
    { name: "Evening Standard", s: 1.1 },
    { name: "Forbes", s: 1.15 },
    { name: "Time Out", s: 0.95 },
  ],
  [
    { name: "The Guardian", s: 1.3 },
    { name: "BBC Good Food", s: 0.95 },
    { name: "Metro", s: 1.05 },
    { name: "The Infatuation", s: 1.0 },
    { name: "Country & Townhouse", s: 0.9 },
  ],
  [
    { name: "The Week", s: 1.25 },
    { name: "The Independent", s: 1.35 },
    { name: "Hypebeast", s: 0.85 },
    { name: "That's Up", s: 0.8 },
  ],
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
        whileInView={reduce ? undefined : { opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        As Seen In
      </motion.h2>

      <div className={styles.rows}>
        {ROWS.map((row, r) => (
          <motion.ul
            key={r}
            className={styles.logoRow}
            initial={
              reduce ? false : { opacity: 0, transform: "translateY(14px)" }
            }
            whileInView={
              reduce ? undefined : { opacity: 1, transform: "translateY(0px)" }
            }
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: EASE, delay: r * 0.07 }}
          >
            {row.map((seat) => {
              const outlet = FEATURED_OUTLETS.find(
                (o) => o.name === seat.name,
              );
              if (!outlet?.logo) return null;
              return (
                <li
                  key={seat.name}
                  className={styles.logoSeat}
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
                    alt={outlet.name}
                    draggable={false}
                  />
                </li>
              );
            })}
          </motion.ul>
        ))}
      </div>
    </section>
  );
}
