"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./Manifesto.module.css";

// the site's shared enter curve — ease-out dominant, settles long
const EASE = [0.22, 1, 0.36, 1] as const;

// The statement as a STREAM of words and inline photographs — Telescope's
// image-in-headline move: each photo reads as one more "word" the sentence
// opens up to admit.
// `w` is the print's width in em of the display size; the height is fixed
// by .inlineImg, so w IS the shape. Mixed on purpose — two uprights, two
// landscapes and a square, so the line reads as photographs laid into a
// sentence rather than a row of identical chips.
/** how one print arrives once its slot has opened for it */
type Enter = "drop" | "slide" | "rise";
type StatementPart = string | { img: string; w: number; enter: Enter };

/* THREE prints, not five. Five put a picture on every line and turned a
   sentence into a contact sheet — the words stopped leading and the effect
   started repeating before it had finished being a surprise. Three sit one
   per line, each a different shape and each arriving a different way. */
const PARTS: StatementPart[] = [
  "A",
  "vibrant",
  "Filipino",
  { img: "/blog/DSC07739-web.jpg", w: 0.62, enter: "drop" }, // upright
  "and",
  "pan-Asian",
  "collective",
  "of",
  "restaurants,",
  "cafés",
  { img: "/blog/DSCF2296-web.jpg", w: 0.86, enter: "slide" }, // square
  "and",
  "parlours",
  { img: "/blog/DSCF3052-web.jpg", w: 1.5, enter: "rise" }, // landscape
  "in",
  "the",
  "heart",
  "of",
  "London.",
];

/* The two words that say WHAT this is and the one that says WHERE, lifted
   into the accent. Three of fifteen — any more and the emphasis stops being
   emphasis. `--saffron-ink`, not `--saffron`: the accent proper computes
   ~3.0:1 on the cream, which is a hair under the 3:1 large-text floor even
   at this size, while the ink clears 5.7:1 and reads unmistakably as the
   same colour. */
const KEY_WORDS = new Set(["Filipino", "pan-Asian", "London."]);

const STATEMENT = PARTS.filter((p) => typeof p === "string").join(" ");
// which print is this, counting only prints — its place in the cascade
const IMG_ORDER = new Map<number, number>();
PARTS.forEach((p, i) => {
  if (typeof p !== "string") IMG_ORDER.set(i, IMG_ORDER.size);
});
const imgOrder = (i: number) => IMG_ORDER.get(i) ?? 0;
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

const REVEAL_AT = 0.7;
// each print waits on the one before it — the sentence opens left to right
const REVEAL_GAP = 0.2;

/* THE SENTENCE OPENS TO ADMIT THE PHOTOGRAPHS.

   Every print's slot animates from zero width, so the words are genuinely
   pushed aside: the line re-sets itself around the pictures rather than the
   pictures fading into gaps that were always there.

   Width is a LAYOUT property, and animating it naively broke three things.
   A word sitting near a line end ("cafés") got shoved onto the next line
   mid-flight. The headline's own height changed, which pushed every section
   below it down the page while the reader was watching. And the server's
   markup carried no zero-width on the slots, so the prints flashed at full
   size before collapsing.

   All three are the same problem — the line breaks were free to move — so
   the breaks are LOCKED before anything animates. See `useLockedLines`.

   The spring is slow and CRITICALLY DAMPED — it decelerates the whole way
   and stops, with nothing carrying past. Words that overshoot their new
   positions and settle back read as elastic type, and three slots doing it
   at once reads as the line wobbling; the sentence should look like it is
   making room, deliberately, and then holding still. */
const OPEN_SPRING = { type: "spring" as const, duration: 1.2, bounce: 0 };

type PrintCue = { w: number; order: number; enter: Enter };

const slotVariants = {
  hidden: { width: "0em", marginRight: "0em", opacity: 0 },
  show: ({ w, order }: PrintCue) => {
    const delay = REVEAL_AT + order * REVEAL_GAP;
    return {
      width: `${w}em`,
      marginRight: "0.24em",
      opacity: 1,
      transition: {
        width: { ...OPEN_SPRING, delay },
        marginRight: { ...OPEN_SPRING, delay },
        // the print is already making room before it becomes visible, rather
        // than appearing and then shoving
        opacity: { duration: 0.5, ease: EASE, delay: delay + 0.14 },
      },
    };
  },
};

/* AND THEN THE PICTURE ARRIVES INTO THE SPACE.
   The slot opening and the photograph entering are two separate events, a
   beat apart: the sentence makes room, and only then is something put in
   it. Each print comes from a different edge of its own slot — one falls
   in, one is pushed in from the left behind the words it just moved, one
   rises — and each settles on its own spring, so three arrivals in one
   sentence never read as one mechanism running three times.

   Percentages are of the PRINT, and the slot clips, so 150% is always fully
   out of sight whatever the shape. No opacity here: the mask does the
   hiding, and a picture that fades as it travels reads as a slideshow
   rather than as something being placed. */
const ENTER_OFFSET: Record<Enter, { x?: string; y?: string }> = {
  drop: { y: "-150%" },
  slide: { x: "-130%" },
  rise: { y: "150%" },
};

/* No bounce on any of them — the difference between the three is DIRECTION
   and PACE, not springiness. A print that rebounds inside its own slot
   looks like it was dropped rather than placed. */
const ENTER_SPRING: Record<Enter, { duration: number; bounce: number }> = {
  // a fall covers its distance fastest and settles first
  drop: { duration: 1.05, bounce: 0 },
  // a lateral push carries furthest, so it takes the longest
  slide: { duration: 1.35, bounce: 0 },
  // coming up against its own weight — the slowest arrival of the three
  rise: { duration: 1.25, bounce: 0 },
};

// the beat between the slot opening and the print entering it
const PLACE_GAP = 0.12;

const printVariants = {
  hidden: ({ enter }: PrintCue) => ({ x: 0, y: 0, ...ENTER_OFFSET[enter] }),
  show: ({ enter, order }: PrintCue) => ({
    x: 0,
    y: 0,
    transition: {
      type: "spring" as const,
      ...ENTER_SPRING[enter],
      delay: REVEAL_AT + order * REVEAL_GAP + PLACE_GAP,
    },
  }),
};

/**
 * Group the statement's parts into the lines they will finally occupy.
 *
 * Returns null on the first pass. While it is null the headline renders
 * FLAT and OPEN — every slot at its final width, nothing animating — which
 * is both the layout we want to measure and exactly what the server sent,
 * so hydration matches and nothing flashes. The measurement runs in a
 * layout effect, i.e. before the browser paints, so the swap to the locked,
 * collapsed, animating version is never seen.
 *
 * Once locked, each line is its own block: a word cannot leave its line, the
 * line count cannot change, and therefore neither can the headline's height
 * or the position of anything below it.
 */
function useLockedLines(ref: React.RefObject<HTMLElement | null>, on: boolean) {
  const [lines, setLines] = useState<number[][] | null>(null);

  useLayoutEffect(() => {
    if (!on || lines !== null) return;
    const el = ref.current;
    if (!el) return;
    const parts = Array.from(
      el.querySelectorAll<HTMLElement>("[data-part]"),
    );
    if (!parts.length) return;
    const groups: number[][] = [];
    let lastTop: number | null = null;
    for (const node of parts) {
      const top = Math.round(node.getBoundingClientRect().top);
      // a new line box, not just a taller print on the same one
      if (lastTop === null || Math.abs(top - lastTop) > 6) {
        groups.push([]);
        lastTop = top;
      }
      groups[groups.length - 1].push(Number(node.dataset.part));
    }
    setLines(groups);
  }, [ref, on, lines]);

  // a resize re-wraps the sentence, so the lock has to be re-taken: drop
  // back to the flat pass and let the effect above measure again
  useEffect(() => {
    if (!on) return;
    const onResize = () => setLines(null);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [on]);

  return lines;
}

/**
 * The positioning statement directly under the hero: the display line
 * bottom-left across 8 columns — with five small photographs the sentence
 * opens up to admit — and the sans support sentence on the right. The words
 * build first (split-text), then the prints push them aside one at a time,
 * then the support line rises. Reduced motion renders everything static.
 */
export default function Manifesto() {
  const reduce = useReducedMotion();
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const lines = useLockedLines(h2Ref, !reduce);

  // one part — a word in its rising mask, or a print in its opening slot
  const part = (p: StatementPart, i: number, animated: boolean) => {
    if (typeof p === "string") {
      const cls = KEY_WORDS.has(p)
        ? `${styles.word} ${styles.key}`
        : styles.word;
      return (
        <span className={styles.wordMask} key={i} data-part={i} aria-hidden>
          {animated ? (
            <motion.span className={cls} variants={wordVariants}>
              {p}
            </motion.span>
          ) : (
            <span className={cls}>{p}</span>
          )}
        </span>
      );
    }
    /* The SLOT owns the width and the word-spacing margin — it is the
       thing that pushes the words. The photograph inside keeps its full
       size throughout and is simply revealed as the slot widens over it,
       so the picture never stretches. */
    const cue: PrintCue = { w: p.w, order: imgOrder(i), enter: p.enter };
    const img = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        className={styles.inlineImg}
        src={p.img}
        alt=""
        draggable={false}
        style={{ width: `${p.w}em` }}
      />
    );
    const cls = `${styles.wordMask} ${styles.imgMask}`;
    return animated ? (
      <motion.span
        className={cls}
        key={i}
        data-part={i}
        aria-hidden
        variants={slotVariants}
        custom={cue}
      >
        {/* the print carries its own `custom` — without it the child would
            inherit the slot's and every arrival would be the same one */}
        <motion.img
          className={styles.inlineImg}
          src={p.img}
          alt=""
          draggable={false}
          style={{ width: `${p.w}em` }}
          variants={printVariants}
          custom={cue}
        />
      </motion.span>
    ) : (
      // the measuring pass (and reduced motion): open at its final width
      <span
        className={cls}
        key={i}
        data-part={i}
        aria-hidden
        style={{ width: `${p.w}em`, marginRight: "0.24em" }}
      >
        {img}
      </span>
    );
  };

  // PASS ONE (and reduced motion): flat and open — what the server sent,
  // and the layout the lock is measured from.
  const flat = (
    <h2 ref={h2Ref} className={styles.statement} aria-label={STATEMENT}>
      {PARTS.map((p, i) => part(p, i, false))}
    </h2>
  );

  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.inner}>
        {reduce || lines === null ? (
          flat
        ) : (
          <motion.h2
            ref={h2Ref}
            className={styles.statement}
            aria-label={STATEMENT}
            variants={statementVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            {lines.map((group, li) => (
              // each line is its own block — this is the lock
              <span className={styles.line} key={li}>
                {group.map((i) => part(PARTS[i], i, true))}
              </span>
            ))}
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
