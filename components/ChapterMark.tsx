"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./ChapterMark.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Editorial chapter furniture: a hairline rule that draws in, with the
 * chapter index (the page's ONE saffron device) on the left and a
 * small-caps runner on the right. Purely decorative — hidden from the
 * accessibility tree; the real heading follows in the section.
 */
export default function ChapterMark({
  index,
  label,
}: {
  index: string;
  label: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className={styles.mark} aria-hidden>
      <motion.span
        className={styles.rule}
        initial={reduce ? false : { transform: "scaleX(0)" }}
        whileInView={reduce ? undefined : { transform: "scaleX(1)" }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.span
        className={styles.row}
        initial={reduce ? false : { opacity: 0 }}
        whileInView={reduce ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
      >
        <span className={styles.index}>{index}</span>
        <span className={styles.label}>{label}</span>
      </motion.span>
    </div>
  );
}
