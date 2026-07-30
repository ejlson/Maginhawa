"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./Manifesto.module.css";

// the site's shared enter curve — ease-out dominant, settles long
const EASE = [0.22, 1, 0.36, 1] as const;

// The statement as a STREAM of words and inline photographs — Telescope's
// image-in-headline move, three times over: each photo reads as one more
// "word" that rises out of its own mask with the rest of the line.
type StatementPart = string | { img: string };
const PARTS: StatementPart[] = [
  "A",
  "vibrant",
  "Filipino",
  { img: "/blog/DSC07739-web.jpg" },
  "and",
  "pan-Asian",
  "collective",
  "of",
  "restaurants,",
  { img: "/images/belly.jpg" },
  "cafés",
  "and",
  "parlours",
  { img: "/blog/DSCF2995-web.jpg" },
  "in",
  "the",
  "heart",
  "of",
  "London.",
];
const STATEMENT = PARTS.filter((p) => typeof p === "string").join(" ");
const SUPPORT =
  "Explore our family of restaurants and stores, where tradition is served with a modern twist.";

// word-mask split-text: the parent orchestrates a stagger and each word
// rises out of its own overflow-hidden line box. Full transform strings so
// the rises run hardware-accelerated (WAAPI), never on the main thread.
const statementVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const wordVariants = {
  // 130% (not ~110%) because the mask's clip window is padded taller than
  // the word's own line box to protect descenders — see .wordMask
  hidden: { transform: "translateY(130%)" },
  show: {
    transform: "translateY(0%)",
    transition: { duration: 0.75, ease: EASE },
  },
};

/* the inline photograph as a split-text "word" — same mask, same rise */
function InlineWordImage({ src, animated }: { src: string; animated: boolean }) {
  return (
    <span className={styles.wordMask} aria-hidden>
      {animated ? (
        <motion.span className={styles.word} variants={wordVariants}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.inlineImg}
            src={src}
            alt=""
            draggable={false}
          />
        </motion.span>
      ) : (
        <span className={styles.word}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.inlineImg}
            src={src}
            alt=""
            draggable={false}
          />
        </span>
      )}
    </span>
  );
}

/**
 * The positioning statement directly under the hero: the display line
 * bottom-left across 8 columns — with three small photographs sitting
 * INLINE in the sentence (the pasteboard image-in-headline move) — and the
 * sans support sentence on the right. The statement builds word by word
 * (split-text, the photos included), then the support line rises once it
 * has landed. Reduced motion renders everything static.
 * (The scattered-print pasteboard now lives on the Discover section's
 * intro stage, around the "Our Restaurants." title.)
 */
export default function Manifesto() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.inner}>
        {reduce ? (
          <h2 className={styles.statement} aria-label={STATEMENT}>
            {PARTS.map((p, i) =>
              typeof p === "string" ? (
                <span className={styles.wordMask} key={i} aria-hidden>
                  <span className={styles.word}>{p}</span>
                </span>
              ) : (
                <InlineWordImage key={i} src={p.img} animated={false} />
              ),
            )}
          </h2>
        ) : (
          <motion.h2
            className={styles.statement}
            aria-label={STATEMENT}
            variants={statementVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            {PARTS.map((p, i) =>
              typeof p === "string" ? (
                <span className={styles.wordMask} key={i} aria-hidden>
                  <motion.span className={styles.word} variants={wordVariants}>
                    {p}
                  </motion.span>
                </span>
              ) : (
                <InlineWordImage key={i} src={p.img} animated />
              ),
            )}
          </motion.h2>
        )}

        <motion.p
          className={styles.support}
          initial={reduce ? false : { opacity: 0, transform: "translateY(24px)" }}
          whileInView={
            // settles at the stylesheet's resting 0.8, not full white-hot 1
            reduce ? undefined : { opacity: 0.8, transform: "translateY(0px)" }
          }
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
        >
          {SUPPORT}
        </motion.p>
      </div>
    </section>
  );
}
