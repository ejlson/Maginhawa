"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Fragment, useRef, useState } from "react";
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

/* ══════════ FOUR PICTURES, INSIDE THE SENTENCE ══════════
   At the user's instruction: a small photograph set INLINE in the display
   line, after "comfort.", "room", "meal" and "guest". Not a strip under the
   statement and not a background behind it — inside it, in the flow, so the
   sentence and its evidence are one object rather than a claim followed by
   proof.

   THE FOUR NOUNS ARE THE FOUR THE CLAIM ACTUALLY MAKES, which is why the
   pictures land there and not on an even stagger: comfort is what the name
   means, and a room, a meal and a guest are the three things the sentence
   promises it shapes. A picture after "quiet" or "shapes" would be
   decoration; these four are the sentence pointing at itself.

   ⚠️ THEY COME FROM public/images/manifesto AND THAT SET EXISTS FOR THIS.
   Four files, 27–45KB each, 133KB for the lot — already cut to web size,
   unlike the `ourrestaurants` prints beside them which run 210–500KB apiece
   and would be four times the weight of everything else on this chapter.
   `group-web.jpg` is also one of AboutSplit's three doors; reusing a
   photograph the reader meets again two chapters down is deliberate rather
   than lazy, and it is the only overlap.

   KEYED BY WORD INDEX, NOT BY WORD. Two of the anchors ("every") appear
   three times in the sentence and a string lookup would put a picture after
   all of them. The index is the position in WORDS, and the note beside each
   entry is the word it follows so a copy change is caught rather than
   silently moving a picture. */
/* ⚠️ THE SHAPE FOLLOWS THE PHOTOGRAPH, NOT A PATTERN. The frames are
   `background-size: cover`, so an aspect the source does not have is a
   centre crop with the rest thrown away — and three of these four are wide
   compositions that do not survive one:
     belly-web      240×360  PORTRAIT natively (2:3 exactly)
     cafemama-web   360×202  16:9
     group-web      360×240  a ROW OF FOUR STAFF — a portrait crop keeps two
     mamasons-web   360×240  a counter running the full width of the frame
   So the mix is one portrait against three landscape rather than an even
   split. Making a second one portrait means re-cropping or re-shooting that
   source, not changing this flag — do that first and then set it here. */
/* ══════════ W1: ONE PLATE, NOT FOUR CHIPS ══════════
   The four INLINE images (mamasons / belly / cafemama / group, set into
   the sentence after comfort / room / meal / guest) are retired with the
   poster setting, chosen by the user from the Word study. The statement is
   caps at display scale now, and pictures riding inside capital letters
   read as stickers at any size — the poster's grammar is ONE photograph,
   centred between the claim and its consequences, given real plate
   ceremony. group-web is the one that stays: the claim is about people,
   and it is the picture with the family in it. */
const PLATE = { src: "/images/manifesto/group-web.jpg" };

const PIECES = WORDS.map((word) => ({ kind: "word" as const, word }));

const KEY_WORDS = new Set(["comfort", "quiet", "welcome"]);

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
/* ⚠️ THE EYEBROW ELEMENT IS RETIRED — the poster setting (W1, chosen by
   the user) moves its job INTO the typography: the dictionary annotation
   beside the first word says "this is a word, and here is everything that
   follows" without a caption saying so. The two long arguments above about
   what the eyebrow was for are kept because the JOB survives; only the
   furniture changed. */

/* ══════════════════ THE ENTRANCE ══════════════════
   IT IS SCROLL-SCRUBBED AGAIN, at the user's instruction. The sentence sets
   itself under the reader's hand: the eyebrow inks in first, then the words
   rise out of their masks in a wave as the chapter comes up the screen.

   ⚠️ THIS REVERSES A DECISION THIS FILE ARGUED AT LENGTH, so the argument
   is kept rather than deleted — it names two real costs, and only one of
   them has been answered.

     · "A SCRUBBED SENTENCE IS NEVER FINISHED. Stop scrolling halfway and it
       stays halfway, indefinitely." That was true of the version this
       replaces and it is NOT true here, and the difference is the mapping
       rather than the technique. The old scrub ran across the sentence's
       whole time on screen, so its resting position WAS a partial state —
       which is why that entrance had to be a bare opacity fade with a
       measured 0.55 floor: any gesture whose half-way state is a defect (a
       word standing off its baseline, a half-open letterspacing) was
       unavailable. This one finishes at `center center` — the moment the
       chapter is centred in the window, i.e. the position a reader stops
       at — and `useTransform` clamps past its range, so the sentence is
       fully set for the whole of the time anyone is actually reading it.
       That is what buys back the masked rise: the words can travel again,
       because nothing is left ragged at rest.
     · "IT MADE THE SENTENCE'S DELIVERY A FUNCTION OF SCROLL SPEED. A fast
       reader got the whole line at once; a slow one got it word by word
       over several seconds." THIS COST IS REAL AND IS NOT ANSWERED. It is
       inherent to scrubbing and it is the trade being made deliberately.

   WHAT ELSE THE SCRUB COSTS: the eyebrow's SPRING. It popped 0.88 → 1 at
   zeta ≈ 0.5, the only spring pop on the page — and a spring driven off
   scroll fights the wheel on the way back up, which is the objection that
   killed the previous scrub's springs too. It is a plain scrubbed scale and
   fade now. Nothing else about the gesture has changed: the words still
   travel 110% out of `.wordMask`, still with no opacity on them, for the
   reasons written on SPAN and on the mask itself. (The SIGN of that 110%
   has since flipped — they come down rather than up — which is a direction,
   not a mechanism; see the note on ScrubWord.)

   AND IT IS NOT PER-LINE. Every earlier scrub measured where each word
   landed and re-rendered the sentence as one block PER LINE so each line
   could own a slice of scroll — a resize listener, a null first pass that
   had to match the server output or hydration would mismatch, and a layout
   effect to swap the two before paint. This scrubs per WORD against one
   progress value, so the sentence stays a paragraph: no measurement, no
   re-render on resize, no dual render path, and the wrap is whatever the
   browser decides. */

/* THE SCRUB WINDOW. Progress 0 is the chapter's top edge arriving at the
   bottom of the window; progress 1 is the chapter CENTRED in it.
   `center center` and not `end start`: the sentence has to be finished by
   the time the reader is looking straight at it, and the section is a full
   screen tall, so this maps the whole reveal onto the ~one screen of scroll
   that brings the chapter into place and leaves the next screen — the
   reading position — at a clamped, finished state. */
const SCRUB_OFFSET: ["start end", "center center"] = [
  "start end",
  "center center",
];

/* THE WAVE'S SHAPE, and the two numbers are a pair.
   BAND is the slice of the scrub the words occupy: it starts after the
   eyebrow has inked and stops just short of 1, so the last word lands
   fractionally before the chapter settles rather than exactly on it.
   ⚠️ "AFTER THE EYEBROW HAS INKED" IS NOW LITERALLY TRUE. BAND_START was
   0.1 against an eyebrow finishing at 0.15, so the first three words were
   already climbing out of their masks while the line introducing them was
   still arriving — the two gestures read as one event, and the eyebrow lost
   the only job it has, which is to be READ FIRST. The band now opens after
   the eyebrow is fully set, with a beat of clear scroll between them.
   SPAN is how much of the scrub ONE word takes to travel. The stagger falls
   out of them — (band − span) / (words − 1) — so a longer sentence spreads
   rather than overflowing, which a hardcoded stagger could not do.

   SPAN IS 10× THE STAGGER AT TWENTY WORDS, and that ratio is the whole
   feel: about ten words are in flight at any moment, so the reveal reads as
   one wave crossing the sentence and never as a queue of individual events.
   The timed version this replaces had the same property by a different
   route (0.75s travel against a 0.045s stagger, ≈ 16 in flight). Shorten
   SPAN and the words start arriving one at a time. */
/* BAND_START AT 0.18 — derived, once, as the eyebrow's end plus a beat.
   The eyebrow is retired (see above) but the number stays: it is now
   simply the breath of clear scroll before the first word inks, and every
   slot in the chapter is seated off it. Nothing reads EYEBROW_IN any more;
   re-derive from taste, not from a ghost. */
const BAND_START = 0.18;
const BAND_END = 0.96;

/* ══════════ THE WAVE RESTARTS AT THE FULL STOP ══════════
   The copy is TWO sentences — "Maginhawa is Tagalog for comfort." and then
   what that costs — and until now the motion did not know it: one unbroken
   stagger ran the name and the promise together as a single event, so the
   line's own full stop counted for nothing. It now lands as its own gesture,
   with a beat of clear scroll after it, which is the same device BAND_START
   already uses to make the eyebrow read before the sentence.

   THE BREAK IS DERIVED FROM THE COPY, NOT COUNTED OFF IT. The first piece
   whose word ends in a full stop closes clause one, and any picture standing
   immediately after it belongs to the clause it illustrates. Rewrite the
   sentence and the break moves; hard-code the index and it silently splits
   the wrong phrase. */
const CLAUSE_BREAK = (() => {
  const i = PIECES.findIndex((p) => /[.!?]["')\]]?$/.test(p.word));
  return i < 0 ? PIECES.length - 1 : i;          // one sentence: no break
})();

/* the pause. 0.06 against the eyebrow's 0.03 — twice the beat, because this
   one closes a sentence rather than introducing one. */
const CLAUSE_BEAT = CLAUSE_BREAK < PIECES.length - 1 ? 0.06 : 0;

/* ⚠️ SPAN AND STAGGER ARE NOW SOLVED, NOT SET, and the thing being held
   constant is the FEEL. About fourteen pieces in flight at any moment is
   what makes this read as one wave crossing the sentence rather than as a
   queue of arrivals — that ratio has survived every rewrite of this file and
   is the one number worth stating.

   Splitting the band means paying for a span TWICE (each clause needs one)
   plus the beat, so the same stagger no longer fits: keeping SPAN at 0.27
   would have forced the stagger down to 0.0072 and put ~37 pieces in flight,
   which is the wave flattening into a single simultaneous lift — exactly the
   failure the note above warns about. Solving both from the ratio instead:

       band − beat = 2·SPAN + (pieces − 2)·STAGGER,   SPAN = 14·STAGGER

   gives STAGGER ≈ 0.0136 and SPAN ≈ 0.190 at 27 pieces. Each clause runs at
   the SAME speed, which is the whole point — a shorter clause spreading its
   own six pieces across a proportional band would visibly race the longer
   one. Add a word and everything above re-solves. */
const IN_FLIGHT = 14;
const STAGGER =
  (BAND_END - BAND_START - CLAUSE_BEAT) /
  (PIECES.length - 2 + 2 * IN_FLIGHT);
const SPAN = IN_FLIGHT * STAGGER;
const CLAUSE_ONE_END = BAND_START + SPAN + CLAUSE_BREAK * STAGGER;

/* the eyebrow's own slice, ahead of the first word — it introduces the
   sentence, so it has to be readable before the sentence starts writing.
   Nothing else may open before this closes: see BAND_START. */
/* the plate takes the clause beat: it settles in the pause between the
   claim and its consequences, which is the beat CLAUSE_BEAT has always
   held open. (W1's dictionary annotation stood beside the first word for
   one draft and was removed at the user's instruction — the claim runs
   clean from MAGINHAWA to the full stop.) */
const PLATE_IN: [number, number] = [CLAUSE_ONE_END, CLAUSE_ONE_END + 0.1];
const PLATE_SETTLE: [number, number] = [CLAUSE_ONE_END, CLAUSE_ONE_END + 0.2];

/* ══════════ THE ACCENTS INK LAST ══════════
   comfort / quiet / welcome hold the statement's own maroon all the way
   through the wave and warm to the accent only once the last piece has
   landed — the sentence naming what it is about after it has finished
   saying it, which is the move "restaurants" makes one chapter up
   (Discover.module.css, `.titleRise[data-lit]`).

   ⚠️ IT WAS NOT A GESTURE BEFORE, IT WAS A FACT. The three words simply
   arrived already green, so the emphasis was a label the reader met at the
   same moment as the word rather than a conclusion the line reaches. Same
   three words, same colour, same italic; only WHEN moved.

   THE THRESHOLD IS BAND_END BY DERIVATION, not a number that happens to look
   like it — "after everything has stopped" is exactly "after the band", and
   the last piece's slot does end there (0.770 + SPAN = 0.960).

   ⚠️ AND IT IS A LATCH, NOT A SCRUBBED VALUE. Driving the colour off the
   scrub the way everything else here is driven was the obvious build and it
   is measurably wrong: the scroll left after BAND_END is 0.04 of a range
   that spans about 860px at 1440×900, i.e. THIRTY-FIVE PIXELS, less than a
   third of one wheel notch. The warm completed inside a single frame of
   input and read as a snap. Crossing the threshold flips a boolean instead
   and CSS takes 0.8s over it whatever the reader's wheel is doing — which is
   also exactly what "restaurants" does one chapter up, on the same curve.
   It is the only piece of React state in the sentence, it changes at most
   once per crossing, and it drives a class rather than a style. */
const INK_AT = BAND_END;

/* THE SLOT ARITHMETIC, SHARED BY WORDS AND PICTURES. Pulled out of
   <ScrubWord> when the pictures joined the series: both call it, and a
   second copy is a second chance for the two to drift out of step.

   `total` is gone from the signature — the stagger is solved above from the
   whole sentence, so a slot is a position in the wave and nothing else. */
function slotStart(index: number) {
  const second = index > CLAUSE_BREAK;
  const base = second ? CLAUSE_ONE_END + CLAUSE_BEAT : BAND_START;
  const k = second ? index - CLAUSE_BREAK - 1 : index;
  return base + k * STAGGER;
}

/* ══ ScrubImage IS RETIRED WITH THE INLINE CHIPS ══ It clipped each of
   the four pictures open inside the sentence (inset bottom 100 → 0 through
   a template'd MotionValue). The ONE plate the poster setting keeps takes
   the page's settle instead — opacity + 1.06 → 1 — driven inline in the
   component, because a single element needs no abstraction. Its two
   portable notes: framer cross-fades inset() strings only by parsing them
   per frame (template one number instead), and next/image's positioned box
   fights an inline mask's line box (background-image sizes in em and adds
   no elements). */

function ScrubWord({
  progress,
  index,
  word,
}: {
  progress: MotionValue<number>;
  index: number;
  word: string;
}) {
  const start = slotStart(index);
  /* ══════════ THE WORDS INK NOW — THEY NO LONGER TRAVEL ══════════

     This ran a masked rise for a long time (−110% → 0 through .wordMask's
     clip, later re-signed to descend at the user's instruction), and the
     travel is deleted at the motion crit's Finding 01. The fault was never
     the pacing — reading along with the wheel is the chapter's best idea —
     it was the SHEAR: for the whole of each word's slot the sentence had no
     baseline, a line of display type caught with every word at a different
     height, exactly while the eye is on it. None of the editorial
     benchmarks animates type per-word, and The Gentlewoman's masthead has
     never moved at all. The scrub clock survives whole: same slotStart,
     same SPAN, same clause beat, same wave — only the verb changed.

     THE FLOOR IS 0.14, NOT 0. At zero the sentence assembles from nothing
     and the reader cannot see where it is going; at 0.14 the whole
     statement is present as a ghost of itself and the scrub INKS it in,
     word by word — a line being typeset rather than a line arriving. 0.14
     composites maroon-on-cream to ~1.3:1, well under the 3:1 floor this
     project holds any real mark to, so the ghost reads as tone, not text,
     and cannot be mistaken for the settled state.

     NO TRANSFORM AT ALL — not a token 2px settle. One verb per element is
     the rule the rest of this pass enforces on the page; opacity is the
     verb here. The mask element stays (it carries the accent class and the
     ink latch's colour hook, and its clip now clips nothing) so the DOM
     and the stylesheet's cascade are untouched. */
  const opacity = useTransform(progress, [start, start + SPAN], [0.14, 1]);

  /* TWO ELEMENTS PER WORD STILL: the mask carries the accent class (the
     box that grows to fit an italic's overhang, and the box the ink latch
     colours), the inner span carries the fade. Nothing about the accent is
     decided here: see INK_AT and `.key` in the stylesheet. */
  return (
    <span className={`${styles.wordMask} ${wordClass(word)}`}>
      <motion.span className={styles.word} style={{ opacity }}>
        {word}
      </motion.span>
    </span>
  );
}

/**
 * The positioning statement: the display line across the full measure, with
 * the band of photographs beneath it sharing the same screen.
 *
 * The words ink into place, staggered along the scroll, as the sentence
 * is read. Reduced motion renders it static and fully inked.
 */
export default function Manifesto() {
  const reduce = useReducedMotion();

  /* THE ONE PROGRESS VALUE THE WHOLE SENTENCE READS. Measured on the
     SECTION rather than on the block, because the section is the full
     screen and the offsets above are written against its edges.
     ⚠️ IT IS A MotionValue, NOT STATE. Nothing here re-renders as the
     reader scrolls: the words' transforms are driven straight off it, so
     a twenty-word sentence costs one subscription and no React work. */
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: SCRUB_OFFSET,
  });
  /* THE INK LATCH — the sentence's one piece of state, and the only thing on
     this chapter that is not a pure function of scroll position. It flips
     when the wave finishes and back when the reader scrolls above it again,
     so the accent is consistent with everything else here: reversible, and
     owned by where the page is. See INK_AT for why this is not a scrubbed
     value like its neighbours. */
  const [lit, setLit] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const on = v >= INK_AT;
    setLit((was) => (was === on ? was : on));
  });

  /* the poster's two satellites: the plate settles in the clause beat, the
     annotation inks last. Single elements, driven inline — no abstraction
     for one consumer. */
  const plateOpacity = useTransform(scrollYProgress, PLATE_IN, [0, 1]);
  const plateScale = useTransform(scrollYProgress, PLATE_SETTLE, [1.06, 1]);

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
  /* the word run, split at the clause for the poster's two registers: the
     claim at full display scale, the consequences in small caps under the
     plate. One arithmetic (slotStart over the whole array) spans both, so
     the scrub reads straight through the plate's beat. */
  /* ⚠️ THE CLAIM'S BREAK IS AUTHORED, at the user's instruction:
     "MAGINHAWA IS" is line one, "TAGALOG FOR COMFORT." line two. A <br>
     after index 1 rather than two separate spans, so the words stay one
     run for selection and the scrub's arithmetic. aria-hidden on the
     break is unnecessary — the h2's aria-label already reads the plain
     sentence over all of this. On narrow screens line two may wrap once
     more; it wraps as whole words and never shears. */
  const renderWord = (piece: (typeof PIECES)[number], i: number) => (
    <Fragment key={i}>
      {reduce ? (
        <span className={wordClass(piece.word)}>{piece.word}</span>
      ) : (
        <ScrubWord progress={scrollYProgress} index={i} word={piece.word} />
      )}
      {i === 1 ? <br /> : i < PIECES.length - 1 ? " " : null}
    </Fragment>
  );
  const bigWords = PIECES.slice(0, CLAUSE_BREAK + 1).map(renderWord);
  const smallWords = PIECES.slice(CLAUSE_BREAK + 1).map((p, k) =>
    renderWord(p, k + CLAUSE_BREAK + 1),
  );

  return (
    <section
      className={styles.section}
      /* everything inside this chapter that hides itself for an entrance is
         restored by the <noscript> block in app/layout.tsx — see the note on
         the attribute in components/Reveal.tsx */
      data-entrance="scope"
      data-nav-theme="light"
      ref={sectionRef}
    >
      <div className={styles.inner}>
        {/* TYPE ONLY — no eyebrow, no label. The sentence names the group in
            its own first word, and a label asking the question the line
            immediately answers is furniture. */}
        {/* ══ THE POSTER (W1) ══ One h2, two registers: the claim at full
            display scale, the consequences in small caps — with the plate
            between them INSIDE the heading, as a presentational span, so
            the sentence stays one accessible object (aria-label reads it
            plainly; every visual child is decoration to AT).

            NO `whileInView` AND NO VARIANTS ANYWHERE IN HERE: every moving
            part reads the section's scroll progress directly, so the
            poster's state is a pure function of where the page is. The
            still branch is the FINISHED poster, accent, plate and
            annotation included. */}
        <div className={styles.block}>
          <h2
            className={styles.statement}
            aria-label={STATEMENT}
            data-lit={reduce ? "on" : lit ? "on" : undefined}
          >
            <span className={styles.statementBig}>{bigWords}</span>
            <span className={styles.plateSeat} aria-hidden>
              {reduce ? (
                <span
                  className={styles.plate}
                  style={{ backgroundImage: `url(${PLATE.src})` }}
                />
              ) : (
                <motion.span
                  className={styles.plate}
                  style={{
                    backgroundImage: `url(${PLATE.src})`,
                    opacity: plateOpacity,
                    scale: plateScale,
                  }}
                />
              )}
            </span>
            <span className={styles.statementSmall}>{smallWords}</span>
          </h2>
        </div>
      </div>

      {/* ══ THE BAND IS GONE, at the user's instruction ══
          <StoryStrip> was rendered here — a marquee of eight photographs on
          the bottom edge under a row of three small marks ("London",
          "Maginhawa", "Est. 1987") — and it was rendered HERE rather than as
          its own chapter in Experience because it shared this screen: claim
          in the middle, evidence beneath it, both visible at once. Two
          sections cannot divide one viewport between them without one
          knowing the other's height, so the chapter owned both halves.
          It owns one half now, and the statement takes the whole screen.

          ⚠️ THE MARKS WENT WITH IT AND THEY WERE NOT DECORATION — each was
          sourced (1987 and Camden from /about's structured data, London from
          the group's own city). Nothing else on this page prints them. If
          they are wanted back, they are three strings in StoryStrip.tsx,
          which is still in the tree and is now rendered by nobody. */}
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
