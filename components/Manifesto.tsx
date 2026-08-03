"use client";

import {
  cubicBezier,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./Manifesto.module.css";

// the site's shared enter curve — ease-out dominant, settles long. The
// scrub needs it as a FUNCTION (a bezier tuple is a transition shorthand,
// which useTransform does not take), so it is built once here.
const EASE = [0.22, 1, 0.36, 1] as const;
const SCRUB_EASE = cubicBezier(0.22, 1, 0.36, 1);

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
  { img: "/images/manifesto/group-web.jpg", w: 1.5, enter: "drop" }, // upright
  "and",
  "pan-Asian",
  "collective",
  "of",
  "restaurants",
  { img: "/images/manifesto/belly-web.jpg", w: 1, enter: "rise" }, // square
  ", cafés",
  { img: "/images/manifesto/cafemama-web.jpg", w: 0.86, enter: "slide" }, // square
  "and",
  "parlours",
  { img: "/images/manifesto/mamasons-web.jpg", w: 1.5, enter: "rise" }, // landscape
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
const SUPPORT =
  "Explore our family of restaurants and stores, where tradition is served with a modern twist.";

/* ============================ THE SCRUB ============================
   THE READER'S HAND SETS THE SENTENCE, ONE LINE AT A TIME.

   Each locked line owns its own scroll range, and that range OPENS when the
   line reaches the middle of the screen: progress 0 is the line's centre on
   the viewport's centre, progress 1 is that centre a third of a screen
   higher. So the top line is already set while the last is still closed,
   and the sentence composes itself down the page under the reader's hand
   rather than playing a timeline at them once.

   This replaces a whileInView timeline of staggered springs. The springs
   are gone entirely — a scrubbed value must be a pure function of scroll or
   it fights the wheel on the way back up. */
/* BOTH ENDS MOVED TOGETHER, which is the difference between "earlier" and
   "slower". The offsets are `targetPoint containerPoint`, and the container
   point runs 0 at the top of the viewport to 1 at the bottom — so a LARGER
   number is lower on screen, and therefore sooner as the reader comes down
   the page.

   The start was `center center`: nothing happened until a line's centre had
   climbed all the way to the middle of the screen, which is late — the line
   is fully in view and has been sitting there closed for a third of a screen
   by then. It now opens at 0.68, roughly a fifth of a viewport earlier.

   The end moves by the SAME 0.18 rather than staying put. Holding it would
   have stretched each line's range from 0.32 of a screen to 0.50 and made the
   whole sentence set more slowly under the same hand — a different change
   from the one asked for. Shifted together, the travel is identical and only
   the onset moves. */
const SCRUB_START = "center 0.68";
const SCRUB_END = "center 0.36";

/** how much of a line's range one part takes to complete */
const PART_SPAN = 0.55;

/** the window inside [0,1] that part `i` of `n` runs in */
function windowFor(i: number, n: number): [number, number] {
  if (n <= 1) return [0, PART_SPAN];
  const step = (1 - PART_SPAN) / (n - 1);
  const from = i * step;
  return [from, from + PART_SPAN];
}

/* AND THEN THE PICTURE ARRIVES INTO THE SPACE.
   The slot opening and the photograph entering are two events, a beat
   apart: the sentence makes room, and only then is something put in it.
   Each print comes from a different edge of its own slot — one falls in,
   one is pushed in from the left behind the words it just moved, one rises.

   Percentages are of the PRINT, and the slot clips, so 150% is always fully
   out of sight whatever the shape. No opacity on the print itself: the slot
   does the hiding, and a picture that fades as it travels reads as a
   slideshow rather than as something being placed. */
const ENTER_OFFSET: Record<Enter, { x: string; y: string }> = {
  drop: { x: "0%", y: "-150%" },
  slide: { x: "-130%", y: "0%" },
  rise: { x: "0%", y: "150%" },
};

/** the beat between a slot opening and its print being placed in it */
const PLACE_GAP = 0.3;

/** one word, rising out of its own clip as the line is scrubbed */
function ScrubWord({
  p,
  at,
  word,
}: {
  p: MotionValue<number>;
  at: [number, number];
  word: string;
}) {
  // 130% (not ~110%) because the mask's clip window is padded taller than
  // the word's own line box to protect descenders — see .wordMask
  const y = useTransform(p, at, ["130%", "0%"], { clamp: true, ease: SCRUB_EASE });
  return (
    <span className={styles.wordMask} aria-hidden>
      <motion.span
        className={
          KEY_WORDS.has(word) ? `${styles.word} ${styles.key}` : styles.word
        }
        style={{ y }}
      >
        {word}
      </motion.span>
    </span>
  );
}

/** one print: the slot opens to push the words aside, then the picture is
    placed into the space the slot just made */
function ScrubPrint({
  p,
  at,
  part,
}: {
  p: MotionValue<number>;
  at: [number, number];
  part: { img: string; w: number; enter: Enter };
}) {
  const [from, to] = at;
  const span = to - from;
  /* QUANTISED, AND THAT IS THE WHOLE FIX FOR THE SCROLL STALL.

     `width` and `marginRight` are LAYOUT properties and they are the point —
     the slot has to physically open in the text flow so the sentence makes
     room for the photograph rather than the photograph appearing on top of
     it. That cannot become a transform without losing the effect.

     What it can stop being is CONTINUOUS. Driven straight off the scrub these
     produced a new sub-pixel value every frame, and every one of them
     reflowed the paragraph — which re-lays-out every word mask in the
     sentence, the same masks the scrub is writing transforms to on that frame.
     Profiled over the section at 1440: worst frame 530.3ms, seven frames past
     50ms. (The Discover section next door, which drives only transforms and
     opacity, measured zero frames past 32ms over the same sweep.)

     A layout only happens when the value actually CHANGES, so rounding to a
     step the eye cannot resolve cuts the reflow count by roughly the ratio of
     the step to a pixel. 0.04em is ~2.6px at this display size — invisible on
     a growing edge mid-scroll, and it takes the paragraph from reflowing every
     frame to reflowing about twenty times across the whole open.

     The margin is quantised on its own, finer scale: it only ever travels
     0.24em, so it needs a smaller step to stay smooth, and it is one value
     for the whole run rather than per-print. */
  const QUANTUM = 0.04;
  const widthEm = useTransform(p, at, [0, part.w], {
    clamp: true,
    ease: SCRUB_EASE,
  });
  const width = useTransform(
    widthEm,
    (v) => `${Math.round(v / QUANTUM) * QUANTUM}em`,
  );
  const marginEm = useTransform(p, at, [0, 0.24], {
    clamp: true,
    ease: SCRUB_EASE,
  });
  const marginRight = useTransform(
    marginEm,
    (v) => `${Math.round(v / 0.02) * 0.02}em`,
  );
  // the print is already making room before it becomes visible, rather than
  // appearing and then shoving
  const opacity = useTransform(p, [from + span * 0.2, from + span * 0.6], [0, 1], {
    clamp: true,
  });
  const place: [number, number] = [from + span * PLACE_GAP, to];
  const off = ENTER_OFFSET[part.enter];
  const x = useTransform(p, place, [off.x, "0%"], { clamp: true, ease: SCRUB_EASE });
  const y = useTransform(p, place, [off.y, "0%"], { clamp: true, ease: SCRUB_EASE });

  return (
    <motion.span
      className={`${styles.wordMask} ${styles.imgMask}`}
      aria-hidden
      style={{ width, marginRight, opacity }}
    >
      <motion.img
        className={styles.inlineImg}
        src={part.img}
        alt=""
        draggable={false}
        style={{ width: `${part.w}em`, x, y }}
      />
    </motion.span>
  );
}

/** one locked line, and its own scroll range */
function ScrubLine({ group }: { group: number[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [SCRUB_START, SCRUB_END],
  });
  const n = group.length;
  return (
    <span className={styles.line} ref={ref}>
      {group.map((i, k) => {
        const part = PARTS[i];
        const at = windowFor(k, n);
        return typeof part === "string" ? (
          <ScrubWord key={i} p={scrollYProgress} at={at} word={part} />
        ) : (
          <ScrubPrint key={i} p={scrollYProgress} at={at} part={part} />
        );
      })}
    </span>
  );
}

/**
 * Group the statement's parts into the lines they will finally occupy.
 *
 * Returns null on the first pass. While it is null the headline renders
 * FLAT and OPEN — every slot at its final width, nothing animating — which
 * is both the layout we want to measure and exactly what the server sent,
 * so hydration matches and nothing flashes. The measurement runs in a
 * layout effect, i.e. before the browser paints, so the swap to the locked,
 * collapsed, scrubbed version is never seen.
 *
 * Once locked, each line is its own block: a word cannot leave its line, the
 * line count cannot change, and therefore neither can the headline's height
 * or the position of anything below it. That is also what makes the slot
 * widths safe to drive from scroll — see ScrubPrint.
 */
function useLockedLines(ref: React.RefObject<HTMLElement | null>, on: boolean) {
  const [lines, setLines] = useState<number[][] | null>(null);

  useLayoutEffect(() => {
    if (!on || lines !== null) return;
    const el = ref.current;
    if (!el) return;
    const parts = Array.from(el.querySelectorAll<HTMLElement>("[data-part]"));
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
 * bottom-left across 8 columns — with three small photographs the sentence
 * opens up to admit — and the sans support sentence on the right.
 *
 * The whole headline is SCROLL-SCRUBBED, line by line: each line starts
 * setting itself when it reaches the middle of the screen, its words rising
 * out of their clips and its print pushing them aside, all at whatever pace
 * the reader is moving. Reduced motion renders everything static and open.
 */
export default function Manifesto() {
  const reduce = useReducedMotion();
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const lines = useLockedLines(h2Ref, !reduce);

  // PASS ONE (and reduced motion): flat and open — what the server sent,
  // and the layout the lock is measured from.
  const flat = (
    <h2 ref={h2Ref} className={styles.statement} aria-label={STATEMENT}>
      {PARTS.map((p, i) =>
        typeof p === "string" ? (
          <span className={styles.wordMask} key={i} data-part={i} aria-hidden>
            <span
              className={
                KEY_WORDS.has(p) ? `${styles.word} ${styles.key}` : styles.word
              }
            >
              {p}
            </span>
          </span>
        ) : (
          <span
            className={`${styles.wordMask} ${styles.imgMask}`}
            key={i}
            data-part={i}
            aria-hidden
            style={{ width: `${p.w}em`, marginRight: "0.24em" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.inlineImg}
              src={p.img}
              alt=""
              draggable={false}
              style={{ width: `${p.w}em` }}
            />
          </span>
        ),
      )}
    </h2>
  );

  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.inner}>
        {reduce || lines === null ? (
          flat
        ) : (
          <h2 className={styles.statement} aria-label={STATEMENT}>
            {lines.map((group, li) => (
              <ScrubLine group={group} key={li} />
            ))}
          </h2>
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
