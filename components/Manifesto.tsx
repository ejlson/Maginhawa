"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Fragment } from "react";
import StoryStrip from "./StoryStrip";
import styles from "./Manifesto.module.css";

/* ══════════ THE SENTENCE NOW SAYS WHAT THE NAME MEANS ══════════
   It has been through three versions. The first described the category
   ("a vibrant Filipino and pan-Asian collective of restaurants, cafés and
   parlours in the heart of London") — every clause a fact a directory
   already carries, doing its persuading with "vibrant", which every
   restaurant group on earth calls itself. The second stated a priority
   ("a family first, and a restaurant group second") — a real claim, but
   one any family-run group could make word for word.

   THIS ONE CANNOT BE SAID BY ANYONE ELSE, because it is about the name.
   "Maginhawa" is Tagalog for comfortable, and the line turns that into the
   group's actual promise: the room before the food.

   IT IS NOT NEW COPY — it is the group's own established framing, lifted
   from the standfirst already written in app/lab/type/plaster/page.tsx
   ("The word is Tagalog for comfortable, and it is a promise about the room
   before it is a promise about the food"). Using the site's existing voice
   rather than inventing a fourth one, and putting it where the page's
   opening statement belongs instead of leaving it in a throwaway lab
   route. */
const WORDS = [
  "Maginhawa",
  "is",
  "Tagalog",
  "for",
  "comfort.",
  "A",
  "quiet",
  "idea",
  "that",
  "shapes",
  "every",
  "room",
  "we",
  "create,",
  "every",
  "meal",
  "we",
  "serve,",
  "and",
  "every",
  "guest",
  "we",
  "welcome.",
];

/* THE ACCENT: the two words the claim turns on. "comfortable" is what the
   name means; "room" is the thing being promised, and the whole point of
   the sentence is that it comes before the food. Deliberately still TWO —
   five accented words of twenty is most of the sentence, and an accent on
   most of a sentence is not an accent. Deliberately NOT "Maginhawa": it
   opens the line and carries the full weight of the display size already,
   and colouring it as well would make the first word shout twice.
   The lookup strips trailing punctuation (see wordClass), so "comfortable."
   matches on "comfortable" — which is the entire reason that exists. */
/* "promise" WAS ASKED FOR AND IS NOT IN THE COPY. The request named
   "comfort" and "promise"; the replacement sentence supplied in the same
   message drops "promise" entirely ("A quiet idea that shapes every room we
   create…"). "quiet" takes the second emphasis instead — it is the word
   that characterises the idea, and it is the only other word in the line
   carrying an argument rather than a mechanism. Say the word and it moves. */
const KEY_WORDS = new Set(["comfort", "quiet"]);

/** the class list for one word. Shared so the static and animated passes
    cannot drift apart on it. */
function wordClass(word: string) {
  const bare = word.replace(/[^\p{L}\p{M}-]+$/u, "");
  return KEY_WORDS.has(bare) ? `${styles.word} ${styles.key}` : styles.word;
}

/** the accessible name — the sentence, plainly */
const STATEMENT = WORDS.join(" ");

/* ══════════ THE EYEBROW: WHAT THIS ACTUALLY IS ══════════
   A small descriptor over the display line, the way the reference sets
   "Real estate developers and managers" over its statement.

   IT IS NOT DECORATION — it repairs a gap the new statement opened. The
   sentence below is a BELIEF ("a promise about the room before it is a
   promise about the food"), which is the right register for a manifesto and
   is also, on its own, unreadable as a business. A first-time visitor
   landing on this screen would learn that a Tagalog word means comfortable
   and nothing whatsoever about restaurants. Every earlier version of the
   statement carried that load itself, which is exactly why they read as
   category descriptions rather than as claims.

   Splitting the two jobs is what lets both be good: the eyebrow says what
   the group is in one plain line, and the sentence is then free to say
   something only this group could say. The masthead under the photographs
   completes it — where, who, when.

   IT NOW INTRODUCES THE SENTENCE RATHER THAN CATEGORISING THE GROUP. It
   read "Filipino, Filipino-Japanese and Caribbean kitchens" — a plain
   descriptor, chosen because the statement is a belief and something on the
   screen had to say what the business is. That job is now done elsewhere on
   the page: the masthead under the photographs says London and Est. 1987,
   the story split below opens "A London family, cooking since 1987", and
   the restaurants chapter sits directly above. With the what-is-it covered
   three times over, this line is free to do the thing an eyebrow does best
   — pose the question the display line answers. */
/* It read "What our name asks of us" — a question posed as a label, which
   made the display line beneath it read as the answer to a quiz. This is a
   statement of the same shape as the sentence it introduces: one word, then
   its consequences, which is exactly the structure of "Maginhawa is Tagalog
   for comfort. A quiet idea that shapes every room…". */
const EYEBROW = "One word, and everything that follows";

/* ══════════════════ THE ENTRANCE ══════════════════
   IT PERFORMS ONCE, ON ARRIVAL. It does not track the wheel.

   WHAT THIS REPLACES, and why the change is a real improvement rather than
   a restyle. Every previous version was SCROLL-SCRUBBED, line by line: the
   sentence set itself under the reader's hand, each line owning a slice of
   scroll. That produced two problems the design kept working around.

     · A SCRUBBED SENTENCE IS NEVER FINISHED. Stop scrolling halfway and it
       stays halfway, indefinitely. That is why the previous entrance had to
       be a bare opacity fade with a measured 0.55 floor: any animation
       whose partial state is a DEFECT — a word standing off its baseline, a
       half-open letterspacing — was unavailable, because a partial state
       was a resting state. The floor was a constraint the technique imposed,
       not a feature.
     · IT MADE THE SENTENCE'S DELIVERY A FUNCTION OF SCROLL SPEED. A fast
       reader got the whole line at once; a slow one got it word by word
       over several seconds. A statement should read the same way to
       everybody.

   Triggered once on entry, the words can travel — they lift into place as
   they ink in — because the animation is guaranteed to COMPLETE. Nothing is
   ever left ragged, so nothing has to be legible mid-flight.

   The old objection to whileInView does not apply here. The reason the
   scrub replaced a timeline of staggered SPRINGS was that a spring driven
   off scroll fights the wheel on the way back up. This is not scroll-linked
   at all: it fires once and runs on its own clock. */
const EASE_ENTRANCE = [0.22, 1, 0.36, 1] as const;

/* TWO LEVELS OF STAGGER, because the block has two kinds of child.
   `staggerChildren` only ever applies to DIRECT children, so the outer
   block sequences [eyebrow, statement] and the statement then sequences its
   own twenty words. Variants cascade by name through both levels, so one
   `whileInView` on the block drives the whole cascade. */
const blockVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};

const eyebrowVariants: Variants = {
  hidden: { y: "40%", opacity: 0 },
  shown: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.6, ease: EASE_ENTRANCE },
  },
};

const statementVariants: Variants = {
  hidden: {},
  shown: {
    transition: {
      /* 0.045s × 20 words = ~0.9s from first word to last, over a 0.75s
         word — so the wave is always in flight across several words at
         once and never reads as a queue of individual events. */
      staggerChildren: 0.045,
      delayChildren: 0.06,
    },
  },
};

const wordVariants: Variants = {
  /* `y` IS A PERCENTAGE, NOT AN em. Framer resolves transform percentages
     against the element's OWN box, so 55% of a word's line box is a
     consistent fraction of the type size at every breakpoint — an em value
     would not resolve here, and a px value would be a different-sized lift
     at 2.4rem than at 5.2rem. */
  hidden: { y: "55%", opacity: 0 },
  shown: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.75, ease: EASE_ENTRANCE },
  },
};

/**
 * The positioning statement: the display line across the full measure, with
 * the band of photographs beneath it sharing the same screen.
 *
 * The words lift into place and ink in, staggered, once, when the sentence
 * arrives. Reduced motion renders it static and fully inked.
 */
export default function Manifesto() {
  const reduce = useReducedMotion();

  /* THE WORDS ARE SEPARATED BY REAL SPACES, not by margin.

     Every earlier version gave each word `margin-right: 0.24em` because the
     masks were inline-blocks with no whitespace between them. On a CENTRED
     paragraph that margin is not harmless: it rides on the last word of
     every line, widens the line box, and pushes the visible ink half a
     margin off the page's axis. The old code fixed that with a
     `:last-child` rule, which only worked because each line was its own
     block — and lines stopped being their own blocks when the per-line
     scrub was removed.

     A real space collapses at a line break, which is exactly the behaviour
     wanted, and it costs nothing. It also means the sentence is selectable
     and copies out as a sentence. */
  const words = WORDS.map((w, i) => (
    <Fragment key={i}>
      {reduce ? (
        <span className={wordClass(w)}>{w}</span>
      ) : (
        <motion.span className={wordClass(w)} variants={wordVariants}>
          {w}
        </motion.span>
      )}
      {i < WORDS.length - 1 ? " " : null}
    </Fragment>
  ));

  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.inner}>
        {/* TYPE ONLY — no eyebrow, no label. The sentence names the group in
            its own first word, and a label asking the question the line
            immediately answers is furniture. */}
        {reduce ? (
          <div className={styles.block}>
            <p className={styles.eyebrow}>{EYEBROW}</p>
            <h2 className={styles.statement} aria-label={STATEMENT}>
              {words}
            </h2>
          </div>
        ) : (
          <motion.div
            className={styles.block}
            variants={blockVariants}
            initial="hidden"
            whileInView="shown"
            /* ONCE. A statement that replays every time it re-enters the
               viewport turns the page's thesis into a loop. `amount: 0.35`
               waits until a third of the block is on screen, so it does not
               start while only the eyebrow has crept past the edge. */
            viewport={{ once: true, amount: 0.35 }}
          >
            <motion.p className={styles.eyebrow} variants={eyebrowVariants}>
              {EYEBROW}
            </motion.p>
            <motion.h2
              className={styles.statement}
              aria-label={STATEMENT}
              variants={statementVariants}
            >
              {words}
            </motion.h2>
          </motion.div>
        )}
      </div>

      {/* THE BAND SHARES THIS SCREEN, which is why it is rendered here
          rather than as its own chapter in Experience. The section is a
          full viewport tall, the statement is centred in whatever room is
          left above the band, and the band sits on the bottom edge — claim
          in the middle, evidence beneath it, both visible at once. Two
          sections cannot divide one viewport between them without one
          knowing the other's height, so the chapter owns both halves. */}
      <StoryStrip />
    </section>
  );
}

/* ══════════ WHAT WAS DELETED WITH THE SCRUB, recorded once ══════════
   `useLockedLines`, `ScrubLine`, `ScrubWord`, `windowFor`, `PART_SPAN`,
   `SCRUB_START`/`SCRUB_END`, `SCRUB_EASE` and `REST_INK` are all gone.

   useLockedLines measured where every word landed and re-rendered the
   sentence as one block PER LINE, so each line could own a slice of scroll.
   It carried a resize listener to re-take the measurement, a null first
   pass that had to render identically to the server output or hydration
   would mismatch, and a layout effect to swap the two before paint. All of
   it existed to serve per-line scrubbing. With the entrance on a single
   timeline the sentence is just a paragraph again: no measurement, no
   re-render on resize, no dual render path, and the wrap is whatever the
   browser decides — which is now free to differ between breakpoints without
   anything having to be re-locked. */
