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
   carry exactly that turn — see the note on LINE_A for which pair is in
   and why.

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

   THE SHAPE IS AN ANTITHESIS AND IT IS DOING THE WORK: the first line
   concedes something, the second refuses the conclusion a reader would draw
   from it. Read as one sentence they are the argument for putting a news
   feed under a family story — which is the only reason this section exists.

   WHY THESE WORDS. The antithesis turns on a single elided verb — "The city
   has [changed]" — so the two lines are one sentence a reader finishes
   themselves, which is why the second can be four words long.

   IT IS GROUNDED IN COPY THE SITE ALREADY OWNS. "Recipes carried down rather
   than researched" is AboutIntro's phrase for the same idea, so the first
   line is the group's established claim rather than a new one. And it does
   not contradict the chapter above it the way a broader line would: "the
   same family, still led by Chef Omar" is the story's own claim, so a line
   saying everything ELSE has changed would be arguing with it. The city
   changing around a kitchen that didn't leaves both claims standing.

   IT POINTS WHERE THE JOURNAL ACTUALLY POINTS. <Blog>'s feed is largely
   London press — Time Out, MyLondon, Ham & High, Kentishtowner, the Observer
   — so "the city" is not an oblique gesture; it is the subject of most of
   the entries underneath it.

   Two earlier pairs, for the record: "We have never done anything quickly." /
   "It has never once been quiet." made the turn but made it about the
   group's pace; "Hardly any of this makes the papers." / "Some of it does."
   was about press specifically and read a shade too knowing.

   ⚠️ THE SECOND LINE IS SHORT ON PURPOSE. It is the one that lands on
   Blog's left edge (see .lineB), and a four-word line there points down into
   the chapter head; a second full-measure block would compete with it.

   ⚠️ DO NOT put the word "comfort" here, or any translation of the group's
   name. Manifesto.tsx owns that sentence and Hero.tsx deliberately declines
   to spend it early — see the header note.

   ALTERNATES, kept because copy is the cheapest thing on this page to change
   and each of these makes the same turn from a different angle. Swap both
   arrays together; they are a pair, not two independent lines.
     · ["Hardly", "any", "of", "this", "makes", "the", "papers."]
       ["Some", "of", "it", "does."]
     · ["We", "have", "never", "done", "anything", "quickly."]
       ["It", "has", "never", "once", "been", "quiet."]
     · ["We", "are", "not", "very", "good", "at", "standing", "still."]
       ["Here", "is", "what", "that", "looks", "like."]
   ⚠️ KEEP THE SECOND LINE UNDER ~24 CHARACTERS. That is one row on the
   measure (16ch resolves to ~390px at 1440, and this face sets ~16px per
   character at 46px), and the one-row landing is load-bearing — see the note
   below on why line B is short. */
const LINE_A = ["The", "recipes", "have", "not", "changed."];
const LINE_B = ["The", "city", "has."];

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
  /* 130%, AND IT IS DERIVED FROM THE MASK'S PADDING RATHER THAN CHOSEN.

     The mask pads 0.06em top and 0.22em bottom to keep `overflow: hidden`
     from clipping descenders and italic overhang, and `overflow` clips at
     the PADDING box — so the clip is 0.28em taller than the word, with
     0.22em of that slack at the bottom, which is the exact direction a word
     travels from. Measured at 1440: mask 60.8px against a 47.9px word.

     At 110% the word travelled 52.7px into a 58.1px window and sat ~5px
     inside the clip at rest, and every intermediate position leaked more —
     a word part-way up showed BELOW its own line instead of being cut by
     it, which reads as broken type rather than as a reveal.

     The arithmetic: the word must clear (line-height + both pads − top pad)
     = 1.04 + 0.28 − 0.06 = 1.26em, against its own 1.04em box → 121%. 130%
     is that with a margin. SplitWords derives its 145% from a 0.3em pad the
     same way; if the padding on .mask changes, re-derive this.

     A PERCENTAGE AND NOT AN em because Framer resolves transform
     percentages against the element's own box, so it stays the same
     fraction of the type size at every breakpoint.

     NO OPACITY. The clip is doing the reveal; fading as well makes the
     entrance mushy at the moment it should be crisp. */
  const y = useTransform(progress, [start, start + span], ["130%", "0%"]);

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
