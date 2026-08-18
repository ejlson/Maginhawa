"use client";

import { Fragment, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import styles from "./Passage.module.css";

/* ══════════ THE HANDOVER, BETWEEN THE STORY AND THE JOURNAL ══════════
   Two lines of type on an otherwise empty screen, sitting between
   <AboutSplit> and <Blog>.

   WHAT IT IS FOR. The story split closes on who the group is — timeless,
   present tense, no date on it. The journal opens on "Stories, openings,
   and ideas", which is the opposite register: everything in it happened on
   a particular day. Those two chapters ran straight into each other with
   48px between them (AboutSplit's 12px gutter + Blog's 36px top), and the
   reader crossed from "this is who we are" to "here is what happened in
   February" without a beat. This is the beat, and the copy is written to
   carry exactly that turn: slow by nature, never actually still.

   IT IS NOT A SECOND MANIFESTO, and the line between the two is worth
   holding. The manifesto ASSERTS — it names the group and translates its
   name. This one only hands over; it introduces nothing and claims nothing,
   which is why it has no eyebrow, no label, no control and no picture. If
   it ever grows any of those it has become a chapter and should be argued
   for as one.

   ⚠️ DO NOT PUT THE WORD "COMFORT" IN HERE, or any translation of the
   group's name. Manifesto.tsx owns that sentence ("Maginhawa is Tagalog for
   comfort"), Hero.tsx deliberately declines to spend it early — "the hero
   shows the word, the Manifesto explains it" — and a third chapter touching
   it would be the third telling of a one-line idea. */

/* THE TWO LINES, as word arrays because the reveal is per word.
   They are an antithesis and the shape matters: the first line concedes the
   pace, the second refuses the conclusion a reader would draw from it. Read
   as one sentence they are the argument for putting a news feed under a
   family story. */
const LINE_A = ["We", "have", "never", "done", "anything", "quickly."];
const LINE_B = ["It", "has", "never", "once", "been", "quiet."];

/* ══════════ THE SCRUB ══════════
   Same mechanism as the manifesto's sentence — the reader's scroll is the
   clock, so the line assembles at whatever rate they are travelling and
   there is no timed animation to out-run. See Manifesto.tsx for the long
   version of why this is a MotionValue and not state.

   THE OFFSET IS NOT THE MANIFESTO'S. That one runs `start end → center
   center`, which finishes when the section reaches the middle of the
   screen; this section is SHORTER than a screen and has to finish while it
   is still fully visible, so it ends on `end center` — the last word lands
   as the section's bottom edge passes the middle. */
const SCRUB_OFFSET: ["start end", "end center"] = ["start end", "end center"];

/* SPAN IS DELIBERATELY WIDER THAN THE MANIFESTO'S 0.3.

   Span is how much of the scrub ONE word takes to travel, and the stagger
   falls out of it — (band − span) / (words − 1). A wider span means more
   words in flight at once and a slower-reading wave.

   The manifesto runs 0.3 across 24 pieces: stagger 0.024, about 12 in
   flight. Here the band is split between TWO lines of six, so a 0.3 span
   would give a stagger of 0.06 and put five words in flight — the words
   would start arriving one at a time, which is a queue, not a wave. 0.5
   restores roughly the manifesto's in-flight ratio on a much shorter line
   and is the whole of the "slower" instruction. */
const BAND_START = 0.06;
/* 0.86 AND NOT 0.94, and it was measured rather than picked. The scrub ends
   on `end center`, so progress 1 is the moment the section's bottom edge
   reaches the middle of the screen — by which point the second line has
   travelled to ~120px off the top of the viewport. Landing the last word
   there means it finishes just as it is about to leave. At 0.86 it lands
   with the line still ~300px down the screen, which is where a reader is
   actually looking. (scripts/probe-passage.mjs prints both numbers.) */
const BAND_END = 0.86;
const SPAN = 0.5;

/* The two lines share one band but do not overlap: line A takes the first
   58% of it and line B the rest, so the second line has not begun writing
   while the first is still assembling. The 0.04 seam between them is the
   pause a reader takes at a full stop. */
const LINE_A_END = 0.54;
const LINE_B_START = 0.58;

function slotStart(index: number, total: number, from: number, to: number) {
  const stagger = total > 1 ? (to - from - SPAN * (to - from)) / (total - 1) : 0;
  return from + index * stagger;
}

/* ONE HOOK PER WORD, WHICH IS WHY THIS IS A COMPONENT — `useTransform`
   cannot be called inside the `.map` that builds the line. Identical
   reasoning to <ScrubWord> in Manifesto.tsx. */
function Word({
  progress,
  start,
  span,
  word,
}: {
  progress: MotionValue<number>;
  start: number;
  span: number;
  word: string;
}) {
  /* 110%, NOT 100%: with a mask the word has to start fully BELOW its own
     clip or its top edge shows at rest. A percentage rather than an em
     because Framer resolves transform percentages against the element's own
     box, so it is the same fraction of the type size at every breakpoint.

     NO OPACITY. The clip is doing the reveal; fading as well makes the
     entrance mushy at the moment it should be crisp. */
  const y = useTransform(progress, [start, start + span], ["110%", "0%"]);

  return (
    <span className={styles.mask}>
      <motion.span className={styles.word} style={{ y }}>
        {word}
      </motion.span>
    </span>
  );
}

function Line({
  words,
  progress,
  from,
  to,
  reduce,
  className,
}: {
  words: string[];
  progress: MotionValue<number>;
  from: number;
  to: number;
  reduce: boolean;
  className: string;
}) {
  const span = SPAN * (to - from);

  /* THE WORDS ARE SEPARATED BY REAL SPACES, not by margin — a margin rides
     on the last word of every line and pushes the visible ink off the
     line's own axis, and a real space collapses at a wrap. It also means
     the line is selectable and copies out as a sentence. Same fix, same
     reason, as the note in Manifesto.tsx. */
  return (
    <p className={`${styles.line} ${className}`}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {reduce ? (
            <span className={styles.word}>{word}</span>
          ) : (
            <Word
              progress={progress}
              start={slotStart(i, words.length, from, to)}
              span={span}
              word={word}
            />
          )}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </p>
  );
}

export default function Passage() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: SCRUB_OFFSET,
  });

  /* THE ACCESSIBLE NAME IS THE TWO LINES AS ONE SENTENCE. Each word is its
     own inline-block inside its own mask, which a screen reader will happily
     read as six separate items; the aria-label collapses them back into the
     sentence a reader is meant to hear. The visible words stay in the DOM
     (rather than aria-hidden) so the text is still selectable and findable. */
  const spoken = `${LINE_A.join(" ")} ${LINE_B.join(" ")}`;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-nav-theme="light"
      aria-label={spoken}
    >
      <Line
        words={LINE_A}
        progress={scrollYProgress}
        from={BAND_START}
        to={LINE_A_END}
        reduce={!!reduce}
        className={styles.lineA}
      />
      <Line
        words={LINE_B}
        progress={scrollYProgress}
        from={LINE_B_START}
        to={BAND_END}
        reduce={!!reduce}
        className={styles.lineB}
      />
    </section>
  );
}
