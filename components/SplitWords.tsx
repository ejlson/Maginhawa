"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./SplitWords.module.css";

// the site's shared enter curve — ease-out dominant, settles long
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The page's word-mask split text, in one place.
 *
 * This is the grammar the statement under the hero speaks ("A vibrant
 * Filipino…"): every word rises out of its own overflow-hidden clip on a
 * short stagger, so a line assembles itself rather than fading on. It was
 * written three separate times — in Manifesto, in Discover's caption lines
 * and again in Discover's headings — before it was asked for in two more
 * places, so it lives here now.
 *
 * Transform strings (not `y`) on purpose: a full transform can run off the
 * main thread, and these are often several lines of copy at once.
 *
 * `whileInView` by default; pass `on` to drive it from a clock instead (the
 * restaurant chapter's intro sequence does this — an observer there would be
 * racing the step machine).
 */
export default function SplitWords({
  text,
  as: Tag = "p",
  className,
  delay = 0,
  stagger = 0.04,
  duration = 0.75,
  amount = 0.6,
  on,
}: {
  text: string;
  as?: "p" | "h2" | "h3" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** how much of the block must be on screen before it builds */
  amount?: number;
  /** drive from a clock rather than the viewport; omit for whileInView */
  on?: boolean;
}) {
  const reduce = useReducedMotion();
  const Component = motion[Tag];

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  const driven = on !== undefined;
  return (
    <Component
      className={className}
      aria-label={text}
      initial="hidden"
      {...(driven
        ? { animate: on ? "show" : "hidden" }
        : {
            whileInView: "show",
            viewport: { once: true, amount },
          })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {text.split(" ").map((word, i) => (
        <span className={styles.mask} key={i} aria-hidden>
          <motion.span
            className={styles.word}
            variants={{
              // 130%, not ~110%: the clip window is padded taller than the
              // word's line box to protect descenders (see the stylesheet),
              // so the word has further to travel to clear it
              hidden: { transform: "translateY(130%)" },
              show: {
                transform: "translateY(0%)",
                transition: { duration, ease: EASE },
              },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Component>
  );
}
