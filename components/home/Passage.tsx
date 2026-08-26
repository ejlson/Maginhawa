"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import styles from "./Passage.module.css";

/* ══════ THE HANDOVER, BETWEEN THE PRESS WALL AND THE BOOKING FILM ══════
   The sentence set once, very large, and held while <Reservations> travels
   over the top of it. It sits between <PressWall> and <Reservations>.

   WHAT IT IS FOR. Above it the mastheads are the page's last piece of
   EVIDENCE — other people's words about the group. Below it <Reservations>
   is the page's only TRANSACTION. This is the beat between being told about
   the group and being asked to book it, and it is the last thing the page
   says in its own voice. The copy fits that turn: lines 1 to 3 concede
   three times over that the group is several different things, and line 4
   answers that they hold one standard — exactly the claim a reader wants
   answered immediately before a booking form. It then TRAILS OFF into the
   film rather than finishing, which is what the three dots on the end of
   line 4 are for.

   ⚠️ THIS IS A REWRITE AND THE OLD SETTING IS NOT RECOVERABLE FROM HERE.
   What stood here was four rows of type whose words DESCENDED INTO PLACE
   one at a time on the reader's scroll, with a generated ink ring drawn
   around "one standard." by the same scrub — about seven hundred lines of
   word masks, band arithmetic and pen-width profiles. All of it is in git
   and none of it is in this file. Two things retired it:

     · THE EMPHASIS MOVED INTO THE TYPE. "one standard." is set BOLD now,
       and it is the only bold on the screen. The ring existed to point at
       those two words; a ring around words that are already the heaviest
       thing in the block is the same instruction given twice.
     · THE MOTION MOVED INTO THE PIN. A per-word entrance and a pinned
       handover are two different answers to "what does this section do
       while the reader scrolls it", and running both means the words are
       still arriving while the film is already covering them.

   IT IS STILL NOT A SECOND MANIFESTO, and the line between the two is
   worth holding. The manifesto ASSERTS — it names the group and translates
   its name. This one only hands over; it introduces nothing and claims
   nothing, which is why it has no eyebrow, no label, no control and no
   picture. A prototype of this direction carried a photograph laid across
   the type and it was cut on exactly that rule.

   ⚠️ DO NOT PUT THE WORD "COMFORT" IN HERE, or any translation of the
   group's name. Manifesto.tsx owns that sentence ("Maginhawa is Tagalog for
   comfort"), Hero.tsx deliberately declines to spend it early — "the hero
   shows the word, the Manifesto explains it" — and a third chapter touching
   it would be the third telling of a one-line idea. */

/* ══════════ THE COPY ══════════

   ⚠️ THE COPY IS THE USER'S AND IT HAS CHANGED SEVERAL TIMES. Treat the
   arrays as the current answer, not as a resting place.

   THE LINE BREAKS ARE DECISIONS, NOT WRAPS. Every line is authored, sets
   `white-space: nowrap` on each group, and wraps nowhere — see .line in
   Passage.module.css. Nothing here is a measure and there is nothing left
   for one to decide.

   ⚠️ THE BLOCK IS CENTRED, AND IT USED TO BE JUSTIFIED. Every line was
   pushed to BOTH margins with `justify-content: space-between`, so its
   slack collected into ONE hole and the annotation sat inside that hole on
   a zero-width seat. That setting filled its measure on every line and
   therefore had no rag at all: four rectangles of ink, differing only in
   how big a gap each one carried. It is centred now at the user's
   instruction, and the trade is exact — the block gives up its flush edges
   and gets a SILHOUETTE, which is the thing that makes a stack of display
   lines read as editorial rather than as a banner. The annotations stop
   being seats and become real items on the line, with a real gap either
   side (see .tag in Passage.module.css, which is where the zero-width
   argument is buried).

   THE RAG IS COMPOSED, NOT ACCEPTED, AND IT IS A DRUMBEAT AND A DROP.
   Measured at 1440 against the real face, the four lines fill 73.7%, 73.8%,
   74.2% and 46.6% of the measure. The first three are within half a point
   of one another — near enough that they read as one block with no rag at
   all — and the fourth falls twenty-seven points off the bottom of them.
   That is the whole composition: three level lines, then a cliff, with the
   claim at the bottom of it. Nothing here wraps, so those numbers are a
   consequence of where the breaks are; if the copy changes they have to be
   re-measured rather than assumed.

   THE SHAPE IS THREE CONCESSIONS AND AN ANSWER. Lines 1 to 3 open with the
   same three words and concede something different each time — the places,
   the histories, the kitchens — and line 4 STOPS it. There is no hinge word
   doing that work any more ("But" went with the punctuation); the stop is
   the anaphora breaking, the count going from seven to one, and the line
   getting visibly shorter, all in the same row.

   ⚠️ THE REPETITION IS THE ARGUMENT AND IT IS NOT A TYPO TO TIDY UP. Three
   lines opening "SEVEN DIFFERENT" is a drumbeat, and "ONE STANDARD" lands
   on it. Rewriting any of the three to vary the phrasing — which is the
   instinct every prose editor has on reading it — deletes the device and
   leaves a list.

   WHY THESE WORDS. "Seven different rooms" is literal: the group is seven
   rooms that genuinely do not look or read alike, and pretending otherwise
   would be contradicted by <Discover> further up, where the tiles are
   visibly different places. Conceding that up front is what buys line 3 its
   authority. It is also grounded in copy the site already owns —
   AboutSplit's claim is "the same family, still led by Chef Omar", and
   <Reservations> directly below opens on "Seven rooms. Different worlds."

   ⚠️ WHY THE THIRD CONCESSION IS THE KITCHEN AND NOT SOMETHING WARMER. It
   is the word that makes line 4 mean anything: a standard is not a property
   of a dining room, it is a kitchen word, so line 3 HANDS TO line 4 rather
   than merely preceding it. Rooms are where a reader sits, stories are what
   happened there, kitchens are where the thing being claimed actually
   lives. It is also checkable — AboutSplit opens on "one Camden kitchen in
   1987" — which is the rule every line in here is held to.

   ⚠️ AND IT IS THE CHEAPEST LINE IN THE SET, WHICH IS NOT A COINCIDENCE.
   Measured against the real face at 1440, the candidates for this line ran
   from 66% of the measure to 113%; nothing wraps here, so the longest line
   governs the size of the whole block, and a line 3 that ran long would
   have shrunk every other line to pay for its own rhetoric. "SEVEN
   DIFFERENT KITCHENS" comes in at 74.2% — level with the two lines above
   it — and buys the block about 7% more type than the alternatives.

   ⚠️ THIRTY-EIGHT YEARS IS NOT IN THE COPY, ON PURPOSE. It was line 3 for a
   version ("Thirty-eight years of craft"), and it broke the pattern three
   ways in one row: it changed the count, changed the unit from things to
   time, and swapped concrete nouns for an abstract one. The date is back
   where it belongs, on the annotation to line 2 — see WHAT below.

   Earlier settings, for the record: "The recipes have not changed." / "The
   city has." (made the turn, but made the section about time rather than
   about the group's spread); "We have never done anything quickly." / "It
   has never once been quiet." (about pace); "Hardly any of this makes the
   papers." / "Some of it does." (a shade too knowing). */

/* ══════════ THE ANNOTATIONS ══════════
   Three, one per tagged line, standing between that line's two word groups.

   ⚠️ THEY ARE THE ONE THING IN HERE THAT COULD TURN THIS INTO A CHAPTER,
   so they are held to a rule: they add no CLAIM, only the facts the page
   already carries elsewhere, and they escalate in the order the sentence
   needs — WHERE the rooms are, WHAT they cook, WHO answers for them —
   landing the last one on the line that makes the claim. An annotation
   that argues something, or that repeats a line of the copy, has become an
   eyebrow and should be deleted rather than reworded.

   ⚠️ ONE LINE IN FOUR CARRIES NOTHING, AND THAT IS THE COMPOSITION.
   "Thirty-eight years of craft" is the longest line and the only bare one:
   the eye needs somewhere to rest between the two halves of the argument,
   and a fourth caption would make the block a table of four rows each with
   a footnote. It is also the line that could least stand one — see below.

   ⚠️ THEY ARE aria-hidden AND THAT IS DELIBERATE. They sit BETWEEN the
   word groups in the flex row, so without it a screen reader hears "seven
   different / kentish town & soho / rooms" — the annotation read into the
   middle of the sentence. The sentence is the accessible name of the
   section (see `spoken` below) and everything the annotations say is
   carried in prose elsewhere on the page: the locations by <Discover> and
   lib/restaurants.ts, the kitchen and the listing by <AboutSplit> and
   lib/blog.ts. If that ever stops being true they need a real home in the
   markup, not a gap in a headline.

   ⚠️ THE WIDTH ARGUMENT HAS CHANGED WITH THE ALIGNMENT, and the old one is
   worth knowing because it shaped every entry below. While the block was
   justified the annotation sat on a zero-width seat INSIDE the hole its
   line left, so the widest caption in the set decided how large the
   display type was allowed to be on every screen — which is why these are
   stacks of short rows rather than phrases, and why two of them were cut
   down to their shortest true form. Centred, a caption costs its own width
   plus two gaps on ITS OWN LINE only, so it no longer taxes the whole
   block. Keep them short anyway: a caption that runs wider than the words
   it stands between stops reading as an aside. */
/* A STACK OF SHORT LINES, NOT A LEAD AND A SUB. It was a two-line pair,
   and the pair's second line was always the long one — "Japanese ·
   Bakery", "Kentish Town · Soho" — which set the annotation's whole width.
   Breaking the same facts over more, shorter lines costs nothing (the
   annotation is centred in a line box many times its height). The first
   entry is the emphasised one. */
type Tag = string[];

const WHERE: Tag = ["Kentish", "Town", "& Soho"];

/* ⚠️ THE MIDDLE ONE IS THE DATE, AND IT WENT AWAY AND CAME BACK. It ran as
   the cuisines for a version, then as the group's own range
   ["Filipino", "Japanese", "Caribbean"], and both were answers to a problem
   that no longer exists: while the visible copy said "thirty-eight years",
   a caption saying "Since 1987" was the same fact set twice at two sizes,
   one row apart. The copy does not say it any more, so the caption is free
   to — and it is the right caption for this line, because a line about
   stories accumulating is answered better by how long they have been
   accumulating than by a list of cuisines.

   1987 is the group's own date and the page carries it in prose either way:
   AboutSplit has "cooking since 1987" and the Camden photograph is
   captioned 1987. The cuisines are still on the page in <Discover> and in
   the document title, which is why losing them here costs nothing.

   ⚠️ IT IS ALSO THE NARROWEST CAPTION IN THE SET, AND THAT IS WORTH KEEPING.
   Two rows and five characters at its widest, against "MICHELIN" at eight
   and "CARIBBEAN" at nine. This line and line 3 are within half a point of
   each other on width; a wider caption here would push line 2 past line 3
   and make IT the line that governs the type size for the whole block. */
const WHAT: Tag = ["Since", "1987"];

/* ⚠️ THE THIRD ONE IS EVIDENCE, NOT A THIRD DESCRIPTION, and that is the
   whole reason it changed. It read "One kitchen / Led by Chef Omar", which
   is true and is also a restatement of the line it sits in — a claim about
   one standard annotated with a claim about one kitchen says the same
   thing twice at two sizes. The Michelin listing is the only fact on the
   page that ANSWERS that line rather than repeating it.

   ⚠️ AND IT NAMES BELLY ON PURPOSE. The listing is Belly's, not the
   group's (lib/blog.ts, January 2026 — Ham & High and Time Out both cover
   it), so the annotation names the room. "Michelin Guide" with no venue
   under it would read as a group-wide claim this section is not entitled
   to make. If another room is ever listed, add it here; do not generalise
   the line. */
const WHO: Tag = ["Belly", "Michelin", "Guide"];

/* A line is one or two word groups. Two groups take an annotation and
   stand it in the gap between them; one group is a bare line and takes
   none. Every line is centred on the page axis — see .line in
   Passage.module.css. */
type Line = { left: string; tag?: Tag; right?: string };

const LINES: Line[] = [
  { left: "Seven different", tag: WHERE, right: "rooms" },
  /* sentence case, not display case: the lines are uppercased by the
     stylesheet, but `spoken` reads these strings verbatim and a second
     capitalised "Seven" would be announced as a new sentence.

     ⚠️ THE CAPTION SITS AFTER "SEVEN" AND NOT AFTER "DIFFERENT", at the
     user's instruction, and it is worth knowing what it costs so nobody
     "fixes" it back. Splitting after "different" would let all three lines
     open with the same three words uninterrupted, which is the anaphora at
     its strongest. Splitting after "seven" breaks the repeated phrase on
     the middle line only — and buys something for it: the date lands
     directly on the count it dates, and the three captions then sit at
     three different points across the block instead of stacking into a
     column down the middle, which is what made the caption row read as a
     table. The line's WIDTH is identical either way; only the break moves. */
  { left: "Seven", tag: WHAT, right: "different stories" },
  /* ⚠️ THE THIRD BEAT CARRIES NO CAPTION, AND THAT IS THE POINT OF IT.
     Three lines opening "SEVEN DIFFERENT" is a drumbeat; a caption in the
     middle of the third one breaks the rhythm at exactly the moment the
     rhythm is doing the work. It is also the last thing the reader takes
     in before the line that answers all three, so it is the right place
     for the block's only unbroken row. */
  { left: "seven different kitchens" },
  /* "ONLY" HAS GONE WITH "BUT" BEFORE IT. The line read "Only one
     standard", and before that "But only one standard." — each successive
     cut took out a word whose job was to turn a sentence that no longer
     has the punctuation to turn on. What is left is the claim itself, and
     it is now the shortest line in the block, which is what makes it read
     as the landing rather than as a fourth item. */
  { left: "One", tag: WHO, right: "standard" },
];

/* ══════════ THE PHONE SETS THE SAME SENTENCE OVER SEVEN ROWS ══════════
   Four authored rows that must not wrap can only be as large as the
   longest of them allows, and on a phone the longest is "SEVEN DIFFERENT
   KITCHENS" — 10.714em against the real face. At 390 that put the type at
   32px filling 14% of the screen, under 272px of empty cream: a paragraph
   set in a display face, not display type. The three-line drumbeat that
   carries the whole argument reads at that size as a repetition somebody
   forgot to edit.

   BREAKING AFTER "SEVEN DIFFERENT" IS WHAT BUYS THE SIZE BACK, and it is
   the only break that does not cost the argument something. The phrase
   itself becomes three consecutive rows with nothing standing between
   them, so the anaphora comes out STRONGER than it is on a desktop, where
   two captions interrupt it. Measured against the real face, the governing
   line is now the claim with its ellipsis on it (7.659em) rather than the
   third concession, and the type roughly doubles.

   ⚠️ THE CLAIM IS NOT BROKEN AND MUST NOT BE. "ONE / STANDARD" over two
   rows would be the shortest line in the block split in half — the landing
   the whole setting is built to arrive at, delivered in two pieces. It
   stays whole even though it is now the line that governs the type size,
   which is a cost paid on purpose.

   ⚠️ THE WORDS ARE THE SAME WORDS. `spoken` below is derived from LINES and
   NOT from whichever set is on screen, because a screen reader must hear
   four sentences either way — a narrow reading of this array would announce
   "Seven different. Rooms." and turn every concession into two.

   ⚠️ IF A ROW IS EVER ADDED OR REMOVED HERE, three numbers in
   Passage.module.css move with it and all three fail silently: the narrow
   clamp, its svh term, and the navbar guard on .stage. See the narrow
   media query, which carries the arithmetic. */
const LINES_NARROW: Line[] = [
  { left: "Seven different" },
  { left: "rooms" },
  { left: "Seven different" },
  { left: "stories" },
  { left: "Seven different" },
  { left: "kitchens" },
  /* two groups rather than one so the ellipsis has a `right` to ride on —
     see the trail argument in SlabLine. With no caption standing between
     them the line's 0.28em gap is simply the word space. */
  { left: "One", right: "standard" },
];

/* ⚠️ THE CAPTIONS ARE MOVED, NOT DELETED, AND THAT IS THE CHANGE. They used
   to be `display: none` below 900px, on the sound reasoning that an
   annotation sized off the viewport stops being an aside once the display
   type has tracked down past it — it does not get crowded, it gets BIG,
   until a three-row stack is a third the height of the line it annotates.
   All of that is still true of a caption standing INSIDE a line. None of it
   is true of one row set once under the block, which is what this is.

   DERIVED, SO THE FACTS CANNOT DRIFT from the three arrays above. The
   emphasis survives the flattening: each caption keeps its first entry as
   the loud one, which is what tells "Belly" apart from the listing it
   carries. */
const NARROW_CAPTION: Tag[] = [WHERE, WHAT, WHO];

/* ⚠️ TWO LINES SHARE THE STRING "Seven different" AND THE KEY DOES NOT.
   <SlabLine> is keyed on the whole line rather than on line.left for that
   reason — see the map in the component. Keying on the words would give
   React two identical keys and it would reuse one line's scroll transforms
   for the other. */

/* ⚠️ NOTHING IN THE BLOCK IS BOLD, AND IT WAS. "one standard." carried
   --w-bold for a version, on the argument that it is the claim the whole
   passage exists to land. It came back out: at this size Contralto's bold
   is a visibly different letterform, not a heavier one, so two weights in
   a four-line block read as two typefaces rather than as emphasis. The
   claim is already the last thing said and the only thing on its own side
   of the hinge; it does not also need to be a different face.

   ⚠️ AND IT MATTERS MORE NOW THAT THE BLOCK IS CENTRED. A centred stack is
   already a shape; a bold line inside one is a second emphasis competing
   with the shape for the same job, and the shape is doing it — "One
   standard" is the short line at the bottom of a taper and cannot be
   missed. */

/* ⚠️ THREE PERIOD GLYPHS, NOT ONE ELLIPSIS, and they are their own element.
   An ellipsis sits hard against the word it trails from and cannot be
   spaced apart; three periods can, and at this size they have to be.

   ⚠️ "SO" HAS GONE AND THE DOTS HAVE NOT, at the user's instruction, and
   the distinction is the whole point. The block used to close on a fifth
   row reading "SO . . ." — a word, set a beat below the claim, whose only
   job was to say that a consequence was coming. Read across the seam it
   made a sentence with the film's own heading: "One standard. So… where
   will you begin?"

   THE CONNECTIVE WAS NEVER THE WORD, IT WAS THE TRAILING OFF. "One
   standard… Where will you begin?" hands over exactly as well, is
   grammatically clean where the word needed either a comma splice or a
   full stop the block does not otherwise carry, and costs a row instead of
   spending one. What that row was costing: it is a fifth of the block's
   height, and on a pinned screen the block's height is what decides how
   large the type may be.

   ⚠️ AND THE DOTS STILL HAVE TO ARRIVE, which is why they did not go with
   it. They are the only thing on this screen that the pin's own scrub
   animates; delete them and the held frame is a still image. */

/* THREE DOTS, ARRIVING ONE AT A TIME WITH WIDENING GAPS. Even spacing
   reads as a loading indicator ticking; each dot landing a little later
   than the one before reads as a sentence running out of breath, which is
   what the punctuation means. The starts step 0.06 then 0.07.

   ⚠️ THEY RUN ON THE APPROACH, NOT ON THE PIN, and that is the whole fix.
   They used to be measured against the pin's runway on the argument that
   they "land inside the hold ... the film's first pixel does not appear
   until the hold ends — about 0.31". That stopped being true when
   --pin-hold became --pin-peep: the film's top edge now sits --pin-peep
   ABOVE the fold BEFORE the pin engages (see Passage.module.css), so there
   is no hold left to land inside and the card was climbing over dots that
   were still arriving.

   On the approach they are finished by the frame the pin engages — which
   is the same frame the type stops moving — so the sentence is always
   complete before the card starts to cover it.

   ⚠️ AND THEY BEGIN ONLY ONCE THE LAST LINE IS HOME, WHICH THEY DID NOT.
   An ellipsis that arrives before the words it trails from is not
   punctuation, it is a spinner. The rule was written down and the numbers
   never matched it: the first dot started at 0.80 against a final line
   that landed at 0.86, so it was already fading in while the claim was
   still travelling. That was survivable with three lines and got worse
   with four, because the fourth line is the one the dots trail from.

   0.86 is LINE_SLOTS' last end, and it is the same number rather than a
   copy of it in spirit only — if that moves, this moves. The three now
   share 0.14 of the approach, which is about 125px of scroll on a laptop:
   quick, which is what punctuation should be. The starts still step wider
   each time (0.04 then 0.05) so the ellipsis reads as a sentence running
   out of breath rather than as an indicator ticking.

   ⚠️ THEY RIDE ON LINE 4 NOW RATHER THAN ON A ROW OF THEIR OWN, so they
   inherit that line's entrance as well as running this one: the line fades
   up and travels into place with the dots already inside it, and then the
   dots resolve on top of that. Both are driven by the same `approach`, and
   the line is home at exactly the frame the first dot starts, so the two
   never run at once. */
/* ⚠️ THEY ARE DERIVED FROM THE LAST LINE'S END, NOT WRITTEN DOWN BESIDE IT.
   The rule above says the dots begin once the claim is home; the numbers
   used to say 0.86 in two places and rely on whoever moved one to remember
   the other. They do not any more — the entrance now ends at a DIFFERENT
   point on a phone (see LINE_SLOTS), so a literal here would be wrong on
   one breakpoint whichever value it carried.

   The three fractions are the original shape preserved: at the wide end
   this returns [0.86, 0.910], [0.901, 0.955], [0.950, 1], which is the set
   it replaces to three decimal places. The starts still step wider each
   time, so the ellipsis reads as a sentence running out of breath rather
   than as an indicator ticking, and the last dot still lands exactly on 1 —
   the frame the pin engages. */
function dotSlots(from: number): [number, number][] {
  const span = 1 - from;
  return [
    [from, from + span * 0.36],
    [from + span * 0.29, from + span * 0.68],
    [from + span * 0.64, 1],
  ];
}

/* ══════════ THE PIN ══════════
   The scrub's only job is the two things that happen to the held type
   while the film climbs over it, so it is measured over the PIN'S OWN
   RUNWAY — `start start → end end` on the scope element, which is 0 the
   frame the stage sticks and 1 the frame it releases. Passage.module.css
   owns the runway's height and the arithmetic that lines its release up
   with the film's arrival; this file only reads the progress.

   ⚠️ THE SCOPE IS MEASURED, SO NOTHING TRANSFORMS IT. getBoundingClientRect
   includes transforms, so animating the element useScroll is watching is a
   feedback loop in which progress moves the box and the box moves the
   progress. The swell and the blur are both on .stage, which is INSIDE the
   scope and is not what is measured. */

/* ══════════ THE ENTRANCE ══════════
   The sentence assembles on the APPROACH — the screen of scroll before the
   pin engages — so that by the time the type is held it is already whole
   and the pin has nothing to do but hold it. Running the entrance during
   the pin instead would put the lines still arriving while the film is
   already climbing over them, which is the page finishing its sentence
   over the top of the next chapter.

   ⚠️ IT IS A SECOND SCRUB ON A SECOND ELEMENT, and the two must not be
   confused. The pin's progress is measured on .scope (start start → end
   end) and is 0 the frame the stage sticks; this one is measured on the
   SECTION (start end → start start) and is 1 that same frame. They meet
   exactly once, at the moment the type stops moving.

   ⚠️ THE SLOTS ARE CONTIGUOUS NOW AND THEY USED TO OVERLAP BY FOUR FIFTHS.
   Every row travels out from behind an overflow:hidden group, and even
   rows rise while odd rows descend (see LINE_TRAVEL). Under the old
   settings — 0.47 long, 0.09 apart — three rows were mid-travel at once,
   and because the directions alternate, ADJACENT rows were cut in OPPOSITE
   directions with nothing between them: a rising row carries its ink at the
   BOTTOM of its box and a descending one carries it at the TOP, so the two
   bands met across the 0.06em row gap. One line losing its feet directly on
   top of the next losing its caps is not a reveal, it is a braid, and at
   approach 0.5 it was the whole screen.

   THE FIX IS PHASING, NOT TRAVEL. A row now starts the frame the row above
   it lands, so no frame contains two cuts.

   ⚠️ AND THE PRICE IS NAMED HERE RATHER THAN DISCOVERED LATER: THE BLOCK NO
   LONGER ARRIVES AS A BLOCK. One window shared four ways makes each row two
   and a half times quicker (0.185 of the approach, about 167px of scroll)
   and leaves exactly one moving at a time, so the entrance reads as a
   cascade down the stack rather than as four lines converging at once. That
   is a different gesture, not a tuned version of the old one.

   ⚠️ THERE IS SLACK IN HERE, AND IT IS 15.3%. A row shows NOTHING for the
   first 0.153 of its slot: the travel is 118% of the box, so it has to come
   down to 100% before any ink enters. Slots may therefore overlap by up to
   0.153 × duration and still never put two cuts on screen. Contiguous is
   the simple, checkable end of that range — anything inside it is legal,
   anything past it brings the braid back.

   ⚠️ THE OTHER ANSWER IS ONE WORD RATHER THAN FOUR NUMBERS, and it was
   declined rather than missed. Give every row the SAME direction and the
   braid cannot happen at any overlap: two rising rows both carry their ink
   at the bottom of their boxes with clear cream between, so the old
   0.47/0.09 settings would be safe exactly as they stood and the block
   would still arrive as a block. What it costs is the weave, which is the
   thing LINE_TRAVEL exists to defend. The trade is the weave against the
   overlap; this file has chosen the weave, and the other half of the
   choice is recorded here for whoever wants it back.

   THE WINDOW HAS NOT MOVED. The first row still starts at 0.12 and the last
   is still home at 0.86, so the entrance occupies exactly the stretch of
   approach it always did and dotSlots() still reads 0.86 off the end of
   it. Only the phasing inside the window changed. */
const LINE_SLOTS_WIDE: [number, number][] = [
  [0.12, 0.305],
  [0.305, 0.49],
  [0.49, 0.675],
  [0.675, 0.86],
];

/* ⚠️ THE PHONE RUNS A DIFFERENT SENTENCE NOW, NOT THE SAME ONE LATER. This
   was the wide set shifted 0.08 later, because the block sat lower in its
   own stage on a narrow screen and the old timings finished the sentence
   while it was still in the lower third. Below 900px the copy is re-broken
   over SEVEN rows (see LINES_NARROW), so there is no wide set left to
   shift — this is its own, built the same way: contiguous slots 0.08 apart,
   ending at 0.94 so the ellipsis keeps the 0.06 of approach it has always
   had.

   ⚠️ IT STARTS AT 0.38 AND NOT AT 0.12, AND THE SEVEN ROWS ARE WHY. Where a
   row LANDS on the screen is fixed by the scroll and not by the timing: the
   stage travels a full viewport across the approach, so a row that lands
   early lands near the bottom edge. Seven sequential rows cannot all land
   high in one screen of scroll, and starting late is what keeps the first
   of them off the floor. Measured at 390×844, the set climbs 77 · 74 · 70 ·
   67 · 63 · 60 · 57 per cent down the screen — every row in the lower half,
   but each one higher than the last, which is the cascade reading as a
   block gathering itself rather than as rows appearing at random depths.

   THE SAME SET BEGUN AT 0.12 WOULD LAND ROW 1 OFF THE BOTTOM OF THE SCREEN.
   Row 1 rests with its centre 194px down a 844px stage, and the stage is a
   full viewport higher at approach 0, so at 0.20 that centre is at 869 —
   past the bottom edge. The last row is unaffected wherever the set starts;
   every row before it is not. */
const LINE_SLOTS_NARROW: [number, number][] = [
  [0.38, 0.46],
  [0.46, 0.54],
  [0.54, 0.62],
  [0.62, 0.7],
  [0.7, 0.78],
  [0.78, 0.86],
  [0.86, 0.94],
];

/* ══════════ HOW A LINE ARRIVES ══════════
   Each line travels out from behind a hidden edge and its tracking closes as
   it lands. Chosen from fifteen at the user's instruction — the alternating
   mask of study 11 with the settle of study 07.

   ⚠️ THE MASK REPLACED A FADE, AND THAT IS THE POINT OF IT. The lines used
   to arrive on `opacity 0 → 1` with 0.16em of rise. At this size a fade
   spends most of its run as grey letterforms; a mask keeps every frame at
   FULL CONTRAST, which is the one thing display type at 138px cannot afford
   to give up. It is also now the page's own device — the booking heading a
   screen below arrives the same way.

   ⚠️ ALTERNATING, NOT CASCADING. Even lines rise from below, odd lines
   descend from above, so the block weaves shut rather than stacking up. It
   costs nothing and it stops four identical rises reading as a list being
   populated. If a line is ever added or removed the alternation re-derives
   itself from the index; nothing here is hand-assigned.

   ⚠️ 118% AND NOT 100%. The travel is a percentage of the group's OWN
   height, which is the line box — and the line box is 0.86em, tighter than
   the em, so the ink does not sit neatly inside it. At 100% the cap tops
   were still showing above the mask edge at rest. 118% clears them with
   room; measured at 1440, nothing paints outside the group box at progress
   0 on any of the four lines. */
const LINE_TRAVEL = "118%";

/* ⚠️ THE TRACKING SETTLE IS STANDING IN FOR A WEIGHT SETTLE, WHICH THIS
   FACE CANNOT DO. The study this was picked from entered at Contralto's 300
   and landed on 600. It cannot be built: `contralto-big` is a set of STATIC
   CUTS, not a variable font — document.fonts reports it as discrete values
   (300, 400, 600, 700, 900) where a variable family reports a range (the
   site's Figtree reports "300 900"). An animated font-weight across static
   cuts is therefore a single STEP, not a settle, and the step is not free:
   the cuts differ in WIDTH as well as in colour, so the line would jerk
   sideways at the frame it snaps.

   ⚠️ THE FIGURE THIS NOTE USED TO QUOTE FOR THAT JERK WAS WRONG, and it is
   worth correcting rather than deleting because it was quoted in two files
   as settled fact. It said the 300 cut sets SEVENTEEN PER CENT WIDER than
   the 600. Measured against the real kit, 300 is the NARROWEST of the four
   and the ladder runs 300 < 400 < 600 < 700 in width — the table is in
   Passage.module.css beside the font-weight. The step is about 5% and it
   would still be a jerk; the conclusion survives, the number did not.

   Tracking is the property that gives the same reading — type consolidating
   as it lands — on a face with fixed weights. It is smoothly animatable, it
   is symmetric about the centre line, and it costs no letterform change.

   ⚠️ IT IS BOUNDED BY THE MEASURE, AND THE BOUND BINDS ON A PHONE. The
   longest line already fills 89.8% of its measure at rest, so the entrance
   can only borrow what is left — and what is left is not the same
   everywhere. MEASURED at the widest point of the entrance, which is the
   frame the slot opens, at the current size and cut:

       1920×1080   93.0 / 93.6 / 95.3 / 73.0%   (rest 88.4 / 88.6 / 89.8)
       1440×900    93.8 / 94.2 / 95.3 / 73.9%   (rest 89.2 / 89.2 / 89.8)
        390×844    88.4 / 89.6 / 95.3 / 68.2%   (rest 86.1 / 87.0 / 92.5)

   The phone is the binding case twice over: the line starts 2.7 points
   fuller AND the section's padding floor is a bigger share of the screen,
   so the same em of tracking eats more of what is left. It does not
   overflow, and it is transient, and it is still close to a wall that
   fails SILENTLY: these lines are `nowrap`, so the failure mode is ink
   running off the screen rather than a wrap anyone would notice in review.

   ⚠️ AND THIS IS NOW A SHARED BUDGET, WHICH IT WAS NOT BEFORE. The type
   size in Passage.module.css is set against the ENTRANCE PEAK rather than
   against the rest, so the tracking here and the vw coefficient there are
   spending the same margin. Opening this wider does not just make a
   livelier entrance — it forces the settled block smaller. Re-derive both
   together or not at all.

   ⚠️ SO THE NARROW VALUE IS HALF, AND IT CANNOT COME FROM CSS. The
   entrance is written as an inline style by framer, and an inline style
   beats a media query — the breakpoint has to be read in script and fed to
   the transform. It is read in the same measure pass as --pin-peep and
   re-read on resize, so a window dragged across 900px picks up the right
   one. 900px is the section's own breakpoint (the captions drop there);
   this does not introduce a second one. */
/* ⚠️ THE SETTLE NOW LANDS ON A NEGATIVE REST, NOT ON ZERO. .line in
   Passage.module.css sets letter-spacing: -0.03em, which is what bought the
   block its type size — and framer writes this value as an INLINE style, so
   whatever the transform ends on is what the reader ends on. Ending on
   "0em" would silently loosen the settled block by 0.03em and push the
   longest line back past the measure it was sized against.

   So the rest is the number, the two TRACK values are how far the entrance
   OPENS from it, and the strings the transform interpolates are derived
   rather than written out — a hand-typed "-0.002em" is exactly the kind of
   literal that survives a later change to either input. */
const LINE_REST = -0.03;
const LINE_OPEN = 0.028;
const LINE_OPEN_NARROW = 0.014;
const em = (n: number) => `${+n.toFixed(4)}em`;
const LINE_TRACK = em(LINE_REST + LINE_OPEN);
const LINE_TRACK_NARROW = em(LINE_REST + LINE_OPEN_NARROW);
const NARROW = "(max-width: 900px)";

/* THE SWELL is 4% across the whole runway, and it is the smaller half of
   the gesture on purpose. The block is already at the largest size that
   fits; a swell big enough to read as an animation would either start too
   small to be the setting or end clipped. 1.04 is enough that the type is
   demonstrably not a still image and not enough to notice as a zoom. */
const SWELL = 0.04;

/* THE BLUR DOES NOT START WITH THE RUNWAY — it starts once the film is
   genuinely arriving rather than merely showing. The stylesheet now lets
   <Reservations> PEEP above the bottom edge for the whole of the pin (see
   --pin-peep), so there is no longer a stretch of runway on which the film
   is absent; blurring from the first frame would defocus the block while
   it is still the only thing anyone is reading.

   ⚠️ SO THE RULE IS EXPRESSED IN GEOMETRY, NOT IN TIME, and it is now the
   TYPE'S geometry rather than the screen's. The blur begins at the frame
   the film's top edge reaches the BOTTOM OF THE SLAB — the moment the
   arriving picture starts to cover the sentence and not a pixel before —
   and is fully soft when the film is home.

   ⚠️ IT USED TO BE A FRACTION OF THE SCREEN AND THAT BROKE WHEN THE CARD
   GOT SMALL. The rule was "sharp until the film has climbed over the
   bottom third", i.e. the top edge at 66% of the viewport. That was a fair
   proxy while the film arrived as a near-full sheet whose top edge and the
   slab's bottom were at much the same place. They are not any more:
   <Reservations> now enters as a small card, the slab is four rows rather
   than five, and where the slab ENDS moves with the viewport — 62% of the
   screen on a laptop, 45% on a phone. Measured on the phone, the type was
   visibly soft while the card was still two hundred pixels clear of it.

   Both terms are in the DOM, so the start falls out of three rects and
   cannot disagree with the stylesheet or with Reservations at any
   breakpoint:

       runway         = scope height − stage height
       film top at p  = runway × (1 − p)          (it travels 1:1)
       reaches slab   when runway × (1 − p) = slab bottom, in the stage

   ⚠️ THE SLAB, NOT THE STAGE. The stage is a whole viewport and the slab
   is seated above its centre, so the two bottoms are a long way apart; it
   is the ink the reader is looking at that the blur is about. */
/* ⚠️ 22 → 10, at the motion crit's Finding 02. At 22 the exit was a smear:
   display type at glyph-height blur radii, held across hundreds of pixels
   of scroll while the film climbed — captured, it was the worst sustained
   frame on the page. Ten is still an unmistakable focus pull (these are
   90px letterforms; 10px softens them well past legibility) but the words
   remain WORDS going out of focus rather than becoming a tone band in the
   cream. This is also the page's ONLY blur now — both arrival blurs were
   deleted in the same pass (see the retired ARRIVAL_BLUR note in
   lib/drift.ts) precisely so this focus pull would read as the camera
   gesture it is. Do not hand blur back to the arrivals without re-arguing
   that. */
const BLUR_PX = 10;

/* ══════════ AND THE INK GOES WITH IT ══════════
   ⚠️ THE BLUR ON ITS OWN WAS THE UGLIEST FRAME IN THE SEQUENCE, and this is
   the fix. The stage defocused to 22px while its OPACITY STAYED AT 1, so
   the strip of display type still showing above the plate's hard top edge
   was at full ink strength and sliced mid-letter. Measured at 1440×900,
   pin progress 0.68: line 1 at `blur(14.59px)`, `opacity: 1`, cut across
   the x-height by an edge with no softness of its own. Type that is out of
   focus but not receding does not read as type — it reads as a dark smear
   band in the cream, which is what made the cream band above the plate
   look broken rather than deliberate.

   Defocus and recession are the same gesture, so they run on the same
   scrub from the same frame: the fade starts at `blurFrom` exactly, which
   means the sentence is at FULL INK AND FULLY SHARP for the whole stretch
   it is the only thing on screen, and only starts to go once the picture
   begins to cover it.

   ⚠️ IT DOES NOT END WHERE THE BLUR ENDS, AND THAT IS THE POINT. The blur
   runs to progress 1 because the pin releasing is what finishes it. The
   fade cannot afford that: measured at 1440×900 the plate has covered the
   TOP of the slab by progress 0.73, so a ramp landing at 1 spends its last
   quarter on type nobody can see and is still at 0.36 on the last frame
   any ink shows. Landing it where the ink is actually swallowed puts the
   type at 0.18 on that frame — a ghost rather than a mid-tone.

   ⚠️ SO THE END IS MEASURED, NOT PICKED, for the same reason the start is:
   see the note over BLUR_PX for what a screen-fraction constant did to
   this section last time. It is the same three rects read at the other end
   of the ink — `filmReaches(slab top)` against `filmReaches(slab bottom)`
   — so the fade spans exactly the interval on which the plate is crossing
   the sentence, at every breakpoint, and cannot drift from the blur.

   ⚠️ WHICH GIVES THE RAMP A PROPERTY WORTH KNOWING BEFORE ANYONE EASES IT.
   Because the plate travels 1:1 with the scroll and the ramp is linear over
   exactly the slab's own height, the type's opacity IS the fraction of the
   sentence still uncovered, scaled into [INK_FLOOR, 1]. Measured at
   1440×900: at pin 0.30 the plate's top is at y=398 against a slab of
   150..545, i.e. 62.8% uncovered, and the computed opacity is 0.671 —
   0.12 + 0.88 × 0.628. The ink is only ever as strong as the sentence is
   whole. An eased ramp breaks that and would have to earn it back.

   MEASURED, BEFORE AND AFTER, 1440×900, at the pin frames that matter:

       pin    blur        opacity before → after
       0      0px         1    → 1        the pin's first frame: sharp and
                                          whole, and it has to stay that way
       0.15   2.21px      1    → 0.873
       0.30   5.72px      1    → 0.671
       0.45   9.20px      1    → 0.472
       0.60   12.68px     1    → 0.273
       0.68   14.59px     1    → 0.158    ⟵ THE REPORTED FRAME. Line 1 cut
                                          across the x-height by the plate's
                                          top edge; full ink before, a ghost
                                          after
       0.72   15.50px     1    → 0.12     floor reached; 3px of line 1 left
       1.00   22px        1    → 0.12     no ink on screen either way

   ⚠️ SO THE RAMP IS MUCH SHORTER ON A PHONE, AND THAT IS CORRECT RATHER
   THAN A BUG — worth stating, because the numbers look alarming next to
   the laptop's. At 390×844 the slab is ~110px of a 405px runway, so the
   span is 0.25 of the pin against 0.65 at 1440×900: measured, blurFrom
   0.062 and the fade landing at 0.311, with the type at 0.689 by pin 0.15
   and on the floor by 0.45. The plate really does cross the whole sentence
   in that quarter of the pin there — at pin 0.15 its top edge is at y=344
   with the slab at 270..380, i.e. lines 3 and 4 already gone — so the ink
   is only tracking what is left, exactly as above. What it does mean is
   that the fade and the BLUR come apart on a phone (2.08px of blur at
   0.689 opacity), because the blur's far end is the pin's release and
   cannot be moved. It does not show: everything the blur has left to do at
   that point happens under the plate.

   ⚠️ THE FLOOR IS NOT ZERO, DELIBERATELY. The ramp is linear, so the floor
   is really the SLOPE's endpoint and is barely on screen itself; 0.12 is
   chosen for what it costs if the geometry is a frame out. Composited, the
   type is maroon #411613 on cream #f5e9e0 — 13.3:1 at full ink, and 1.26:1
   at 0.12, which is under the 3:1 floor this project holds any mark to. So
   0.12 already reads as a warm tone in the cream rather than as a mark,
   and it buys back the failure mode that 0 would introduce: a fade end
   mismeasured by a resize between the write and the paint, or by a font
   swap that moves the slab, could otherwise ERASE the sentence while it is
   still uncovered. That is precisely the silent-blank failure the mount
   gate in the component exists to prevent, and it would be careless to
   reintroduce it here for a difference nobody can see. */
const INK_FLOOR = 0.12;

/* Degenerate-case guard only, and it should never bite in practice: the
   slab's top is always above its bottom, so the measured fade end is
   always past the blur start by `slab height / runway` (0.67 at 1440×900).
   It collapses to zero if the slab measures zero-height — a probe running
   before the display face has loaded, say — and a zero-width domain hands
   framer a divide-by-zero and NaN opacity. Half a percent of the pin is
   enough to keep the ramp well formed and far too short to see. */
const FADE_MIN_SPAN = 0.005;

/* ══════════ SEATING THE CARD ══════════
   ⚠️ --pin-peep IS DERIVED HERE NOW, AND IT USED TO BE A CONSTANT IN THE
   STYLESHEET. Passage.module.css still declares it — 12svh wide, 8svh
   narrow — and those are the no-JS and pre-hydration values, not the ones
   a scripted reader gets.

   WHAT IT HAS TO DO. <Reservations> arrives as a small card, and the user's
   requirement is that the card is ALREADY SEATED beneath the sentence at
   the frame the pin engages, rather than rising into place afterwards. The
   film's top edge sits `100svh − --pin-peep` down the screen at that
   frame, and the card's top edge is the film's top edge (its entry
   top-inset is zero — see Reservations.module.css), so seating it is one
   equation:

       card top at pin start = 100svh − --pin-peep
       wanted                = slab bottom + GAP
       ⇒ --pin-peep          = stage height − slab bottom − GAP

   ⚠️ AND IT CANNOT BE A CONSTANT, because the slab's bottom is not one.
   Measured: the last line ends 62% of the way down a 1920×1080 screen, 60%
   at 1440×900, 72% at 1440×620 — the type is width-governed there but the
   stage's padding cap seats it lower — and 45% on a phone, where the block
   is a much smaller share of a tall screen. A single svh value that seats
   the card correctly on a laptop overlaps the type on a short screen and
   strands it a quarter of a screen low on a phone.

   ⚠️ IT ALSO SETS THE PIN'S LENGTH, which is the cost of seating the card
   early: the pin runs `100svh − --pin-peep`, so every pixel the card is
   raised is a pixel of hold given up. The clamp is what stops that running
   away — 52svh leaves the type held for a little under half a screen even
   on the phone, which is the worst case.

   THE GAP IS IN em OF THE DISPLAY TYPE so the air below the sentence
   tracks the sentence rather than the viewport, with px bounds because at
   phone sizes a fraction of the type is not enough air to read as a gap. */
const SEAT_GAP_EM = 0.3;
const SEAT_GAP_MIN = 20;
const SEAT_GAP_MAX = 64;
const PEEP_MIN = 0.08;
const PEEP_MAX = 0.52;

function measurePinPeep(
  stage: HTMLElement | null,
  slab: HTMLElement | null
): number | null {
  if (!stage || !slab) return null;
  const stageH = stage.offsetHeight;
  if (stageH <= 0) return null;
  const slabBottom = slab.offsetTop + slab.offsetHeight;
  const fs = parseFloat(getComputedStyle(slab).fontSize) || 0;
  const gap = Math.min(Math.max(fs * SEAT_GAP_EM, SEAT_GAP_MIN), SEAT_GAP_MAX);
  const peep = stageH - slabBottom - gap;
  return Math.min(Math.max(peep, stageH * PEEP_MIN), stageH * PEEP_MAX);
}

/* ══════════ WHERE THE FILM IS, IN PIN-CLOCK FRAMES ══════════
   Both of the measurements below ask the same question — "at which frame
   of the pin does the film's top edge reach this depth into the stage?" —
   so they are one function asked twice rather than two copies of the
   arithmetic written out over BLUR_PX:

       runway         = scope height − stage height
       film top at p  = runway × (1 − p)          (it travels 1:1)
       reaches depth  when runway × (1 − p) = depth

   ⚠️ ONE FUNCTION ON PURPOSE. The blur's onset and the fade's landing have
   to stay a fixed distance apart — the height of the slab — at every
   breakpoint, and two independently written copies of this are exactly how
   that stops being true six months from now.

   ⚠️ THE DEPTH IS MEASURED INSIDE .stage, NOT INSIDE THE VIEWPORT. Both
   callers pass the slab's own offsetTop/offsetHeight, which are already in
   that frame: .stage is `position: sticky`, which makes it the slab's
   offset parent.

   Returns null when there is nothing to measure against — no elements yet,
   or a scope no taller than the stage, i.e. no runway and therefore no pin
   — and each caller supplies its own safe fallback. */
function filmReaches(
  scope: HTMLElement | null,
  stage: HTMLElement | null,
  depth: number
): number | null {
  if (!scope || !stage) return null;
  const runway = scope.offsetHeight - stage.offsetHeight;
  if (runway <= 0) return null;
  return 1 - depth / runway;
}

function measureBlurStart(
  scope: HTMLElement | null,
  stage: HTMLElement | null,
  slab: HTMLElement | null
): number {
  if (!slab) return 0;
  const p = filmReaches(scope, stage, slab.offsetTop + slab.offsetHeight);
  /* 0 is the safe fallback: an unmeasurable runway means no pin, and a
     blur that starts at the first frame of a pin that never holds is a
     blur nobody sees. */
  if (p === null) return 0;
  return Math.min(Math.max(p, 0), 0.95);
}

/* The frame the plate has covered the LAST of the ink — the film's top
   edge level with the SLAB'S TOP, i.e. the first frame on which there is
   no sentence left to look at. See INK_FLOOR for why the fade lands here
   and not at the pin's release. */
function measureFadeEnd(
  scope: HTMLElement | null,
  stage: HTMLElement | null,
  slab: HTMLElement | null,
  blurFrom: number
): number {
  /* 1 is the safe fallback and the slow one: with nothing measured the
     type fades gently across the whole pin, which is wrong-looking at
     worst. Falling back to a SHORT ramp would dim the sentence while it is
     still the only thing on the screen. */
  const p = slab ? filmReaches(scope, stage, slab.offsetTop) : null;
  if (p === null) return 1;
  return Math.min(Math.max(p, blurFrom + FADE_MIN_SPAN), 1);
}

/** One line of the sentence, arriving on its own slot of the approach. */
function SlabLine({
  line,
  approach,
  slot,
  still,
  travel,
  track,
  trail,
}: {
  line: Line;
  approach: MotionValue<number>;
  slot: [number, number];
  still: boolean;
  /* "118%" or "-118%" — see LINE_TRAVEL. Passed rather than derived here so
     the alternation is visible at the call site, next to the index it comes
     from. */
  travel: string;
  /* how far the tracking opens — LINE_TRACK, or half of it on a narrow
     screen where the measure cannot lend that much. Measured in Passage(),
     not here, so all four lines cannot disagree. */
  track: string;
  /* the three dots, on the one line that trails off; every other line
     passes nothing and renders nothing */
  trail?: React.ReactNode;
}) {
  /* the caption is not masked — it sits BETWEEN the two groups, so a mask
     on it would hide it behind an edge of its own in the middle of the
     line. It fades on the same slot instead, a shade behind the words. */
  const opacity = useTransform(approach, slot, [0, 1]);
  const y = useTransform(approach, slot, [travel, "0%"]);
  const letterSpacing = useTransform(approach, slot, [track, em(LINE_REST)]);

  return (
    /* ⚠️ THE TRACKING IS ON THE LINE AND THE TRAVEL IS ON THE GROUPS, and
       they cannot swap. Tracking has to reach both word groups AND the gap
       arithmetic between them, so it belongs to the row; the travel has to
       be clipped by something, and the only boxes tight enough to hide a
       line without also hiding the caption standing between its halves are
       the groups themselves. */
    <motion.p
      className={styles.line}
      style={still ? undefined : { letterSpacing }}
    >
      <span className={styles.group}>
        <motion.span
          className={styles.groupInk}
          style={still ? undefined : { y }}
        >
          {line.left}
        </motion.span>
      </span>
      {/* A BARE LINE RENDERS NEITHER, AND RENDERS NOTHING IN THEIR PLACE.
          The annotation is a real flex item now rather than a zero-width
          seat, so an empty one would still spend its two gaps and open a
          hole in the middle of a line that is supposed to be whole. */}
      {line.tag && (
        <motion.span
          className={styles.tag}
          aria-hidden
          style={still ? undefined : { opacity }}
        >
          <span className={styles.tagInk}>
            {line.tag.map((row, i) =>
              i === 0 ? <b key={row}>{row}</b> : <i key={row}>{row}</i>
            )}
          </span>
        </motion.span>
      )}
      {line.right && (
        <span className={styles.group}>
          <motion.span
            className={styles.groupInk}
            style={still ? undefined : { y }}
          >
            {line.right}
            {trail}
          </motion.span>
        </span>
      )}
    </motion.p>
  );
}

/** One trailing dot, on its own slot of the approach. */
function Dot({
  progress,
  slot,
  still,
}: {
  progress: MotionValue<number>;
  slot: [number, number];
  still: boolean;
}) {
  const opacity = useTransform(progress, slot, [0, 1]);
  /* it drops the last fraction of its own size into place rather than
     fading on the spot — a dot that only fades reads as a rendering
     artefact, one that lands reads as punctuation being set */
  const y = useTransform(progress, slot, ["-0.16em", "0em"]);

  return (
    <motion.span
      className={styles.dot}
      style={still ? undefined : { opacity, y }}
      aria-hidden
    >
      .
    </motion.span>
  );
}

export default function Passage() {
  const reduce = useReducedMotion();
  const scopeRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /* measured, not assumed: the blur starts where the ink ends and the fade
     lands where the ink begins — see measureBlurStart and measureFadeEnd,
     which read this one element at both ends */
  const slabRef = useRef<HTMLDivElement>(null);

  /* THE PIN'S OWN CLOCK: 0 the frame the stage sticks, 1 the frame it
     lets go. Drives the swell, the blur and the trailing dots. */
  const { scrollYProgress } = useScroll({
    target: scopeRef,
    offset: ["start start", "end end"],
  });

  /* THE APPROACH: 0 when the section's top edge is at the bottom of the
     screen, 1 when it reaches the top — which is the same frame the pin
     above begins. Drives the entrance, and nothing else. */
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: approach } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });

  /* re-measured on resize because --pin-hold is breakpoint-dependent and
     svh itself moves when a phone's URL bar does */
  const [blurFrom, setBlurFrom] = useState(0);

  /* ⚠️ THE WIDE VALUE IS THE SSR DEFAULT AND THAT IS THE SAFE WAY ROUND.
     matchMedia does not exist on the server, so the first paint has to
     guess; guessing WIDE means a phone that never runs the measure pass
     opens the tracking too far, and guessing NARROW means a desktop opens
     it too little. Neither is visible — the entrance has not started at
     first paint, and the effect below corrects it before it can. */
  const [track, setTrack] = useState(LINE_TRACK);

  /* ⚠️ THE COPY AND ITS TIMINGS ARE ONE PIECE OF STATE ON PURPOSE. The two
     sets have DIFFERENT ROW COUNTS now (four wide, seven narrow), and every
     slot is a useTransform input read by index — so a render in which the
     lines had swapped and the slots had not would ask for slots[6] of a
     four-long array and hand framer `undefined`. React batches the two
     setState calls today and it would work; holding them in one object
     means it cannot stop working. Same SSR default reasoning as `track`:
     matchMedia has no server, and the entrance has not started at first
     paint either way.

     ⚠️ AND THE SWAP IS A LAYOUT CHANGE, NOT JUST A TIMING ONE. A phone gets
     the four-row setting until this effect runs. That is invisible in
     practice — the section is most of a document down and hydration is long
     finished before anyone scrolls to it — but it is the reason the narrow
     rules in Passage.module.css still hide .tag rather than trusting the
     narrow copy to carry none. */
  const [setting, setSetting] = useState<{
    lines: Line[];
    slots: [number, number][];
  }>({ lines: LINES, slots: LINE_SLOTS_WIDE });
  const { lines, slots } = setting;

  /* ⚠️ MEMOISED BECAUSE EACH SLOT IS A useTransform INPUT. dotSlots()
     returns fresh arrays, and handing framer a new range object on every
     render churns three transforms for nothing. Keyed on `slots` so it
     re-derives exactly when the breakpoint moves — and only then. */
  const dots = useMemo(() => dotSlots(slots[slots.length - 1][1]), [slots]);
  /* the far end of the ink's fade, measured the same way and from the same
     rects — see measureFadeEnd. It defaults to the whole pin so that a
     render before the first measurement fades slowly rather than fast. */
  const [fadeTo, setFadeTo] = useState(1);

  /* ⚠️ THE ENTRANCE IS GATED ON MOUNT, AND THE REASON IS THE FAILURE MODE
     RATHER THAN THE FLASH. The lines animate FROM opacity 0, and framer
     renders a motion value's current value on the server — which is the
     value at progress 0, i.e. invisible. That is correct while the section
     is still a screen below the fold, and catastrophic if the scrub ever
     fails to attach: the whole sentence would simply never appear, and it
     would fail silently, on a section that is nothing but the sentence.

     Holding the styles off until after mount makes the resting state the
     VISIBLE one. Nothing regresses in the normal case — framer computes
     the real progress on its first frame, so a reader who lands mid-
     section sees the correct value immediately, and a reader above the
     section cannot see the lines either way. What changes is that a broken
     scrub now leaves readable type instead of an empty screen.

     It is also the belt to the noscript sheet's braces: data-entrance
     covers the reader whose script never runs, this covers the one whose
     script runs and goes wrong. */
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    /* ⚠️ ORDER MATTERS AND SO DOES THE GUARD. The peep changes .scope's
       HEIGHT, and the blur start is measured from that height — so the
       property has to be written before the runway is read. Reading
       offsetHeight straight after the write forces the layout, so the
       second measurement sees the new box.

       The guard is what stops the ResizeObserver below chasing its own
       tail: it watches .scope, the write resizes .scope, and without a
       no-op on an unchanged value that is a loop. The peep itself does not
       depend on .scope, so one settling pass is all it ever needs. */
    const measure = () => {
      const scope = scopeRef.current;
      const peep = measurePinPeep(stageRef.current, slabRef.current);
      if (scope && peep !== null) {
        const next = `${Math.round(peep)}px`;
        if (scope.style.getPropertyValue("--pin-peep") !== next) {
          scope.style.setProperty("--pin-peep", next);
        }
        /* ⚠️ AND THE SAME NUMBER GOES ON THE ROOT, AS A FRACTION, FOR
           <Reservations>. The peep is where the pin starts, so on the
           film's own approach scale it is exactly the progress at which
           the card is seated under the sentence. Reservations cannot
           derive it: it depends on this section's slab height, which is
           measured here.

           ⚠️ IT IS A SAFETY FLOOR OVER THERE NOW, NOT THE DRIVER. The
           growth used to start a fixed beat after this value, which put
           its first frame at a different screen height on every viewport;
           it now starts where the un-grown plate's centre sits at 57.5%
           of the screen — growStartFor(drop) in Reservations.tsx,
           (210 − drop)/200: 0.550 on desktop, 0.565 under the ≤980px
           card — so the plate opens at the same height everywhere, and
           this fraction only FLOORS that start, so the growth can never
           begin under a card that has not seated. PEEP_MAX above already
           guarantees 0.52, under that start's own 0.550 floor; the floor
           binding at all would mean something here has changed.

           It is a unitless fraction of the viewport rather than a length
           because that is the scale the consumer works in, and it is on
           documentElement rather than .scope because the film is this
           section's SIBLING and inherits nothing from it. Written in the
           same pass as --pin-peep so the two can never disagree; see
           growStartFor in Reservations.tsx for what reads it and for the
           fallback that applies if this never lands. */
        const frac = (peep / window.innerHeight).toFixed(4);
        const root = document.documentElement;
        if (root.style.getPropertyValue("--pin-peep-frac") !== frac) {
          root.style.setProperty("--pin-peep-frac", frac);
        }
      }
      /* ⚠️ BOTH ENDS COME OFF THE ONE PASS, and the fade's end is derived
         from the blur's start rather than re-measured beside it, so the
         two can never be written from different layouts. */
      const from = measureBlurStart(
        scopeRef.current,
        stageRef.current,
        slabRef.current
      );
      setBlurFrom(from);
      setFadeTo(
        measureFadeEnd(
          scopeRef.current,
          stageRef.current,
          slabRef.current,
          from
        )
      );
      const narrow = window.matchMedia(NARROW).matches;
      setTrack(narrow ? LINE_TRACK_NARROW : LINE_TRACK);
      setSetting(
        narrow
          ? { lines: LINES_NARROW, slots: LINE_SLOTS_NARROW }
          : { lines: LINES, slots: LINE_SLOTS_WIDE }
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (scopeRef.current) ro.observe(scopeRef.current);
    /* ⚠️ THE SLAB IS WATCHED TOO, AND IT IS NOT REDUNDANT. All three numbers
       this effect writes — the peep, the blur's start and the fade's end —
       are measured off the slab's own box, and the slab's height moves
       AFTER the first pass in two ordinary cases:

         · THIS EFFECT CHANGES IT ITSELF. The breakpoint swap below hands a
           phone seven rows where the server painted four, so the first
           measurement is taken against a block a third of the height of the
           one that ends up on the screen. Left unwatched, the card's seat
           was computed from the wrong slab and the film arrived on top of
           the claim — which is exactly what it looked like.
         · THE DISPLAY FACE LANDS LATE. contralto-big arrives from a kit
           after first paint, and the fallback does not set to the same
           depth.

       Watching .scope alone caught neither: its height is 100svh plus the
       peep, so it does not move when the slab does. No loop — the write
       lands on .scope, and .scope's height cannot change .slab's, which is
       laid out inside a .stage that is exactly a viewport tall. */
    if (slabRef.current) ro.observe(slabRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* the caption row rides the ellipsis' window: from the frame the last
     line lands to the frame the pin engages. Declared unconditionally
     because it is a hook — the row itself is conditional, this is not. */
  const captionFade = useTransform(approach, [slots[slots.length - 1][1], 1], [0, 1]);

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 + SWELL]);
  const filter = useTransform(
    scrollYProgress,
    [blurFrom, 1],
    ["blur(0px)", `blur(${BLUR_PX}px)`]
  );
  /* THE INK RECEDES WITH THE FOCUS — see INK_FLOOR for the argument, the
     measured before/after and why this ramp is shorter than the blur's.
     ⚠️ IT IS SAFE AT PROGRESS 0 AND THAT IS NOT AN ACCIDENT. framer renders
     a motion value at its current value on the server, which is the value
     at progress 0 — and both ends of this domain are ≥ blurFrom, so
     progress 0 is opacity 1. A scrub that never attaches therefore leaves
     the sentence at FULL INK, exactly as the mount gate above and the
     noscript sheet's data-entrance="scope" rule both require. Do not
     invert this ramp or start it before blurFrom without re-reading both. */
  const opacity = useTransform(
    scrollYProgress,
    [blurFrom, fadeTo],
    [1, INK_FLOOR]
  );

  /* THE ACCESSIBLE NAME IS THE SENTENCE AS PROSE. Each line is split into
     groups with an annotation between them, which a screen reader would
     otherwise read as separate items in the wrong order; this collapses
     them back into the one sentence a reader is meant to hear. ⚠️ THE LAST
     LINE IS RESPELLED: its dots are three separate period glyphs so they
     can be tracked apart, but nobody should be read "So . . ." — the spoken
     form gets the word plus a real ellipsis. The visible words stay in the
     DOM (rather than aria-hidden) so the text is still selectable and
     findable. */
  /* THE POINTING IS PUT BACK FOR THE READER WHO CANNOT SEE THE LINE BREAKS.
     The visible sentence is unpointed on purpose, but a screen reader gets
     one continuous string — without commas and a stop it is announced as a
     single run-on clause. Derived rather than restated, so the words cannot
     drift from LINES. */
  /* ⚠️ IT IS FULL STOPS NOW AND IT WAS COMMAS. The visible block was three
     lines of one sentence, so the spoken form pointed it as one sentence;
     it is four short sentences at the user's instruction, and reading them
     as a comma list would announce a run-on where the setting has four
     stops. Each line contributes both its word groups with the annotation
     between them dropped — that is the whole reason this string exists. */
  /* ⚠️ THE LAST SENTENCE TRAILS OFF AND DOES NOT STOP. Every line but the
     last is announced as its own sentence; the last takes a real ellipsis
     rather than a full stop, because the three tracked periods on the end
     of it are punctuation and a screen reader should hear them as such.
     The block used to append " So…" here for a fifth row that no longer
     exists. */
  const spoken =
    LINES.map((line, i) => {
      const words = line.right ? `${line.left} ${line.right}` : line.left;
      return `${words[0].toUpperCase()}${words.slice(1)}${
        i === LINES.length - 1 ? "…" : "."
      }`;
    }).join(" ");

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-nav-theme="light"
      aria-label={spoken}
    >
      {/* THE RUNWAY. The stage sticks for exactly as long as this box is
          taller than the stage — see Passage.module.css, which derives that
          height from the distance the film has to travel. */}
      <div ref={scopeRef} className={styles.scope}>
        {/* ⚠️ data-entrance="scope" IS THE NO-JS CONTRACT, not decoration.
            The dots below and the stage's own blur AND FADE are inline
            styles written by framer, and framer's server render is the
            value at progress 0 — three invisible dots and, if the reader's
            script never runs, three dots that stay invisible. The stage's
            fade is the benign one of the three: its domain starts at
            blurFrom, so progress 0 is opacity 1 and full ink either way
            (see the note over the transform). The sheet clears it anyway,
            which is the right belt for a property that could hide the
            entire sentence if the ramp were ever re-pointed. The noscript
            sheet
            in app/layout.tsx keys off this attribute and clears opacity,
            transform and filter on the whole subtree with !important,
            which beats an inline style. Every chapter that animates on
            entry carries it; see <Hero> and <Blog>.

            THERE WAS A WHISPER ABOVE THIS. The sentence was set a second
            time at caption size over the block — the reference's
            read-it-small-then-loud device. It is gone at the user's
            instruction, and what it takes with it is the block's top
            edge: the slab is the only thing on the stage now and is
            centred on the frame rather than hanging from anything. */}
        <motion.div
          ref={stageRef}
          className={styles.stage}
          style={reduce ? undefined : { scale, filter, opacity }}
          data-entrance="scope"
        >
          {/* ⚠️ THE SLAB IS THE WHOLE SECTION NOW. There was a fifth <p>
              under this map carrying "SO . . ." on its own row, a beat below
              the claim; it is gone at the user's instruction and the dots
              moved onto line 4. See LAST_WORD's note above for what that
              row was doing and why the dots are not going with it. */}
          <div ref={slabRef} className={styles.slab}>
            {lines.map((line, i) => (
              <SlabLine
                key={i}
                line={line}
                approach={approach}
                slot={slots[i]}
                still={!!reduce || !animate}
                /* even lines rise, odd lines descend — the weave, derived
                   from the index so it survives a line being added */
                travel={i % 2 === 0 ? LINE_TRAVEL : `-${LINE_TRAVEL}`}
                track={track}
                trail={
                  i === lines.length - 1 ? (
                    <span className={styles.dots}>
                      {dots.map((slot, j) => (
                        <Dot
                          key={j}
                          progress={approach}
                          slot={slot}
                          still={!!reduce || !animate}
                        />
                      ))}
                    </span>
                  ) : undefined
                }
              />
            ))}

            {/* ⚠️ THE CAPTION ROW EXISTS ONLY WHERE THE CAPTIONS CANNOT
                STAND INSIDE THE LINES. It is rendered off the same three
                arrays the desktop annotations use (see NARROW_CAPTION), so
                the facts cannot drift apart, and it is hidden by the
                stylesheet as well as by this condition — the wide setting
                must never grow a row it has not budgeted height for.

                IT FADES, AND THAT IS NOT THE INCONSISTENCY IT LOOKS LIKE.
                The lines use a mask because a fade at 138px spends its run
                as grey letterforms; at 7px there is nothing for a mask to
                reveal and a fade is simply what arriving looks like. It
                runs on the DOTS' window rather than its own, so the last
                thing to land is the punctuation and its footnote together.

                aria-hidden for the same reason the desktop annotations are:
                the section already announces the sentence through its
                label, and these facts are carried in prose elsewhere. */}
            {lines === LINES_NARROW && (
              <motion.p
                className={styles.captionRow}
                aria-hidden
                style={
                  reduce || !animate ? undefined : { opacity: captionFade }
                }
              >
                {NARROW_CAPTION.map((tag, i) => (
                  <span key={i} className={styles.captionItem}>
                    <b>{tag[0]}</b>
                    {tag.length > 1 ? ` ${tag.slice(1).join(" ")}` : ""}
                  </span>
                ))}
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
