"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import styles from "./Passage.module.css";

/* ══════ THE HANDOVER, BETWEEN THE PRESS WALL AND THE BOOKING FILM ══════
   Four rows of type on an otherwise empty screen, sitting between
   <PressWall> and <Reservations>.

   ⚠️ IT WAS BUILT FOR A DIFFERENT SLOT. It sat between <AboutSplit> and
   <Blog> and existed to cover a change of REGISTER: the story split closed
   on who the group is, present tense with no date on it, and the journal
   opened on "Stories, openings, and ideas", where everything happened on a
   particular day. Those two ran into each other across 48px. It has been
   moved, and that seam is now Blog's own problem again — see the note above
   <Blog /> in Experience.tsx.

   WHAT IT IS FOR HERE IS A BIGGER TURN THAN THE ONE IT WAS BUILT FOR.
   Above it the mastheads are the page's last piece of EVIDENCE — other
   people's words about the group. Below it <Reservations> is the page's
   only TRANSACTION. This is the beat between being told about the group and
   being asked to book it, and it is the last thing the page says in its own
   voice. The copy fits that turn: rows A and B concede the group is several
   different rooms, row C answers that they hold one standard — exactly the
   claim a reader wants answered immediately before a booking form — and row
   D ("So…") is not a statement at all, it is the sentence that walks the
   reader over the seam into the booking film. See ROW_D below.

   ⚠️ ITS BOX IS ENTIRELY DERIVED FROM ITS NEIGHBOURS and all four paddings
   were re-measured when it moved. Passage.module.css owns that arithmetic
   and each number names the section it was measured against. Move this and
   both seams move with it.

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

/* ══════════ THE COPY, IN FOUR ROWS ══════════

   ⚠️ THE COPY IS THE USER'S AND IT HAS CHANGED SEVERAL TIMES. Treat the
   arrays as the current answer, not as a resting place. The alternates at
   the foot of this block are a record of what has stood here, in no order
   of preference.

   THE ROW BREAK IS A DECISION, NOT A WRAP. Rows A and B are ONE sentence,
   broken after "rooms," so the two "seven"s land at opposite margins —
   which is what makes the repetition read as structure rather than as a
   stumble. That break is the whole point of the setting, so it cannot be
   left to a measure: each row is its own array, sets `white-space: nowrap`,
   and wraps nowhere. There used to be a measure here (`max-width: 16ch`,
   later an 18ch guard on the landing) whose one job was deciding where the
   line broke; the rows are authored now, so there is nothing left for a
   measure to decide and both are gone — see the note on .line in
   Passage.module.css, which also carries the measured proof that every row
   clears the viewport at 390 without one.

   THE SHAPE IS ACCUMULATION THEN LANDING, and it replaced an antithesis.
   The old two-line setting ran "The recipes have not changed." / "The city
   has." — two concessions of equal weight turning on an elided verb. This
   copy does something the chapter under it needs more: the first sentence
   PILES UP — a count and then the same count again, a list that gets longer
   as it writes — and row C STOPS it. "But" is doing real work there: it is
   the hinge, and it is why row C reads as an answer rather than as a third
   line of the list. The mark's seat (MARK_ON) and the scrub's bands are
   both derived from that asymmetry.

   WHY THESE WORDS. "Seven different rooms" is literal: the group is seven
   rooms that genuinely do not look or read alike, and pretending otherwise
   would be contradicted by <Discover> further up, where the tiles are
   visibly different places. Conceding that up front is what buys the third
   row its authority — "But only one standard." is only worth saying to a
   reader who has just been told the rooms differ.

   IT IS GROUNDED IN COPY THE SITE ALREADY OWNS. AboutSplit's claim is "the
   same family, still led by Chef Omar" — a single hand over several rooms —
   so row C is that claim in the group's own terms rather than a new one.
   <Reservations>, directly below, opens on "Seven rooms. Different
   worlds.", so the pair is the same count in the same voice as the section
   it hands to, one screen earlier.

   ROW D IS A HAND-OFF, NOT A FOURTH STATEMENT. <Reservations>'s every line
   is centred on the page axis ("Where will you start?" — Reservations.tsx),
   so "So…" is centred too: the one seat that POINTS at the heading rather
   than merely preceding it. It closes the eye path — flush right,
   pushed-in left, pulled-in right, centre: each seat nearer the axis than
   the one before, a funnel closing on exactly the spot where the next
   words appear. It is set quieter than the passage (0.66 of the size,
   in --maroon-soft) because a connective carrying the statement's own
   weight reads as a third claim, and it sits tighter to row C than the beat
   because it belongs to the line above it, not to the air below — see
   .rowD in Passage.module.css.

   ⚠️ THE DOTS ARE THREE PERIOD GLYPHS, NOT ONE ELLIPSIS. They arrive one at
   a time with WIDENING gaps (see SLOTS_D), and a single "…" is one glyph
   with no seam to stagger. They carry their own spacing (.dot) instead of
   a word gap — an ellipsis sits hard against the word it trails from. The
   accessible name respells them as a real ellipsis; see `spoken`.

   Earlier settings, for the record — all built as two-line pairs, so any
   revival would need re-rowing for this four-row setting: "The recipes
   have not changed." / "The city has." (made the turn, but made the section
   about time rather than the group's spread); "We have never done anything
   quickly." / "It has never once been quiet." (about pace); "Hardly any of
   this makes the papers." / "Some of it does." (a shade too knowing); and
   the immediate predecessor, this same copy as two lines — "Seven different
   rooms, seven different stories." / "But only one standard." — which read
   correctly but let a measure decide where the first sentence broke. */
const ROW_A = ["Seven", "different", "rooms,"];
const ROW_B = ["seven", "different", "stories."];
const ROW_C = ["But", "only", "one", "standard."];
const ROW_D = ["So", ".", ".", "."];

/* ══════════ THE SCRUB ══════════
   Same mechanism as the manifesto's sentence — the reader's scroll is the
   clock, so the passage assembles at whatever rate they are travelling and
   there is no timed animation to out-run. See Manifesto.tsx for the long
   version of why this is a MotionValue and not state.

   THE OFFSET IS NOT THE MANIFESTO'S. That one runs `start end → center
   center`, which finishes when the section reaches the middle of the
   screen; this section is SHORTER than a screen and has to finish while it
   is still fully visible, so it ends on `end center` — the last dot lands
   as the section's bottom edge passes the middle. */
const SCRUB_OFFSET: ["start end", "end center"] = ["start end", "end center"];

/* SPAN IS DELIBERATELY WIDER THAN THE MANIFESTO'S 0.3.

   Span is how much of a band ONE word takes to travel, and the stagger
   falls out of it — (band − span) / (words − 1). A wider span means more
   words in flight at once and a slower-reading wave.

   The manifesto runs 0.3 across 24 pieces: stagger 0.024, about 12 in
   flight. Here each band covers a handful of words, so a 0.3 span would
   leave them arriving very nearly one at a time — a queue, not a wave. 0.5
   restores roughly the manifesto's in-flight ratio on much shorter runs.

   ⚠️ THE STAGGER IS DERIVED FROM THE WORD COUNT, so changing the copy
   changes the feel without anyone touching a constant. It is
   stagger = (to − from)(1 − SPAN)/(n − 1) against a span of
   SPAN·(to − from), so the number in flight is about
   (n − 1)·SPAN/(1 − SPAN) + 1 = n/2 + ½ at SPAN 0.5 — half the run is
   always moving, whatever the run is.

   MEASURED AT THE CURRENT ROWS, for reference rather than as a rule: the
   first sentence's six words (rows A + B share one wave — see SLOTS_A/B)
   get a stagger of 0.046 against a span of 0.23, so five of the six travel
   at once. Row C's four words get 0.0367 against 0.11, three of four in
   flight. Row D does not use this formula at all — see SLOTS_D. */
const SPAN = 0.5;

/* ══════════ THE BANDS ══════════
   Three bands, one per sentence — NOT one per row. SENT1 spans rows A and B
   as ONE six-word wave: they are one sentence, so the words queue straight
   through the row break rather than restarting at it. The 0.04 seam between
   SENT1 and SENT2 is the pause a reader takes at a full stop.

   SENT3 IS THE HAND-OFF AND IT ARRIVES LAST, AFTER A RESOLUTION BEAT. The
   ring's scrub band closes at MARK_END (0.82) and SENT3 does not start
   until 0.89 — 0.07 of band on which NOTHING moves. That gap is not slack,
   it is the pause: the ring closing is the section's climax, and a
   connective dropping in on the next hundredth reads as the page talking
   over its own resolution — which is exactly what the first cut of this
   setting did (SENT3 began 0.01 after the ring closed), and it was the one
   plain failure a motion audit of the section turned up. ⚠️ THE GAP IS
   AUTHORED, NOT DERIVED. An earlier cut wrote MARK_END as `SENT3[0] −
   0.01`, and that expression is precisely what GUARANTEED there was no
   pause — deriving either end from the other deletes the beat by
   construction. The two constants are independent on purpose, and the
   space between them IS the beat; do not "tidy" one back into an
   expression over the other. "So" also travels hidden for the first 18.6%
   of its slot (a descending word has 0.252em of slack above the clip
   before its bottom edge shows — see <Word>), so its first ink appears at
   p = 0.89 + 0.186 × 0.03 = 0.8956 — the visible rest is 0.076 of band,
   99.2px of scroll at 1440×900. ⚠️ MOVE SENT2 AND BOTH THE MARK'S BAND
   AND SENT3 HAVE TO MOVE WITH IT — MARK_IN is derived from SENT2's last
   slot, and the beat between MARK_END and SENT3 is what keeps the
   hand-off off the ring's heels.

   SENT3 ends at 0.99 rather than an earlier landmark because row D is the
   lowest ink in the section and the scrub ends on `end center`: at p = 0.99
   the section's bottom edge is at the middle of the screen and row D —
   which sits a whole bottom seam above that edge — lands with its line box
   222px above centre at 1440×900 (measured), well inside a reading
   position. (The old two-line setting ended its band at 0.86 to solve this
   same problem for a last line that sat much nearer the section's bottom;
   that constant and its derivation went with the layout.) The 0.10 of band
   left after the beat is enough: the word slot is 0.03 of progress and the
   dots 0.019 each — 39px of scroll per word at 1440×900, brisk against row
   C's 0.11 on purpose: a trailing-off is spoken quickly and quietly. */
const SENT1: readonly [number, number] = [0.06, 0.52];
const SENT2: readonly [number, number] = [0.56, 0.78];
const SENT3: readonly [number, number] = [0.89, 0.99];

type Slot = readonly [number, number];

function slots(n: number, [from, to]: readonly [number, number]): Slot[] {
  const span = SPAN * (to - from);
  const stagger = n > 1 ? ((to - from) * (1 - SPAN)) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => [
    from + i * stagger,
    from + i * stagger + span,
  ]);
}

/* rows A and B share ONE wave across the sentence: six slots computed as a
   single run, split 3/3 at the row break. Computing them per row would put
   a restart at the break — and the break is deliberately NOT a pause; the
   full stop after "stories." is where the pause lives (the SENT1→SENT2
   seam). */
const WAVE1 = slots(ROW_A.length + ROW_B.length, SENT1);
const SLOTS_A = WAVE1.slice(0, ROW_A.length);
const SLOTS_B = WAVE1.slice(ROW_A.length);
const SLOTS_C = slots(ROW_C.length, SENT2);

/* THE ELLIPSIS TRAILS OFF, WHICH MEANS THE GAPS WIDEN. Even spacing reads
   as a loading indicator ticking; each dot arriving a little later than the
   one before reads as a sentence running out of breath, which is what the
   punctuation means. The dots also travel in a shorter span than the word —
   a full stop has no length to it. The fractions: the word takes 0.30 of
   the band, the dots 0.21 each, starting at 0.30 / 0.52 / 0.79 of it — the
   starts step 0.22 then 0.27, and 0.79 + 0.21 = 1 lands the last dot
   exactly at the band's end. */
const SLOTS_D: Slot[] = (() => {
  const [from, to] = SENT3;
  const w = to - from;
  const wordSpan = 0.3 * w;
  const dotSpan = 0.21 * w;
  return [
    [from, from + wordSpan],
    ...[0.3, 0.52, 0.79].map(
      (f): Slot => [from + f * w, from + f * w + dotSpan]
    ),
  ];
})();

/* ══════════ THE AMBIENT LAYER ══════════
   The whole passage rides one slow upward drift across the entire scrub —
   +0.125em of the display size at p = 0 to −0.125em at p = 1, 0.25em end
   to end (11.5px at 1440). The words are the section's primary motion;
   with nothing behind them the scene has exactly one layer and reads flat
   however well that layer is timed. The drift is the missing secondary
   layer: it runs OPPOSITE to the words (they descend, the ground eases
   up), and it is deliberately below notice — what a reader registers is
   that the type has somewhere to arrive rather than sitting on a dead
   ground.

   ⚠️ IT LIVES ON AN INNER WRAPPER (.drift), NEVER ON THE SECTION. The
   section is the element useScroll measures, and getBoundingClientRect
   INCLUDES transforms — translating the measured element is a feedback
   loop in which progress moves the box and the box moves the progress.
   Verified rather than assumed: with the drift active vs forced to none,
   the section's rect and the document's scrollHeight are identical to the
   pixel at the same scrollY (probe-passage-setting.mjs), so
   scrollYProgress is untouched. The ring rides for free — its <svg> is a
   child of a row inside the wrapper and its geometry is line-local, so
   the drift moves mark and words as one; also verified, ring bbox centre
   against span centre, mid-scrub.

   AN em AND NOT px, resolved against .drift's own font-size (set to the
   display size in the stylesheet for exactly this): a fixed 11px is a
   different gesture against 27px type at 390 than against 51px at 1920,
   and the drift must stay the same fraction of the type it carries. */
const DRIFT_EM = 0.125;

/* ══════════════════ THE INK MARK AROUND "one standard." ══════════════════

   WHAT IT IS. One filled outline — a single closed shape whose width is
   computed along its own length — ringing the last two words of row C: a
   hand-drawn circle around the claim, laid down by the reader's own scroll.
   This file owns the geometry and the timing; Passage.module.css owns only
   what the ink is painted with.

   ⚠️ ONE OUTLINE, NOT STACKED STROKES. An earlier mark here was three
   strokes (bleed / body / core) pushed off true by an feTurbulence +
   feDisplacementMap filter, and at full size it read as PIXELATED — the
   filter shoved three separate edges a pixel or two each, which at this
   scale reads as a line breaking up rather than as a hand. The pen quality
   the stack was faking — thin at entry, bearing down through the middle,
   lifting thin, a breath of pooled ink before the lift — is computed
   directly into the outline's width profile now (see ringOutline), so
   there is one pen, one pass, no filter anywhere, and nothing left to
   break the edge up. The filters (#passageNib, #passageSoak) and the whole
   dash-offset draw machinery went with it.

   ⚠️ IT IS NOT A THIRD VOICE. The header note above forbids this section
   growing an eyebrow, a label, a control or a picture, on the grounds that
   any of those turn a handover into a chapter. A mark is none of them: it
   adds no words and asserts nothing, it only points at four syllables the
   copy already has. That is the whole of its licence — if it ever acquires
   a caption it has broken the rule.

   WHY IT IS GENERATED AND NOT AUTHORED. The type is clamp(1.7rem, 3.2vw,
   3.2rem), so the marked span is a different number of pixels at every
   width — "one standard." inks 220.3px at 1440, 244.8 at 1920, 130.0 at
   390, measured off the rendered masks; the same 4.78em at every stop, but
   the svg's unit is the pixel. A fixed `d` is right at exactly one viewport
   and wrong at all the others, and stretching one with
   `preserveAspectRatio="none"` turns the curve into a different curve at
   every width. So the span is measured and the outline is generated from
   the measurement, every time the line re-lays out. */

/* ══════════ WHICH WORDS THE MARK RINGS ══════════
   The row, and the index into that row's words of the first marked one.

   ⚠️ IT MARKS "one standard." AND NOT THE ROW WHOLE, and this is the third
   seat the mark has held — it was words 3–4 of the old line A ("not
   changed."), then the whole of the old landing line. The whole-line
   argument ran "there is no half of a three-word landing worth choosing",
   and it was true of that copy: "But only" was most of the line and the
   claim had no words to spare. THE CURRENT COPY IS NOT THAT SHAPE. "But
   only" is the HINGE — it turns the sentence, it is not what the sentence
   claims — and "one standard." IS the claim, the four syllables the whole
   passage exists to land. A ring around the hinge would emphasise the
   grammar; from: 2 puts it around the assertion. One constant rather than
   two (an index that does not name its row is only meaningful while
   exactly one row can be marked, and the mark has moved twice already). */
const MARK_ON = { line: ROW_C, from: 2 };

/* ══════════ THE RING ══════════
   The centreline is a loop around the marked span's measured WORD BOX —
   the box, not the ink extents, because a ring has to hold its distance
   from the tallest thing a row of this face can put in it, and the box is
   the one measurement that does not change when the copy does. Centred on
   the box's centre, each radius a half-extent plus a clearance in em:

     rx = span/2 + 0.18em      ry = box/2 + 0.34em

   ⚠️ THE ASYMMETRY IS DELIBERATE AND LOAD-BEARING IN BOTH DIRECTIONS.
   Horizontally the word immediately before the span is "only", so every
   extra pixel of rx runs the loop through a letter that is not being
   marked — 0.18em is as much air as the neighbour can afford (the loop's
   left reach already crosses the word gap; measured at 1440 the gap is
   7.6px and the reach past the span's ink is ~18px, so the loop passes
   through the tail of "only" the way a real pen ring around two words
   does). Vertically there is nothing beside the row to hit, and a ring
   drawn tight to the cap band reads as a BOX rather than as a circle —
   the 0.34em of air above and below is what makes it read as drawn.

   ⚠️ THE UNDERLINE'S SEAT ARITHMETIC DOES NOT TRANSFER, and none of it is
   carried here. That derivation (rise, tilt cap, NIB_CLEAR against the
   bleed's edge) existed because a mark BELOW a baseline can be pushed back
   up into the descenders by its own rise. A ring has no seat and no rise;
   the four clearances above are the whole of its constraint.

   WHAT MAKES IT A HAND AND NOT AN <ellipse> — three things, and they
   compose (all proofed in the sheet's ringSampler, ported verbatim):
     · IT RUNS 1.13 TURNS from the bottom-left (0.82π in screen
       coordinates, y down), dying past its own start — a hand does not
       close a circle on the pixel it began, and the overshoot is the
       single detail that kills the machine look. The radius also grows
       5.5% over the turn, so the second pass sits just outside the first
       instead of retracing it.
     · THE WHOLE LOOP IS TILTED −0.05rad (~2.9°). A hand does not draw on
       the page's axes; a couple of degrees is the cheapest single thing
       that breaks the ellipse reading while staying far short of crooked.
     · THE RADIUS WOBBLES ON THREE LOW HARMONICS with unrelated phases —
       NOT one sine, which is a regular lobe and reads as a wave; three
       slow ones summed give a radius that wanders without repeating
       inside a turn. And the CENTRE DRIFTS (~2% of rx, ~3% of ry, on its
       own slow phases): an arm pivots, it does not orbit a fixed point.
   ⚠️ The wobble SPENDS clearance — the three harmonics can take ~10.5%
   off a radius at once — so the clearance is checked at the ring's
   tightest point, not on average: measured at 1440 against the real face
   (probe, path.getBBox() against the span's canvas ink box), the drawn
   loop reaches 24.5px above the ascenders' ink, 26.3px below the
   baseline-deep ink, 14.1px left and 23.5px right of the span — all
   positive. If one goes negative on a future copy, the fix is the
   clearance, not the wobble. */
const RING_PAD_X = 0.18; /* em, past the span at the sides */
const RING_PAD_Y = 0.34; /* em, past the word box above and below */
const RING_START = 0.82 * Math.PI;
const RING_TURNS = 1.13;
const RING_TILT = -0.05; /* radians, about 2.9 degrees */
const RING_GROW = 0.055;

/* THE PEN AND THE HAND, from the proof sheet's contact prints. Weight 1 is
   the "medium" nib — the base stroke is 0.052em, swelling to ~0.058em
   through the middle of the movement. HAND 0.55 is the "steady" hand: a
   slow drift along the stroke's normal, about a hundredth of an em at its
   widest — under the threshold at which you would call it wobbly, and over
   the one at which the line looks machined. (The full hand, 1.0, starts to
   fight type this small; 0 reads as ruled.) */
const PEN_WEIGHT = 1;
const HAND = 0.55;

/* ══════════ THE DRAW IS SCRUBBED, AND IT WAS NOT ALWAYS ══════════
   ⚠️ THIS FILE ARGUED THE OPPOSITE FOR ITS WHOLE LIFE, AND THE ARGUMENT WAS
   OVERRIDDEN BY INSTRUCTION. The rule here used to be "a timed draw behind
   a scroll gate, never a scrub" — a pen stroke is one confident movement,
   and the moment its rate belongs to the wheel it stops being one — backed
   by a hysteresis latch (MARK_IN/MARK_OUT with a measured dead band) so an
   inertial wobble could not re-trigger the draw. The user asked for the
   draw to follow scroll directly, so the latch, the dead band and the
   stroke's own clock are gone: progress drives arc length, full stop. What
   that costs is exactly what the old rule protected — the reader can draw
   the ring backwards, park it half-drawn, or crawl it — and what it buys is
   that the mark obeys the same clock as every word around it and can never
   fire while the reader is standing still. If a future hand wants the gate
   back, it is in this file's history with its derivation intact.

   THE BAND: MARK_IN → MARK_END. MARK_IN keeps its name and its number but
   changes job — it was the gate, it is now where the scrub band starts (the
   moment the pen touches down), and it is still the progress at which the
   last marked word is WHOLE, because a ring being laid around letterforms
   that are still assembling reads as annotating a word that is not there
   yet.

   ⚠️ "WHOLE" IS DERIVED FOR THE DOWNWARD ENTRANCE, and the old upward
   threshold does not transplant. BE CLEAR ABOUT WHAT KIND OF WRONG THE OLD
   NUMBER IS: the baseline landmark and its u = 0.694 were CORRECT for the
   upward entrance this section shipped with, and became wrong the moment
   the direction flipped — an inversion, not a bug. Reused downward it
   opens the band on a word that is still half-cut, because every "last
   ink to arrive" argument swaps ends when the travel reverses. If the
   entrance ever flips again, this derivation flips with it. A RISING word
   arrives feet-last — its baseline was the last ink to clear the clip, at
   u = 0.694 of its slot. A DESCENDING word arrives feet-FIRST: its baseline clears the clip's top
   edge at u = 0.33, when the only ink on the page is its descenders; what
   is missing until the very end is the TOP of the letterforms. So the
   landmark is the topmost INK clearing the clip's TOP edge: the word
   travels 130% of its own 1.04em box (1.352em), the clip's top edge sits
   0.06em above the box (the mask's top pad), and "standard."'s ink top
   sits 0.846 − 0.674 = 0.172em below the box top (measured ascent
   0.674em in FreightBig Pro — ⚠️ unlike the old threshold this is
   FONT-DEPENDENT and wants re-measuring if the face changes). The ink
   clears at u = 1 − (0.06 + 0.172)/1.352 = 0.828 of the word's own slot.
   Verified by bisection in the browser: whole at p = 0.761–0.762 at
   1440×900 and 390×844 (u = 0.83), still inside the clip at 0.760, ~2.2px
   clear at 0.765. Row C's last slot is [0.67, 0.78] (the last
   slot is [to − SPAN·(to − from), to] whatever n is — the (n − 1)s
   cancel), so the ink is whole at p = 0.67 + 0.828 × 0.11 = 0.761, and
   0.77 IS THAT NUMBER ROUNDED UP TO THE HUNDREDTH — the first hundredth at
   which the word is whole rather than the last at which it is not.

   MARK_END IS PICKED FOR THE DRAW RATE, AND ⚠️ IT IS DELIBERATELY NOT AN
   EXPRESSION OVER SENT3. An earlier cut wrote `SENT3[0] − 0.01`, on the
   argument that the ring must close before the hand-off arrives — true,
   but the expression made the two ends ADJACENT by construction, and the
   section audited as having no pause at its own climax. The rest between
   the ring closing and row D is now an authored beat (see the bands note),
   so the two constants are independent: this end is set by how much scroll
   the DRAW deserves, the other by where the rest ends. Do not re-couple
   them.

   THE BAND IS [0.77, 0.82]: 0.05 of progress, 65.3px of scroll at
   1440×900, measured against the section's 855.5px and the scrub's
   1305.5px. The width is carried over from the approved motion study,
   which drew the ring across 0.054 of band — its start was the upward-era
   0.746; re-based on the measured 0.77 the same draw rate lands the close
   at 0.824, rounded down so the beat after it stays a full 0.07. It is NOT
   tighter than that because the whole 1.13-turn loop laid down in much
   under ~60px of travel arrives inside one trackpad flick — two or three
   scroll frames — and reads as a pop rather than a draw. */
const MARK_IN = 0.77;
const MARK_END = 0.82; /* independent of SENT3 — the gap to it is the beat */

type Pt = [number, number];

const n2 = (v: number) => Math.round(v * 100) / 100;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* the ring plus the line box it was measured against. The <svg> is sized
   from THIS rather than from `inset: 0`, so that if the line reflows before
   the re-measure lands the mark is momentarily in the wrong place rather
   than momentarily the wrong shape — a stretched box would scale the
   outline, and a scaled outline is the exact failure the generated path
   exists to avoid. All coordinates are line-local CSS pixels. */
type RingGeom = {
  w: number;
  h: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fs: number;
};

/* ══════════ FROM MEASURED TYPE TO THE RING ══════════
   IT MEASURES THE .mask AND NOT THE .word. The word is the element framer
   translates during the reveal, so its rect is wherever the scrub has left
   it; the mask never moves. Under reduced motion there is no mask and the
   marker is on the word, which does not move either — one path, both cases.
   The mask's own padding is read back off computed style rather than
   assumed, since it exists to cover descenders and is not ink.

   THERE IS NO WRAP MACHINERY LEFT — no row grouping, no per-fragment
   timing, no clamp against the row below. The old copy could wrap and the
   old mark had to survive becoming two fragments; the rows are
   `white-space: nowrap` now, so the marked run is one row at every width by
   construction and the single-run path is the only path. */
function buildMark(line: HTMLElement): RingGeom | null {
  const nodes = Array.from(
    line.querySelectorAll<HTMLElement>("[data-passage-mark]")
  );
  if (!nodes.length) return null;

  const cs = getComputedStyle(line);
  const fs = parseFloat(cs.fontSize);
  if (!fs) return null;
  const box = line.getBoundingClientRect();

  /* the marked span's WORD BOX, in line-local px. The x-extents come off
     the masks with their metric-neutral padding removed; the top the same
     way (the mask's border-box top plus its top pad is the word box top —
     and under reduced motion the marker is on a bare, padless .word, where
     the computed pad reads 0 and the rect top IS the box top, so one
     expression serves both). The box's height is the line-height — the
     word spans are inline-blocks sized to their own line box, so this is
     exact, not nominal. */
  const lh = parseFloat(cs.lineHeight) || 1.04 * fs;
  let x0 = Infinity;
  let x1 = -Infinity;
  let top = Infinity;
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    const ns = getComputedStyle(node);
    x0 = Math.min(x0, r.left + (parseFloat(ns.paddingLeft) || 0) - box.left);
    x1 = Math.max(x1, r.right - (parseFloat(ns.paddingRight) || 0) - box.left);
    top = Math.min(top, r.top + (parseFloat(ns.paddingTop) || 0) - box.top);
  }
  if (!(x1 > x0)) return null;

  return {
    w: n2(box.width),
    h: n2(box.height),
    cx: n2((x0 + x1) / 2),
    cy: n2(top + lh / 2),
    rx: n2((x1 - x0) / 2 + RING_PAD_X * fs),
    ry: n2(lh / 2 + RING_PAD_Y * fs),
    fs,
  };
}

/* ══════════ THE CENTRELINE ══════════
   The proof sheet's ringSampler, ported verbatim: the base ellipse, the
   5.5% growth over the turn, the three-harmonic radius wobble, the
   drifting centre, and the −0.05rad tilt applied to the whole loop last.

   ⚠️ THE TANGENT IS TAKEN BY CENTRAL DIFFERENCE, NOT DERIVED. With the
   radius wobbling, the centre drifting and the whole thing rotated, the
   analytic derivative is a lot of algebra to get subtly wrong for a value
   that only sets the normal's direction. h = 2e-4 — small against the
   1/260 station spacing, so the secant is indistinguishable from the
   tangent at any width this renders at. */
function ringSampler(g: RingGeom) {
  const turn = Math.PI * 2 * RING_TURNS;
  const ct = Math.cos(RING_TILT);
  const st = Math.sin(RING_TILT);

  const at = (t: number): Pt => {
    const a = RING_START + turn * t;
    const wob =
      1 +
      0.055 * Math.sin(a + 0.9) +
      0.032 * Math.sin(2 * a + 2.3) +
      0.018 * Math.sin(3 * a + 0.4);
    const grow = 1 + RING_GROW * t;
    const Rx = g.rx * wob * grow;
    const Ry = g.ry * wob * grow;
    const x = Math.cos(a) * Rx + 0.02 * g.rx * Math.sin(turn * t * 0.5 + 0.7);
    const y = Math.sin(a) * Ry + 0.03 * g.ry * Math.sin(turn * t * 0.37 + 1.9);
    return [g.cx + x * ct - y * st, g.cy + x * st + y * ct];
  };

  return (t: number) => {
    const h = 2e-4;
    const c = at(t);
    const a = at(Math.max(0, t - h));
    const b = at(Math.min(1, t + h));
    return { x: c[0], y: c[1], dx: b[0] - a[0], dy: b[1] - a[1] };
  };
}

/* ══════════ ONE PEN STROKE AS A FILLED BAND, TO AN ARC LENGTH ══════════
   The proof sheet's bandOutline: walk the centreline station by station,
   compute a half-width at each, offset along the normal both ways, close
   the two edges into one filled shape — the width varies along the
   length, which is the thing a stroked path cannot do and the whole
   reason the old stacked strokes existed.

   `upTo` IS THE REVEAL. The old underline was revealed by an HTML
   `clip-path: inset()` opening left to right, which worked only because an
   underline is monotonic in x. A loop is not: a left-to-right clip would
   uncover the far side of the ring before the near side — two arcs
   appearing, not one line being drawn. So the reveal is by ARC LENGTH: the
   band is built only as far as the nib has travelled and cut square at the
   head, because that is where the nib is at this instant.

   ⚠️ AND THAT COSTS WHAT THE CLIP DID NOT. Animating clip-path on a
   motion.div is in framer's accelerated set — off the main thread.
   Regenerating a path is main-thread work on every scroll frame that moves
   the band. It is kept cheap two ways: the caller bails unless `upTo` has
   moved ≥ 0.005 (below that a 260-station ring moves under a pixel), and
   the station count scales with `upTo` — a fifth of the ring costs a fifth
   of the stations. Measured in the browser at 1440 with everything in
   (wobble, drift, tilt, central differences): 0.14ms mean to generate the
   full ring and write it into the path — under 1% of a 60Hz frame; see
   scripts/probe-passage-setting.mjs.

   THE WIDTH PROFILE belongs to the WHOLE stroke, not to the revealed part
   — the entry taper (first 0.05), the swell, and the long exit taper
   (last 0.18: a hand lifts more slowly than it lands) sit at fixed
   stations, so a half-drawn ring shows its thin entry and a blunt head,
   and only picks up its exit taper as it closes. (The underline's
   pooled-ink bump is gone with the underline: a ring's finish is the
   overshoot dying out mid-air beside the start, not a nib coming to rest
   on the page.)

   THE HAND IS TWO OVERLAID DRIFTS along the normal — one slow, one at
   about twice the rate — so the line wanders the way an arm does rather
   than jittering the way a displacement filter does. That distinction is
   exactly what the old three-stroke filter got wrong. */
function ringOutline(g: RingGeom, upTo: number): string {
  const u = clamp01(upTo);
  if (u <= 0) return "";
  const FULL = 260;
  const N = Math.max(6, Math.round(FULL * u));
  const sample = ringSampler(g);

  const base = g.fs * 0.052 * PEN_WEIGHT;
  const halfWidth = (t: number) => {
    const entry = Math.pow(Math.min(1, t / 0.05), 0.55);
    const exit = Math.pow(Math.min(1, (1 - t) / 0.18), 0.7);
    const swell = 0.86 + 0.26 * Math.sin(Math.PI * Math.pow(t, 0.9));
    return (base * swell * entry * exit) / 2;
  };

  const top: number[][] = [];
  const bot: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * u;
    const c = sample(t);
    const len = Math.sqrt(c.dx * c.dx + c.dy * c.dy) || 1;
    const nx = -c.dy / len;
    const ny = c.dx / len;
    const drift =
      HAND *
      g.fs *
      0.011 *
      (0.62 * Math.sin(t * 8.9 + 0.7) + 0.38 * Math.sin(t * 19.3 + 2.4));
    const ox = c.x + nx * drift;
    const oy = c.y + ny * drift;
    const h = halfWidth(t);
    top.push([ox + nx * h, oy + ny * h]);
    bot.push([ox - nx * h, oy - ny * h]);
  }
  let d = `M ${top[0][0].toFixed(2)} ${top[0][1].toFixed(2)}`;
  for (let i = 1; i <= N; i++)
    d += ` L ${top[i][0].toFixed(2)} ${top[i][1].toFixed(2)}`;
  for (let i = N; i >= 0; i--)
    d += ` L ${bot[i][0].toFixed(2)} ${bot[i][1].toFixed(2)}`;
  return d + " Z";
}

/* ══════════ THE MARK IN THE TREE ══════════
   The <svg> is a DIRECT child of the marked <p> — svg is phrasing content
   and legal there. ⚠️ A <div> IS NOT: an earlier draft wrapped the svg in a
   reveal div and React reported the hydration error live ("<div> cannot be
   a descendant of <p>"). There is no wrapper element at all now — the
   reveal is the path's own regenerated geometry, so nothing here needs to
   be animated by framer and nothing block-level enters the paragraph.

   Absolutely positioned and pointer-events: none (see .ink), so the mark
   can neither take space in the section nor feed back into the line box
   that buildMark measures. Under reduced motion the path is rendered
   complete and never touched; otherwise it starts empty and the scrub
   handler in <Passage> writes its `d` imperatively — through a ref, NOT
   through state, because a state write per scroll frame is a React render
   per scroll frame for a d-string React never needs to see. */
function InkMark({
  geom,
  reduce,
  pathRef,
}: {
  geom: RingGeom;
  reduce: boolean;
  pathRef: RefObject<SVGPathElement | null>;
}) {
  return (
    <svg
      className={styles.ink}
      width={geom.w}
      height={geom.h}
      aria-hidden="true"
      focusable="false"
    >
      {reduce ? <path d={ringOutline(geom, 1)} /> : <path ref={pathRef} />}
    </svg>
  );
}

/* ONE HOOK PER WORD, WHICH IS WHY THIS IS A COMPONENT — `useTransform`
   cannot be called inside the `.map` that builds the row. Identical
   reasoning to <ScrubWord> in Manifesto.tsx. */
function Word({
  progress,
  slot,
  word,
  marked,
  dot,
}: {
  progress: MotionValue<number>;
  slot: Slot;
  word: string;
  marked: boolean;
  dot: boolean;
}) {
  /* −130%: THE ENTRANCE IS DOWNWARD, and the magnitude is derived from the
     mask's padding — but the derivation is NOT the upward one with the sign
     flipped, and the two do not cost the same. The mask pads 0.06em top and
     0.22em bottom and `overflow` clips at the PADDING box, so a RISING word
     had to clear (line-height + both pads − top pad) = 1.04 + 0.28 − 0.06 =
     1.26em to start fully hidden below the clip; a DESCENDING word has to
     clear only (its own box + the top pad) = 1.04 + 0.06 = 1.10em to start
     fully hidden above it. Against the word's own 1.04em box that is 121%
     up but only 106% down — downward needs LESS travel, not more. 130%
     covers both with margin, which is why the number survived the flip even
     though its old derivation did not. (The 0.252em of slack — 1.352 minus
     1.10 — is also why a descending word stays invisible for the first
     18.6% of its slot, which MARK_END's derivation leans on.) Manifesto's
     <ScrubWord> descends the same way at 110%; if the padding on .mask
     changes, re-derive this.

     A PERCENTAGE AND NOT AN em because Framer resolves transform
     percentages against the element's own box, so it stays the same
     fraction of the type size at every breakpoint.

     NO OPACITY. The clip is doing the reveal; fading as well makes the
     entrance mushy at the moment it should be crisp. */
  const y = useTransform(progress, [slot[0], slot[1]], ["-130%", "0%"]);

  /* THE MARKER GOES ON THE MASK, NOT ON THE WORD. buildMark measures this
     element, and the word inside it is mid-travel for most of the scrub. */
  return (
    <span
      className={dot ? `${styles.mask} ${styles.dot}` : styles.mask}
      data-passage-mark={marked ? "" : undefined}
    >
      <motion.span className={styles.word} style={{ y }}>
        {word}
      </motion.span>
    </span>
  );
}

function Line({
  words,
  slots,
  progress,
  reduce,
  className,
  spaced = true,
  markFrom,
  dotFrom,
  lineRef,
  children,
}: {
  words: string[];
  slots: Slot[];
  progress: MotionValue<number>;
  reduce: boolean;
  className: string;
  /* rows A–C separate their words with REAL SPACES, not margin — a margin
     rides on the last word and pushes the visible ink off the row's own
     axis, and real spaces mean the row is selectable and copies out as a
     sentence (same fix, same reason, as the note in Manifesto.tsx). Row D
     passes false: an ellipsis sits hard against the word it trails from,
     and the dots carry their own air via .dot instead. */
  spaced?: boolean;
  markFrom?: number;
  dotFrom?: number;
  lineRef?: RefObject<HTMLParagraphElement | null>;
  children?: ReactNode;
}) {
  const marked = (i: number) => markFrom !== undefined && i >= markFrom;
  const dotted = (i: number) => dotFrom !== undefined && i >= dotFrom;

  return (
    <p ref={lineRef} className={`${styles.line} ${className}`}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {reduce ? (
            <span
              className={dotted(i) ? `${styles.word} ${styles.dot}` : styles.word}
              data-passage-mark={marked(i) ? "" : undefined}
            >
              {word}
            </span>
          ) : (
            <Word
              progress={progress}
              slot={slots[i]}
              word={word}
              marked={marked(i)}
              dot={dotted(i)}
            />
          )}
          {spaced && i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      {children}
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

  /* THE ACCESSIBLE NAME IS THE FOUR ROWS AS PROSE. Each word is its own
     inline-block inside its own mask, which a screen reader will happily
     read as one item per word; the aria-label collapses them back into the
     sentences a reader is meant to hear. ⚠️ ROW D IS RESPELLED: its dots
     are three separate period glyphs so the entrance can stagger them, but
     nobody should be read "So . . ." — the spoken form gets the word plus a
     real ellipsis. The visible words stay in the DOM (rather than
     aria-hidden) so the text is still selectable and findable. */
  const spoken = `${ROW_A.join(" ")} ${ROW_B.join(" ")} ${ROW_C.join(" ")} ${ROW_D[0]}…`;

  /* ══════════ THE MARK'S INPUTS ══════════
     The ref is on WHICHEVER ROW MARK_ON names, not on row C by name — the
     mark has moved twice already, and a ref named after a row is the second
     place a future move would have to be remembered. The geometry lives in
     BOTH a ref and state: the ref because the scroll handler must see the
     current measurement without re-subscribing, the state because the <svg>
     needs its width/height re-rendered when the box changes. */
  const markLineRef = useRef<HTMLParagraphElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const geomRef = useRef<RingGeom | null>(null);
  const upToRef = useRef(0);
  const [markSet, setMarkSet] = useState<RingGeom | null>(null);

  useEffect(() => {
    const line = markLineRef.current;
    if (!line) return;

    let raf = 0;
    const run = () => {
      raf = 0;
      geomRef.current = buildMark(line);
      setMarkSet(geomRef.current);
    };
    /* every trigger funnels through one frame, so a resize drag measures
       once per frame rather than once per event. `raf` is cleared inside the
       callback as well as cancelled on teardown — a cancelled id left set is
       how a scheduler like this wedges shut. */
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(run);
    };

    schedule();

    /* ⚠️ AFTER THE FONTS, NOT ONLY ON MOUNT. The measurement is entirely a
       measurement of FreightBig Pro: the word widths, the baseline, the ink
       ascent and the run of the marked span all change when the face swaps
       in. Measured against the fallback the span is a different width, so a
       ring taken at mount and never revisited is drawn around a box that no
       longer exists. */
    document.fonts?.ready.then(schedule).catch(() => {});

    /* THIS CANNOT FEED BACK. The <svg> is absolutely positioned and
       pointer-events: none, so writing a new ring cannot change the box the
       observer is watching — which is the same property that keeps the mark
       out of the section's height. */
    const ro = new ResizeObserver(schedule);
    ro.observe(line);
    window.addEventListener("resize", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [reduce]);

  /* the ambient layer — see DRIFT_EM. One transform, linear across the
     whole scrub; under reduced motion it is simply not applied. */
  const driftY = useTransform(
    scrollYProgress,
    [0, 1],
    [`${DRIFT_EM}em`, `${-DRIFT_EM}em`]
  );

  /* THE SCRUB → THE PATH, imperatively. Progress maps linearly onto arc
     length across [MARK_IN, MARK_END] and the path's `d` is regenerated at
     the new cut — through the ref, not through state, so a scroll frame
     costs one path write and no React render. The ≥ 0.005 bail is the
     main-thread budget (see ringOutline); 0 and 1 always land exactly, so
     the settled states are precise whatever step the wheel arrived by. */
  const drawTo = (u: number) => {
    const g = geomRef.current;
    const path = pathRef.current;
    if (!g || !path) return;
    path.setAttribute("d", ringOutline(g, u));
  };
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduce) return;
    const u = clamp01((p - MARK_IN) / (MARK_END - MARK_IN));
    const last = upToRef.current;
    if (u === last) return;
    if (Math.abs(u - last) < 0.005 && u !== 0 && u !== 1) return;
    upToRef.current = u;
    drawTo(u);
  });
  /* a re-measure regenerates the ring at the scrub's CURRENT cut — without
     this, a resize while the ring is half-drawn would leave the old box's
     path on screen until the next scroll frame. */
  useEffect(() => {
    if (!reduce) drawTo(upToRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markSet, reduce]);

  /* EVERYTHING THE MARK CONTRIBUTES TO A ROW, AND NOTHING AT ALL TO THE
     OTHERS. The rows below are written identically on purpose: the mark
     needs THREE things on the same element — the word range, the ref
     buildMark measures, and the <InkMark> itself — and moving it is
     MARK_ON and nothing else. */
  const mark = (words: string[]) =>
    words === MARK_ON.line
      ? {
          from: MARK_ON.from,
          ref: markLineRef,
          svg: markSet ? (
            <InkMark geom={markSet} reduce={!!reduce} pathRef={pathRef} />
          ) : null,
        }
      : { from: undefined, ref: undefined, svg: null };
  const markA = mark(ROW_A);
  const markB = mark(ROW_B);
  const markC = mark(ROW_C);
  const markD = mark(ROW_D);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-nav-theme="light"
      aria-label={spoken}
    >
      {/* the drifting ground — every row and the ring live inside it, so the
          ambient layer moves the whole setting as one. It also carries the
          section's flex column and gap: the section itself stays untransformed
          and unstyled inside because it is the element useScroll measures —
          see DRIFT_EM for the feedback loop that rule prevents. */}
      <motion.div
        className={styles.drift}
        style={reduce ? undefined : { y: driftY }}
      >
      {/* ROWS A AND B ARE ONE SENTENCE BROKEN ACROSS TWO ROWS, so they sit a
          leading apart inside this wrapper rather than a beat apart in the
          section — the beat belongs between the SENTENCES. See .pair. */}
      <div className={styles.pair}>
        <Line
          words={ROW_A}
          slots={SLOTS_A}
          progress={scrollYProgress}
          reduce={!!reduce}
          className={styles.rowA}
          markFrom={markA.from}
          lineRef={markA.ref}
        >
          {markA.svg}
        </Line>
        <Line
          words={ROW_B}
          slots={SLOTS_B}
          progress={scrollYProgress}
          reduce={!!reduce}
          className={styles.rowB}
          markFrom={markB.from}
          lineRef={markB.ref}
        >
          {markB.svg}
        </Line>
      </div>
      <Line
        words={ROW_C}
        slots={SLOTS_C}
        progress={scrollYProgress}
        reduce={!!reduce}
        className={styles.rowC}
        markFrom={markC.from}
        lineRef={markC.ref}
      >
        {markC.svg}
      </Line>
      <Line
        words={ROW_D}
        slots={SLOTS_D}
        progress={scrollYProgress}
        reduce={!!reduce}
        className={styles.rowD}
        spaced={false}
        dotFrom={1}
        markFrom={markD.from}
        lineRef={markD.ref}
      >
        {markD.svg}
      </Line>
      </motion.div>
    </section>
  );
}
