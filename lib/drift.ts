/* ═══════════════ THE PAGE'S ONE DRIFT ═══════════════════════════════════

   A single scroll-linked rate, shared by every block that is meant to lag
   slightly behind the page as the reader passes it. It exists because
   "consistent" is a property of the whole page and cannot be maintained by
   two components that happen to agree on a number today.

   WHO READS IT, and what each one drifts:
     · components/Blog.tsx — the journal's voice column (the mark, "Blog",
       the display sentence, the archive pill).

   ⚠️ AND IT IS DOWN TO ONE READER, SO "THE PAGE'S ONE DRIFT" IS NOW A NAME
   RATHER THAN A CLAIM. AboutSplit's reading column drifted here too until
   the user asked that it "stay in its correct place" once passed; the
   removal is documented in that file. The constants stay shared because a
   second drifting block is a plausible future and the argument above — that
   consistency cannot be maintained by two files agreeing on a number today
   — is not weakened by there being one file today.

   ⚠️ THIS IS NOT AboutSplit's HEADING FLIGHT, and the two must not be
   confused. `.lead` there travels LIFT_VH (32vh) from −LIFT to 0 across the
   chapter's approach: that is an ENTRANCE — the heading starts positioned
   in the chapter above and lands in its own layout — and it is derived from
   the geometry of that handover (see the derivation over LIFT_VH). This is
   a DRIFT: the element sits in its layout position and then lags the page
   by a few vh as it is scrolled past. Same direction, different job, and
   giving the drift the entrance's number would throw every block a third of
   a screen out of place.

   ⚠️ THE TRAVEL IS [0, +DRIFT] AND THE ROOM FOR IT IS RESERVED IN CSS.
   This went the other way for one pass — [−DRIFT, 0], landing on the seat —
   because a block ending BELOW its layout position ends outside its own
   section, and the next section is a later sibling carrying its own
   `background: var(--cream)`, so it paints straight over it. The About
   chapter's fine print was being cut mid-sentence by the journal's
   background.

   Landing fixed the crop and broke the composition: the block then sat a
   whole DRIFT above its seat for the entire time it was being read, which
   is exactly when its foot is supposed to line up with the photograph
   beside it. So the direction is back, and the fix is where it should have
   been — `.section` in AboutSplit.module.css now carries bottom padding
   greater than DRIFT, so the block travels into reserved space and never
   leaves its own box. ⚠️ THAT PADDING AND THIS NUMBER ARE COUPLED: raising
   DRIFT_VH past the padding re-opens the crop.

   10vh — 90px at a 900-tall window, and it was 6. Six was invisible: the
   range below is a whole section of scroll (~1240px in the journal), so
   54px is a 4% differential and a reader cannot see it. Ten is still slight
   in absolute terms and is roughly where a parallax starts to read.

   ⚠️ RAISING THIS COSTS AboutSplit's RISE, NOT ITS AIR. That chapter's
   reading column has a fixed lift envelope — it must lift LESS than the
   heading above it or it climbs into the underside of the lockup — so its
   approach rise was cut from 16vh to 6vh when this went to 10. The two sum
   to the same 16vh they always did; what changed is that part of the travel
   now happens while the chapter is being READ rather than all of it before
   the reader arrives. Move this number and move that one the other way. */
export const DRIFT_VH = 10;

/* THE RANGE, and it is deliberately the section's PASSAGE rather than its
   approach. `["start start", "end start"]` runs from the moment a section's
   top reaches the top of the screen to the moment its bottom does — i.e.
   exactly the stretch during which the section is the thing being read.
   An approach range (`start end → start start`) would spend the whole
   travel before the reader had arrived, which is what an entrance is for. */
/* ⚠️ NOT `as const`. framer's `offset` takes a MUTABLE array, so a readonly
   tuple is a type error at every call site — and widening it there with a
   spread would put the workaround in two files instead of the fix in one. */
export const DRIFT_OFFSET: ["start start", "end start"] = [
  "start start",
  "end start",
];

/* ⚠️ THE DRIFT NOW FINISHES EARLY, AND THAT IS A SEQUENCING DECISION.
   It ran [0.2, 1] — the whole passage — which meant it was still moving
   while the next chapter's head was arriving, because the two ranges
   coincide exactly. About is one screen tall, so its passage
   (`start start → end start`) and the journal's approach
   (`start end → start start`) are the SAME stretch of scroll: About's
   bottom is the journal's top.

   Ending at 0.5 leaves the second half of that stretch to the arrival
   below, so the reader gets one gesture at a time: the reading column
   settles, then the journal's voice appears. The 0.18 of overlap with
   ARRIVAL_SLOT is deliberate — a hard gap between two scroll-linked moves
   reads as a stall, where an overlap reads as a hand-off. */
export const DRIFT_SLOT: [number, number] = [0.15, 0.5];

/* ⚠️ EARLIER AGAIN, at the user's instruction, and this is the third
   setting: [0.58, 1] → [0.32, 0.8] → [0.15, 0.62]. The column now starts
   inking in almost as soon as the section's top clears the foot of the
   screen.

   ⚠️ IT NO LONGER WAITS FOR AboutSplit's DRIFT. DRIFT_SLOT runs [0.15, 0.5]
   over the SAME stretch of scroll (that chapter is one screen tall, so its
   bottom is this section's top), so the two now move together for most of
   their travel. They were deliberately sequenced one pass ago and that is
   being traded away for the earlier appearance — which is the right call
   only as long as "earlier" is what is wanted. If the page starts to feel
   busy through this seam, this is the number to push back to 0.32. */
/* ⚠️ AND EARLIER AT THE FRONT ONLY — [0.15, 0.62] → [0.05, 0.62]. The
   START moves and the END does not, at the user's instruction that the
   header "appear earlier": the column now begins descending as soon as the
   section's top edge clears the foot of the screen, and still lands in the
   same place at the same moment, so nothing downstream of it moves. */
export const ARRIVAL_SLOT: [number, number] = [0.14, 0.86];

/* ═══════════════ AND THE PAGE'S ONE ARRIVAL ═══════════════════════════
   The gesture AboutSplit's heading makes — sitting high, blurred and
   transparent, then descending sharp and opaque as the chapter is reached —
   is now the gesture the journal's voice column makes too, at the user's
   instruction that the two read the same.

   THREE PARTS, ONE PROGRESS. The travel runs the WHOLE approach; the fade
   and the blur clear in its first sixth. That split is the signature: the
   type becomes legible early and then keeps moving, so it reads as
   something arriving rather than something fading in on the spot.

   ⚠️ THE LIFT IS NOT AboutSplit's 32vh. That number is derived from a
   handover — its heading starts positioned in the chapter above and lands
   in its own layout, so its lift is `viewport + height − start` (see the
   derivation over LIFT_VH there). The journal has no such handover: its
   column simply arrives, and 32vh would start it 288px above its seat,
   which is further than the chapter's own top padding and would put it
   over the section above during the fade. 16vh sits inside that padding at
   every window and reads identically, because what carries the gesture is
   the blur-and-descend, not the distance. */
/* ⚠️ 16 → 11, AND IT MOVED BECAUSE THE SEAM DID. This number is a FLOOR
   on `--about-seam` in Blog.module.css: the column starts this far above
   its seat, the seat is the seam below the section's top edge, and About —
   which is an earlier sibling carrying `z-index: 1` over its own cream —
   paints straight over anything that overhangs into it. So a header that
   sits closer to the chapter above has to travel less to get there, or it
   spends the first half of its descent behind another section.

   The seam went to 0.7 × --home-gap-tight (130px at a 900-tall window) for
   "much closer"; 11vh is 99px, which keeps the 30-odd px of margin the
   pairing has always had. The gesture is unharmed — this file's own note
   says what carries it is the blur-and-descend, not the distance, and the
   page's drift reads clearly at 10. */
/* ⚠️ 11 → 16 → 7 → 12, IN TWO PASSES, AND THE LESSON IS THAT THIS SHOULD
   NEVER HAVE BEEN A TUNED NUMBER. It is a BOUND, and the bound is
   arithmetic: the head's seat under the section's top edge is
   `--about-seam − --grid-gutter`, --about-seam is --home-gap-tight, and
   the lift has to fit inside that seat with margin to spare. So

       ARRIVAL_VH × vh / 100  <  clamp(168px, 22vh, 312px) − 12px

   which is loosest in the middle of the clamp and tightest at its CEILING,
   because there the seat stops growing and the lift does not:

       vh   600   seat 156   bound 26.0vh
       vh   900   seat 186   bound 20.7vh
       vh  1418   seat 300   bound 21.2vh   ← the clamp's ceiling
       vh  2000   seat 300   bound 15.0vh
       vh  2500   seat 300   bound 12.0vh

   12vh clears every one of them. 16 — the value before the seam was cut —
   would fail above ~1950px of viewport height, which is a window that
   exists and a failure that is SILENT: the head simply spends the first
   part of its fade behind About's cream, because About is an earlier
   sibling carrying `z-index: 1`. That is the trap the paragraph above
   describes, and this is the form that stops it recurring.

   RE-DERIVE FROM THE INEQUALITY, do not re-tune by eye, if --about-seam
   moves again. */
export const ARRIVAL_VH = 12;

/* the approach: from the section's top entering the foot of the screen to
   it reaching the top. One viewport of scroll, whatever the section is. */
export const ARRIVAL_OFFSET: ["start end", "start start"] = [
  "start end",
  "start start",
];

/* the fade and the blur, as a slot of that approach — AboutSplit's HEAD_IN,
   which is where this pairing was tuned */
/* ⚠️ MEASURED INSIDE ARRIVAL_SLOT, NOT THE WHOLE RANGE. AboutSplit's own
   HEAD_IN is [0.02, 0.16] of a full approach; this is the same SHARE of the
   shorter window the arrival occupies, which is what keeps the two reading
   the same despite one being compressed. Move ARRIVAL_SLOT and move this. */
/* ⚠️ IT STARTS EARLIER AND ENDS LATER — [0.17, 0.3] → [0.06, 0.42] — and
   the two halves are answering two different things.

   THE START is the user's "earlier": the ink begins showing almost as soon
   as the approach opens instead of a sixth of the way in.

   THE END IS WHY "EARLIER" KEPT NOT LANDING, and it is worth writing down.
   The header's ink sits one seam below the section's top edge, so at the
   old end of 0.3 the section top was still 630px down a 900px window and
   the ink was at ~86% of the screen — the fade RAN TO COMPLETION in the
   reader's bottom margin, every time, and what arrived in view was a
   finished header. Making it start earlier only pushed more of it off the
   bottom. Ending at 0.42 keeps the last third of the fade and the whole of
   the blur clearing while the ink is climbing into the middle of the
   screen, which is the part a reader can actually watch.

   ⚠️ IT NO LONGER SHARES ARRIVAL_SLOT's PROPORTIONS with AboutSplit's
   HEAD_IN, which is what it was originally derived from. That derivation
   assumed both fades finished off-screen and neither was watched.

   ⚠️ [0.06, 0.42] → [0.10, 0.66] → [0.30, 0.78] → [0.18, 0.84]. THE FIRST
   THREE MOVES WERE THE SEAM; THE LAST WAS ASKED FOR DIRECTLY.
   `--about-seam` went from 130px to 214px in the same pass, and the ink
   sits one seam below the section's top edge while this progress is
   measured on that top edge — so every pixel of seam is a pixel further
   down the screen at unchanged numbers, and holding [0.06, 0.42] would have
   made a wider gap read as a LOWER header — the opposite of the
   instruction that produced both. The arithmetic, at a 900-tall
   window: the ink is at (1 − p) × 900 + seam, so

       ink on screen = (1 − p) × 900 + seam

   and with the seam now at 307px (matched to the manifesto's — see
   --about-seam in Blog.module.css) the two anchors solve to

       start  0.18  →  738 + 301 = 1039   still below the fold
       cross  0.34  →  594 + 301 =  895   the ink arriving, ~24% inked
       end    0.84  →  144 + 301 =  445   49% of the window, still climbing

   ⚠️ THE START IS DELIBERATELY BELOW THE FOLD NOW, AND THAT IS A REVERSAL.
   It was pinned to the crossing on the reasoning that a fade nobody can see
   is a wasted fade — [0.30, 0.78], solved so the first frame of ink landed
   exactly at the foot of the screen. The user asked for the header to start
   EARLIER than that, which on a 301px seam can only mean starting while it
   is still off the bottom. What it buys is that the header no longer
   arrives at zero: by the time it crosses, roughly a quarter of the fade
   has already run, so it comes into view already arriving rather than
   appearing blank and then filling. What is not spent is the rest — two
   thirds of the fade still happen on screen.

   AND THE END MOVED THE OTHER WAY, 0.78 → 0.84, for "higher up": every
   point of progress is 9px of screen, so the ink now reaches full at 49%
   of the window instead of 56%. ⚠️ IT CANNOT GO MUCH FURTHER — SWEEP_AT is
   0.88, and the head has to have landed before the plate opens under it.

   against 976 and 652 at the old pairing. Move the seam and re-solve. */
/* ⚠️ THE SEAM MOVED, SO THIS IS RE-SOLVED — [0.18, 0.84] → [0.18, 0.48].
   The head now sits 84px under the section's top edge at a 900-tall window
   rather than 307 (see --chapter-head-seat in Blog.module.css), and the
   column is lifted 7vh rather than 16, so:

       ink on screen = (1 − p) × 900 + 84 − lift(p)
       lift(p)       = 63 × (1 − (p − 0.14) / 0.72), clamped to [0, 63]

   ⚠️ THE SEAM THEN CAME BACK UP TO --home-gap-tight (186px of seat at a
   900-tall window, lift 12vh) and this window did NOT need re-solving —
   which is the useful thing to record, because it is not luck. The seat
   and the lift move together, so what the reader sees at each anchor
   barely moves with them. Re-solved at the current numbers:

       ink on screen = (1 − p) × 900 + 186 − lift(p)
       lift(p)       = 108 × (1 − (p − 0.14) / 0.72), clamped to [0, 108]

       crossing 0.087 →  the ink clears the fold in the first tenth
       start    0.18  →  738 + 186 − 102 = 822   just on screen
       end      0.48  →  468 + 186 −  57 = 597   66% of the window, still
                                                 climbing and still
                                                 descending into its seat

   For the record, the same three at the 84px seat this was written for:
   crossing 0.023, start 762, end 519.

   THE START DOES NOT MOVE, and the reason is not inertia: HEAD_AT is 0.17
   and it gates the CSS masks that actually uncover this type. A fade
   scheduled before that gate runs against a clip-path of nothing. The two
   are a pair — move one, move the other.

   THE END COMES BACK BY A THIRD OF THE RANGE because the whole argument
   for 0.84 was that the seam pushed the fade into the reader's bottom
   margin. It does not any more. 0.48 restores the signature this file
   opens with — legible early, then still moving — instead of a fade that
   was still clearing at the moment the head landed.

   ⚠️ 0.48 → 0.66, at the user's instruction that the header land HIGHER UP
   THE SCREEN, and the number is read off the render rather than picked.
   With the seam at 78px the mark sits at (1 − p) × 900 + 78, so

       0.48  →  468 + 78 = 546   65% of a 900-tall window
       0.66  →  306 + 78 = 384   43%

   THE START STILL DOES NOT MOVE, for the reason above: HEAD_AT gates the
   masks that uncover this type, so a fade scheduled ahead of it runs
   against a clip-path of nothing.

   ⚠️ AND THE OLD CEILING IS GONE WITH SWEEP_AT. It used to be "the head has
   to land before the plate opens under it", which pinned this under 0.88 of
   the same range. PLATE_AT is measured on the PLATE's own approach now, so
   there is no shared progress left to order the two by — the sequence comes
   from the layout, the voice column being above the plate on the page. That
   is why 0.66 is allowed to sit past the plate's own moment. */
export const ARRIVAL_IN: [number, number] = [0.18, 0.66];
export const ARRIVAL_BLUR = 8;

/* ═══════════════ AND THE PAGE'S ONE PARALLAX ═══════════════════════════
   The two large photographs — AboutSplit's film and the journal's lede —
   pan slightly against their own frames as the page scrolls. It is the
   quietest of the three gestures here and the only one that never stops:
   the arrival happens once, the drift happens once, this runs the whole
   time the picture is on screen.

   ⚠️ THE PAN IS BOUNDED BY THE SCALE, AND THAT IS NOT A STYLE RULE. An
   image that fills its frame exactly has nothing in reserve: translate it
   and the frame's own ground shows at the trailing edge. The overhang a
   scale S buys is (S − 1) / 2 of the height in EACH direction, so

       pan ≤ (S − 1) / 2        1.08 ⇒ 4%

   and the pan below is 3.5%, half a point inside that ceiling. ⚠️ IT IS A
   PERCENTAGE OF HEIGHT, NEVER A PIXEL COUNT: a fixed px pan is a different
   fraction of a 468px plate than of an 876px one, so it passes at one
   window and shows the frame edge at another. Raise the pan and raise the
   scale with it, or the picture will start leaking its background.

   THE RANGE IS THE WHOLE TIME THE SECTION IS IN VIEW — top entering the
   foot of the screen to bottom leaving the top — so the picture is mid-pan
   whenever it is being looked at rather than parked at one end. */
export const PARALLAX_PCT = 3.5;
export const PARALLAX_SCALE = 1.08;
export const PARALLAX_OFFSET: ["start end", "end start"] = [
  "start end",
  "end start",
];

/* ═══════════════ WHEN THE JOURNAL'S PICTURE OPENS ═══════════════════════
   ⚠️ AFTER THE ARCHIVE PILL HAS LANDED, at the user's instruction that the
   sweep happen "once the All Stories button passes the top of the latest
   blog entry image".

   THE LITERAL CROSSING CANNOT HAPPEN, WHICH IS WHY THIS IS A PROGRESS AND
   NOT A MEASUREMENT. The pill and the picture are in the same grid row on
   `align-items: start`, so they share a top edge and the pill sits a fixed
   ~269px BELOW it; the arrival only ever moves the pill DOWN toward that
   seat, never up past the picture's top. What the instruction describes is
   the moment the pill finishes arriving beside the picture's upper edge —
   so that is what this fires on.

   IT IS ARRIVAL_SLOT's END PLUS A HAIR, and it moves whenever that does.
   The head lands, and then the plate opens under it. Anything earlier and
   the two run together, which is the arrangement this replaces. */
/* ⚠️ SWEEP_AT IS RETIRED AND THE PLATE HAS ITS OWN NUMBER BELOW. It was
   0.88 of the SECTION's approach, which is only ever the right place for
   the picture while the distance from the section's top edge down to the
   picture holds still. It did not: the chapter's top padding was cut by
   224px, and the gate that had been opening the plate at 45% down the
   screen started opening it at 20% — past the middle of the window, which
   is a reveal the reader watches finish rather than start. The argument
   above is kept because the SEQUENCE it describes is still the intent; what
   is gone is expressing that sequence as a fraction of somebody else's box.

   THE SEQUENCE NOW COMES FROM THE LAYOUT. The voice column sits above the
   plate on the page, so the reader reaches it first at any spacing, and
   HEAD_AT no longer has to be hand-fitted to stay ahead of this.

   0.13, THE SAME FOLD LINE AS RAIL_AT, and for the same arithmetic: the
   approach runs from the plate's top edge at the foot of the window (p = 0)
   to that edge at the top (p = 1), so p = 0.13 puts it 87% of the way down
   — just inside the frame, with the whole 1.15s sweep still to run while
   the picture climbs. Move one of these and move the other; they are the
   page's single arrival line, shared with Discover's `start 0.92` and the
   footer's CLOSE_OFFSET. */
export const PLATE_AT = 0.13;

/* ═══════════════ AND WHEN THE HEAD'S OWN CASCADE RUNS ═══════════════════
   ⚠️ NOT AT SWEEP_AT, AND THAT SPLIT IS A FIX FOR A VISIBLE FAULT. One
   attribute used to drive both the head's cascade and the plate's sweep,
   latched at SWEEP_AT — which is a third of the approach LATER than the
   column fades in. Measured in a real browser at 1440×900:

       p=0.30   column opacity 1.00   mark clipped to nothing, pill clipped
       p=0.60   column opacity 1.00   mark clipped to nothing, pill clipped
       p=0.70   column opacity 1.00   mark 47% open, pill starting

   So for a third of the approach the reader saw the chapter's voice fully
   arrived but wearing no mark and no button, and then watched it assemble.
   The cascade has to run WITH the fade, not after it.

   This fires just before ARRIVAL_IN opens, so the mark is already sweeping
   as the column becomes legible rather than appearing empty and filling in.
   The plate keeps SWEEP_AT, which is what the user asked for: the head
   lands, then the picture opens under it.

   ⚠️ 0.16 → 0.05, TRACKING ARRIVAL_IN's NEW START. The rule is the one
   above and not the number: this sits a hair ahead of the fade, wherever
   the fade is. Move ARRIVAL_IN and move this. */
export const HEAD_AT = 0.17;

/* ═══════════════ AND WHEN THE RAIL UNDER IT OPENS ═══════════════════════
   ⚠️ MEASURED ON THE RAIL'S OWN APPROACH, NOT THE SECTION'S, which is what
   makes this a different KIND of number from HEAD_AT and SWEEP_AT above.
   Those two are positions in the journal SECTION's approach; this one is a
   position in the strip element's. The two ranges are 787px apart in the
   document at 1440×900, and one progress cannot serve both — the fault that
   forced the split, with the arithmetic, is written up over the three-gate
   block in Blog.module.css.

   0.13 IS THE FOLD, ARRIVED AT BY GEOMETRY RATHER THAN BY TASTE. The
   approach runs from the strip's top edge at the foot of the screen (p = 0)
   to that edge at the top (p = 1), so the edge sits at (1 − p) of the window
   and p = 0.13 puts it 87% of the way down — just inside the frame, with
   the whole 350ms wave still to run while the row climbs into the middle of
   the screen. It is the same instinct as Discover's `start 0.86`, and the
   two should move together if the page's arrival line is ever retuned.

   ⚠️ IT MUST STAY BELOW ABOUT 0.45. Five seats at --cascade-beat (70ms) and
   a 900ms sweep is ~1.25s of wave; at 900px/s that is 1125px of travel, and
   the rail is only 421px tall. Latching much later means the last card is
   still opening as the row leaves the top of the screen — which is the
   defect this constant exists to remove, reintroduced from the other end. */
export const RAIL_AT = 0.13;

/* ═══════════ AND THEY ARE LATCHES AGAIN, DELIBERATELY ═══════════════════
   There is no GATE_SLACK any more and this note is what is left of it.

   FOR ONE PASS BOTH TRIGGERS REVERSED, so the journal's pictures swept on
   every approach the way AboutSplit's film does — a state evaluated in both
   directions with a hysteresis band, because opening and closing on one
   threshold lets any inertial wobble out of Lenis re-trigger a 1.15s
   entrance over and over.

   THE USER OVERRULED IT: once the images have opened they must not open
   again, by scrolling back and returning or by reloading. So Blog.tsx
   latches, and the reload half is a sessionStorage key that parks the whole
   cascade at its finished state — see PLAYED_KEY there, and the
   [data-instant] block in Blog.module.css.

   WORTH KEEPING FROM THE EXPERIMENT: the two pictures were never mismatched
   in the first place. Measured down the live page at 1440×900 —

       About's film   scrollY 2220   top at 52% of the window
       the journal's  scrollY 3270   top at 54% of the window

   — same top-anchored 1.15s clip, same counter-drift overrunning it. What
   differed was only whether it happened twice. */
