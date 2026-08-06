"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./SplitWords.module.css";

/** A REAL SPACE between two masks, and nothing else.
 *
 *  The word gap is `margin-right: 0.24em` on the mask and has to stay there —
 *  it is the metric three callers' layouts were tuned against, and a natural
 *  space is a different width in every face. So the space contributes no
 *  advance at all (`.space` is font-size: 0) and exists purely so the block's
 *  text is words rather than one run. Same pixels, readable string.
 *
 *  Not emitted after the last word: the block would then end in trailing
 *  whitespace that a copy would carry, and `.mask:last-child` — which cancels
 *  the final gap — would stop matching. */
const Space = ({ last }: { last: boolean }) =>
  last ? null : (
    <span className={styles.space} aria-hidden>
      {" "}
    </span>
  );

/** Index of the first word of `em` inside `words`, or -1. Compares whole words
 *  and lets the phrase's LAST word match a prefix, so "served with heart"
 *  finds "…and served with heart." — see the `em` prop. */
const emWordStart = (words: string[], em?: string) => {
  if (!em) return -1;
  const needle = em.split(" ");
  outer: for (let i = 0; i + needle.length <= words.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      const isLast = j === needle.length - 1;
      const w = words[i + j];
      if (isLast ? !w.startsWith(needle[j]) : w !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
};

// the site's shared enter curve — ease-out dominant, settles long
const EASE = [0.22, 1, 0.36, 1] as const;
// the same curve for the CSS driver below — one shape, written twice because
// the two runtimes spell it differently and neither can read the other's form
const EASE_CSS = "var(--ease-entrance)";

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
 *
 * `css` swaps the RUNTIME without changing the animation. Same 145%, same
 * duration, same stagger, same curve — driven by a CSS keyframe and a class
 * instead of by Motion. It exists for one caller and for one measured reason:
 * the About deck keeps nine of these mounted at once and switches between
 * them mid-scroll, and Motion starting ~37 staggered child animations and
 * stopping ~37 more, on a frame the compositor is already scrubbing a 3D
 * deck, measured as a 49ms frame. A class toggle costs the main thread
 * nothing — the delays are `calc()` off each word's index and the whole
 * stagger runs on the compositor.
 *
 * It is opt-in rather than the default because the Motion path is the right
 * one for the ordinary case: a block that builds once when it scrolls into
 * view, where being interruptible and composable with the rest of a timeline
 * is worth more than the start cost. Only pass `css` with `on`.
 *
 * THE GAPS BETWEEN THE WORDS ARE REAL SPACES. They were a `margin-right` and
 * nothing else, which is correct typographically and left the block's TEXT as
 * one run: `textContent` on the About statement read
 * "MaginhawaisTagalogforcomfortable—alifeofease." and every deck body the
 * same. Copy-and-paste, find-in-page, text extraction and any AT that falls
 * back to content all saw that string — and the deck's whole justification for
 * being CSS 3D rather than a canvas is that its nine chapter bodies stay
 * readable to something that reads text. See `.space` in the stylesheet for
 * why the margin stays as well: the space carries the meaning and the margin
 * still carries the metrics, so nothing moved by a pixel.
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
  css,
  em,
  emClassName,
  maskClassName,
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
  /** drive the same animation from CSS rather than Motion — see above */
  css?: boolean;
  /** An exact phrase inside `text` whose words take `emClassName` — the
   *  About hero's "served with heart" is the only caller. Matched as a run of
   *  whole words rather than by index so a copy edit cannot silently emphasise
   *  the wrong ones; a phrase that is not found emphasises nothing, which is
   *  visible immediately rather than subtly wrong. Trailing punctuation stays
   *  with its word (`heart.` matches `heart`), because a lone full point in
   *  its own mask would carry the word gap in front of it and read as a typo. */
  em?: string;
  emClassName?: string;
  /** A class on EVERY mask, for a caller that has to change the clip itself.
   *
   *  `.mask` is `overflow: hidden`, i.e. both axes, which is right for the
   *  ordinary caller: body and heading copy has no ink outside its own advance
   *  widths, so the horizontal half of that clip never touches anything. It is
   *  wrong for display type. The About hero sets GROUP? in a swashed italic
   *  whose P overhangs its advance, and MAGINHAWA on a negative letter-space —
   *  both of which the horizontal clip shears at rest, permanently, long after
   *  the animation that needed the vertical one is over.
   *
   *  So that caller passes a class declaring `overflow: visible clip` and the
   *  window becomes vertical-only. (`visible` pairs legally with `clip` but
   *  not with `hidden`, which is why the rule cannot simply be relaxed here.)
   *  A class rather than a boolean prop because what the caller needs is a
   *  different clip, not a flag this component would have to name a policy
   *  for — and because the mask is also where `emClassName` already lands, so
   *  the plumbing exists. */
  maskClassName?: string;
}) {
  const reduce = useReducedMotion();
  /* THE PROMOTION IS DROPPED WHEN THE BLOCK HAS FINISHED BUILDING, and only
     on the `on`-driven Motion path.

     `.word`'s standing `will-change` is correct for the ordinary caller: a
     block that builds once when it scrolls into view holds its layers for a
     second and the page then scrolls past it. It is wrong for a block driven
     by a clock at the TOP of a long page — the About hero's kicker and lede
     are 27 words that finish in under three seconds and would then hold 27
     compositor layers over a pinned video for the remaining eleven thousand
     pixels. That is the same standing cost the `css` driver below exists to
     avoid for the deck's copy, arriving by a different door.

     Scoped to `driven` so nothing changes for whileInView callers, whose
     behaviour this component's own header already argues is right. One state
     flip per block, once, after everything has landed. */
  const [settled, setSettled] = useState(false);
  const Component = motion[Tag];

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ");
  const emFrom = emWordStart(words, em);
  const emTo = emFrom < 0 ? -1 : emFrom + em!.split(" ").length - 1;
  const classFor = (i: number) =>
    emClassName && i >= emFrom && i <= emTo ? emClassName : undefined;
  /** the mask's full class list — the shared clip, the caller's override of
   *  it, and the em run's own class, which has always landed here */
  const maskClass = (i: number) =>
    `${styles.mask} ${maskClassName ?? ""} ${classFor(i) ?? ""}`
      .replace(/\s+/g, " ")
      .trim();

  const driven = on !== undefined;

  if (driven && css) {
    return (
      <Tag
        className={`${className ?? ""} ${on ? styles.cssOn : ""}`}
        aria-label={text}
        style={
          {
            "--sw-dur": `${duration}s`,
            "--sw-delay": `${delay}s`,
            "--sw-stagger": `${stagger}s`,
          } as CSSProperties
        }
      >
        {words.map((word, i) => (
          <Fragment key={i}>
            <span className={maskClass(i)} aria-hidden>
              {/* THE RESTING STATE IS RISEN, not hidden, and the direction
                  matters. `.cssWord` alone is translateY(0) — where the word
                  belongs — and the animation only exists while the block is
                  `on`, running 145% -> 0 with `both` so the from-state holds
                  through the stagger delay. Written the other way round (rest
                  hidden, animate to shown) removing the class would SNAP every
                  word back down, which the caller's outgoing block would show
                  for the length of its fade. */}
              <span
                className={styles.cssWord}
                style={{ "--w": i } as CSSProperties}
              >
                {word}
              </span>
            </span>
            <Space last={i === words.length - 1} />
          </Fragment>
        ))}
      </Tag>
    );
  }
  return (
    <Component
      className={className}
      aria-label={text}
      initial="hidden"
      {...(driven
        ? {
            animate: on ? "show" : "hidden",
            onAnimationComplete: () => setSettled(true),
          }
        : {
            whileInView: "show",
            viewport: { once: true, amount },
          })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className={maskClass(i)} aria-hidden>
            <motion.span
              className={settled ? styles.wordRested : styles.word}
              variants={{
                // 145%, not ~110%: the clip window is padded taller than the
                // word's line box to protect descenders (see the stylesheet),
                // so the word has further to travel to clear it
                hidden: { transform: "translateY(145%)" },
                show: {
                  transform: "translateY(0%)",
                  transition: { duration, ease: EASE },
                },
              }}
            >
              {word}
            </motion.span>
          </span>
          <Space last={i === words.length - 1} />
        </Fragment>
      ))}
    </Component>
  );
}
