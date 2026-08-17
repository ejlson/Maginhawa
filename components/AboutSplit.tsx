"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./AboutSplit.module.css";
import PillCta from "./PillCta";
import { asset } from "@/lib/media";

/**
 * The group's story, as a 50/50 split — photograph left, text right.
 *
 * Laid out after the reference: heading and its call to action at the TOP
 * of the text column, a deliberate void, then the reading block low in the
 * column — a paragraph, a row of small prints, and a smaller footnote
 * paragraph under them. The picture carries its own line at bottom-left.
 */

/* WHERE THIS SITS, AND WHY IT IS ON THE HOME PAGE.
   /about already opens with a long scroll-scrubbed sequence of its own —
   "About Us" centred, the two words travelling apart, a film opening in the
   gap and growing to fill the screen. That is deliberate, hand-built work
   and this would either replace it or fight it.
   The home page, by contrast, had NO About presence at all: the AboutIntro
   chapter was removed, then the story strip's "Learn more about us" went
   with the masthead rewrite, leaving no editorial route to the group's
   story whatsoever. This fills exactly that hole. */

/* THE HEADING SAYS WHAT THE GROUP BELIEVES, not what it is.
   It read "A London family, cooking since 1987" — a label, and one whose
   two facts are both already on this screen: the masthead above says London
   and Est. 1987, and the caption on the photograph says Camden 1987. It was
   the third telling of the same thing.
   Hospitality-as-inheritance is the claim underneath the whole section, and
   it is what the paragraphs below actually elaborate. */
const HEADING = "Everything we know about hospitality, we learned at home.";

/* THE PICTURE. Third choice, and the pool is now empty.
   omar.jpg was a 16.5MB single portrait illustrating "Chef Omar" beside a
   sentence about a family. careers-team.jpg was rejected. This is the last
   unused photograph in public/images at a sane weight (221KB) — everything
   else is either a venue hero (all seven are the Discover cards, one
   chapter above), one of the ten `ourrestaurants` prints (eight in the
   story band, two in the doors below), or a multi-megabyte source.
   A FOURTH CHANGE NEEDS A NEW ASSET, or a swap out of the story band. */
const PORTRAIT = "/images/careers-hero.jpg";

/* THE PANEL IS A LOOPING CLIP NOW, with the photograph kept as its poster
   and as the reduced-motion still.

   tile-guanabana.mp4 IS 2.8MB — chosen on weight, and the choice matters
   here more than usual. public/videos holds thirteen clips from 2.5MB to
   44MB (bintang-hero), and this page already carries eight band prints and
   three doors. The `tile-*` clips are the small hover loops, which is
   exactly why they are light; the `*-hero` clips would look no better at
   this size and would cost ten to twenty times as much.
   If this ever needs to be a specific room, pick from the tile set first
   and check the weight before the content. */
/* mamasons-hero.mp4 IS 25.6MB, at the user's instruction, and that is worth
   stating plainly rather than shipping quietly: it is roughly NINE TIMES
   the clip it replaces (tile-guanabana, 2.8MB) and by far the heaviest
   thing on this page, which already carries eight band prints and three
   doors. `preload="metadata"` keeps it off the critical path — the browser
   fetches headers, not frames, until it decides to play — but a visitor who
   reaches this section on a phone connection will pay for it.
   A compressed derivative (~3–5MB at this display size) would look identical
   in a 660px frame. That is the fix if the page ever feels heavy here. */
const VIDEO = "/videos/mamasons-hero.mp4";

/* TWO LINES, DELIBERATELY. The caption was one sentence ("One room in
   Camden, 1987."); it is now a statement and its location, set larger, so
   it reads as the picture's title rather than as a note under it. The break
   is hard-coded rather than left to wrapping — the two halves are doing
   different jobs and a measure-dependent break would sometimes put "Camden"
   on the first line. */
const PORTRAIT_LINE = ["Where it began.", "Camden, 1987."];

/* THE COPY. Two paragraphs doing different jobs, which is why the second is
   set smaller and lighter (see .paraFine): the first is what the group
   believes, the second is the record that backs it. The reference does the
   same — an argument, then a quieter elaboration under the prints.
   Every fact is already on the site: the 1987 Camden kitchen and Chef Omar
   are in /about's metadata and structured data, the three kitchens are the
   site's own description. No venue count — TODOS.md item 7 still records
   "seven rooms vs eight tiles" as unreconciled. */
const PARA_LEAD =
  "We cook the food we grew up on, for people we treat like family. A table you are not hurried from, a room that is easy to be in, and a plate that tastes like somebody's home. It is the only way we have ever known how to do this, and it is the reason the same faces come back year after year.";
const PARA_FINE =
  "From one Camden kitchen in 1987 to a family of dining rooms across North London — Filipino, Filipino-Japanese and Caribbean, each with its own character — still run by the same family, and still led by Chef Omar. Every room keeps its own menu, its own regulars and its own way of doing things. What they share is the standard they are held to, and the people who set it.";

/* ══════════ THE THREE PRINTS DO SOMETHING NOW ══════════
   They were decorative. Each one is now a door into one of the three
   kitchens the paragraph beneath them names, which is the cheapest possible
   way to make a visual footnote earn its place: the copy says "Filipino,
   Filipino-Japanese and Caribbean" and the pictures immediately above it
   are those three, in that order, each linking to a room that serves it.

   ONE VENUE STANDS FOR EACH KITCHEN rather than a filtered index, because
   /restaurants has no cuisine filter to link to — building one to serve
   three thumbnails would be the tail wagging the dog. The venue chosen for
   each is the clearest example of its kitchen in lib/restaurants.ts.

   THE VISIBLE LABELS ARE GONE at the user's instruction, and that costs
   something worth stating rather than burying. Nothing about a 148px
   photograph announces that it is a link, and the label was the only
   sighted affordance these had. What is left is a hover lift and a cursor
   — both of which require the reader to already be pointing at the picture
   to discover it, and neither of which exists on touch.
   Screen-reader users are unaffected: each link still carries a real
   accessible name ("Filipino — see the restaurant"), so the target is never
   announced as a filename. The loss is purely visual discoverability. If
   these turn out to go unclicked, the label is the first thing to put back. */
const DOORS = [
  { slug: "bintang", label: "Filipino", src: "/images/ourrestaurants/print-09-web.jpg" },
  { slug: "ramo", label: "Filipino-Japanese", src: "/images/ourrestaurants/print-10-web.jpg" },
  { slug: "guanabana", label: "Caribbean", src: "/images/manifesto/group-web.jpg" },
];

/* ══════════ THE ENTRANCE ══════════
   This chapter had NO entrance at all — the only motion in the file was the
   doors' hover lift. What follows is "the frame opens, then the two titles
   answer each other", and both halves of that phrase are load-bearing.

   THE PICTURE LEADS, AND THE TYPE DOES NOT SPLIT INTO WORDS. This is the
   one decision to read before changing anything here. The chapter directly
   above is Manifesto + StoryStrip (see Experience.tsx for the order), which
   already spends the eyebrow's spring pop, the masked WORD-BY-WORD statement
   and the band's stagger wave. A third word-mask reveal in a row stops
   reading as a house grammar and starts reading as a tic — so the heading
   arrives as a SINGLE BLOCK and the caption as TWO LINE MASKS, and the
   gesture carrying the chapter is the wipe on the photograph instead.
   If someone later "upgrades" the heading to SplitWords, this is what they
   are undoing.

   THE TWO TITLES SHARE A BEAT. The stylesheet calls .mediaLine and .heading
   "a title facing a title across the split" and sets them from one shared
   --split-title-size so they cannot drift. They start together at 0.55s for
   the same reason: the facing pair is the idea, and staggering them would
   make one the caption of the other. */

// the site's shared enter curve, in the form Motion wants it. Same shape as
// --ease-entrance in globals.css, written twice because neither runtime can
// read the other's spelling (the precedent is SplitWords' EASE/EASE_CSS).
const EASE = [0.22, 1, 0.36, 1] as const;

/* REDUCED MOTION IS ONE VARIANT FOR EVERYTHING, and deliberately carries no
   delays. The house pattern is Reveal's 0.4s fade, which keeps its `delay` —
   correct there, because Reveal is one element answering for itself. Here a
   preserved stagger would replay the whole 2s choreography as a sequence of
   fades, i.e. the reader who asked for less movement still waits out the
   timing. Everything simply arrives. */
const FADE: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

/* THE RULE NO LONGER DRAWS. It used to be the chapter's curtain-up — a
   `scaleX: 0 → 1` from the left edge, first thing in the sequence — and it
   is removed at the user's instruction: the hairline simply IS there, like
   the photograph beneath it and the band's own pictures above it. The
   variant is deleted rather than left as an identity, and the element is a
   plain <div> again (a motion.div with no variants would still be a
   projection node for nothing). `transform-origin` went from .rule with it;
   see the note there. */

/* THE CAPTION'S TWO LINES, each out of its own clip.
   145% is not a round number — it is derived from the 0.3em the mask is
   padded by to protect descenders ("Where it began." has a `g`), exactly as
   SplitWords derives it. Move one and move the other.
   0.55s IS NOW A PLAIN HOLD, not a hand-off. It was timed so the words
   landed on a picture that was already ~60% uncovered, rather than riding
   the wipe's clip edge — with the picture static there is no edge to avoid,
   and the delay survives only because it still reads well: the photograph
   is simply there, and its line arrives onto it a beat later. Retune freely;
   nothing downstream depends on this number any more. */
const LINE: Variants = {
  hidden: { transform: "translateY(145%)" },
  shown: (i: number) => ({
    transform: "translateY(0%)",
    transition: { duration: 0.7, ease: EASE, delay: 0.55 + i * 0.08 },
  }),
};

/* THE HEADING RISES AS ONE BLOCK — see the note at the top of this section
   for why it is not split into words. The spring is the house rise from
   Reveal (150/19/1); opacity and blur ride tweens beside it because a
   spring on either overshoots — past 1 on opacity, past 0 on blur. */
const HEADING_V: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      y: { type: "spring", stiffness: 150, damping: 19, mass: 1, delay: 0.55 },
      opacity: { duration: 0.7, ease: EASE, delay: 0.55 },
      filter: { duration: 0.8, ease: EASE, delay: 0.55 },
    },
  },
};

/* THE PILL POPS, on the Manifesto eyebrow's spring (320/14/0.6) — the same
   visibly-springy zeta ≈ 0.5 that chapter tuned, so the page's two "a
   control arrives" moments agree.
   0.94, NOT THE EYEBROW'S 0.88. Scale reads as distance travelled by the
   element's EDGES, and this capsule is several times the eyebrow's width —
   0.88 on it is a visibly bigger jump for the same number. Opacity stays on
   a tween for the reason the eyebrow's does: a spring overshoots past 1. */
const PILL: Variants = {
  hidden: { scale: 0.94, opacity: 0 },
  shown: {
    scale: 1,
    opacity: 1,
    transition: {
      scale: { type: "spring", stiffness: 320, damping: 14, mass: 0.6, delay: 0.95 },
      opacity: { duration: 0.4, ease: EASE, delay: 0.95 },
    },
  },
};

/* ── the reading block, on its OWN trigger ──
   A DELIBERATE DEPARTURE from a single chain, and worth stating plainly.
   This section is a full screen, so a reader who has only just brought its
   top edge into view cannot see the bottom of the text column at all — a
   global t=1.15 beat would play the whole reading block off-screen and it
   would be finished and static by the time anyone reached it. It keeps its
   relative order (paragraph, prints, footnote) and starts when it is
   actually approached. */
const PARA: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/* THE PRINTS WIPE, so the footnote pictures rhyme with the photograph at
   quarter scale — the same gesture, a third of the duration.

   THE CLIP IS ON AN INNER SPAN AND THIS IS NOT TIDINESS. `clip-path` clips
   an element's ENTIRE rendering, box-shadow included, and it stays on the
   element as an inline style once the animation rests — so wiping
   .doorFrame directly would leave `inset(0% 0 0 0)` sitting there
   permanently and all three prints would silently lose --shadow-card.
   Nothing about that failure looks like an animation bug, which is why it
   is written down here. */
const DOOR_WIPE: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)" },
  shown: (i: number) => ({
    clipPath: "inset(0% 0 0 0)",
    transition: { duration: 0.6, ease: EASE, delay: 0.08 + i * 0.07 },
  }),
};

/* The frame itself fades on the same beat. Without it the reader sees an
   empty --placeholder box wearing a shadow before its picture arrives,
   which reads as a failed image rather than as a reveal. Two properties
   rather than one, against Reveal's "three ideas competing" note — but the
   fade here is preventing a pop, not adding a second gesture. */
const DOOR_IN: Variants = {
  hidden: { opacity: 0 },
  shown: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.35, ease: EASE, delay: 0.08 + i * 0.07 },
  }),
};

const PARA_FINE_V: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: 0.35 },
  },
};

export default function AboutSplit() {
  const reduce = useReducedMotion();

  /* One switch for the whole choreography. Reduced motion gets the same
     content in the same order and none of the travel. */
  const pick = (real: Variants): Variants => (reduce ? FADE : real);

  /* THE TRIGGER IS A MARGIN, NOT AN `amount`, AND THAT IS A CORRECTNESS FIX
     RATHER THAN A PREFERENCE. `amount: n` is an IntersectionObserver
     threshold — the ratio of the ELEMENT that must be visible — so on any
     element taller than 1/n viewports it can never be satisfied and the
     animation never fires, leaving everything at opacity 0 forever. This
     section is ~100svh on desktop (fine) but STACKS ON MOBILE, where it is
     several screens tall. A negative bottom margin shrinks the viewport rect
     instead and fires on any intersection at all, so it cannot deadlock at
     any height. -45% starts the chapter once its top ~45% is on screen. */
  return (
    <motion.section
      className={styles.section}
      data-nav-theme="light"
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -45% 0px" }}
    >
      {/* THE RULE THAT OPENS THE CHAPTER. Decorative, so a bare div rather
          than <hr>: an <hr> is a semantic thematic break and a screen reader
          announces it, which would double up on the heading already doing
          that job. There was a matching one at the bottom; it is removed at
          the user's instruction. */}
      {/* A PLAIN DIV, AND NO VARIANT ON IT. It used to draw itself from the
          left as the chapter opened; that is removed at the user's
          instruction, and with nothing to animate it does not need to be a
          motion element. Note that the section above is `initial="hidden"`,
          which reaches motion CHILDREN only — this element is simply
          painted, at full width, from the first frame. */}
      <div className={styles.rule} aria-hidden />
      <div className={styles.split}>
        {/* ── LEFT: the picture, and its line ── */}
        <figure className={styles.media}>
          {/* THE PICTURE IS STILL, at the user's instruction. It had a
              bottom-up clip wipe and then a wipe plus an inner drift; both
              are removed and the photograph simply IS there.

              THE WRAPPERS WENT WITH THEM rather than being left in place
              holding no animation. .mediaFrame existed only to give the
              clip an element that was not .media (so the parent's
              overflow + radius could round it), and .mediaDrift existed
              only to move the picture without moving the scrim. With
              nothing to clip and nothing to drift, both were dead nesting
              around a video, so the video and the scrim are .media's direct
              children again — byte-for-byte the structure this file had
              before any of the entrance work.

              THE REST OF THE CHAPTER STILL ANIMATES: the opening rule, the
              caption's two lines, the heading, the pill and the reading
              block. Only the photograph is exempt. */}
          {reduce ? (
            /* REDUCED MOTION GETS THE STILL, not a paused video. A <video>
               with autoplay suppressed shows its poster, which would be the
               same picture — but it would also download the clip to do it.
               Rendering the image outright means the 25.6MB never ships to a
               reader who asked for less movement. */
            <Image
              className={styles.mediaImg}
              src={PORTRAIT}
              alt="A Maginhawa Group dining room"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          ) : (
            /* DECORATIVE, so aria-hidden and no controls: it carries no
               information the text beside it does not.

               `autoPlay` IS BACK, AND IT HAD TO COME BACK WITH THE
               ANIMATION GOING. Playback was being started by the wipe's
               onAnimationComplete — deliberately, to keep a 25.6MB decode
               off the animating frames. Delete the wipe and that handler
               never fires, so the clip would sit on its poster forever and
               the panel would look like a still photograph that failed to
               load. Removing an animation is not usually a change that can
               stop a video playing; here it was.

               `muted` is not a style choice — autoplay is blocked without it
               on every browser. `playsInline` stops iOS taking it
               fullscreen. */
            <video
              className={styles.mediaVideo}
              /* the film from the CDN when one is configured; the poster
                 stays the hand-picked portrait rather than becoming a
                 rendered frame, because this one was CHOSEN — see the
                 chapter's own note on PORTRAIT */
              src={asset(VIDEO)}
              poster={asset(PORTRAIT)}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            />
          )}
          {/* THE SCRIM IS A SEPARATE ELEMENT, not a background on the
              caption, so the ramp can be taller than the text and the text
              can sit anywhere inside it. See the stylesheet for the
              worst-case contrast this guarantees. */}
          <div className={styles.mediaScrim} aria-hidden />

          {/* THE CAPTION — two lines, each rising out of its own clip.
              This is the one thing over the photograph that still moves.

              THE HARD BREAK IS STRUCTURAL NOW rather than a <br />: the two
              halves are separate masks because they have to move
              separately. `textContent` is unchanged by the swap — <br />
              never contributed to it either — and `innerText` still breaks
              between them, so nothing an AT or a copy-paste sees has moved.
              The em-dash stays aria-hidden and stays with the first line. */}
          <figcaption className={styles.mediaLine}>
            {PORTRAIT_LINE.map((line, i) => (
              <span className={styles.lineMask} key={line}>
                <motion.span
                  className={styles.lineInner}
                  variants={pick(LINE)}
                  custom={i}
                >
                  {i === 0 && (
                    <span className={styles.dash} aria-hidden>
                      —
                    </span>
                  )}
                  {line}
                </motion.span>
              </span>
            ))}
          </figcaption>
        </figure>

        {/* ── RIGHT: heading + pill high, reading block low ── */}
        <div className={styles.copy}>
          <div className={styles.lead}>
            <motion.h2 className={styles.heading} variants={pick(HEADING_V)}>
              {/* THE EM-DASH IS DECORATION AND IS HIDDEN FROM THE ACCESSIBLE
                  NAME. Left in the text it would be announced as "em dash"
                  before every reading of the heading. */}
              <span className={styles.dash} aria-hidden>
                —
              </span>
              {HEADING}
            </motion.h2>

            {/* the house action — the same control the journal head and the
                closing frame carry (components/PillCta.tsx). No seat class:
                `.lead` is a flex column at flex-start and the host is
                already fit-content.
                THE WRAPPER INHERITS THAT fit-content rather than overriding
                it: `.lead` is `align-items: flex-start`, so this div is
                shrink-to-fit like the pill it holds and `scale` therefore
                pivots on the CONTROL's centre, not on a full-width box's. */}
            <motion.div variants={pick(PILL)}>
              <PillCta href="/about">Read our story</PillCta>
            </motion.div>
          </div>

          {/* THE SECOND TRIGGER — see PARA above for why this block does not
              ride the section's chain. Its own `amount` is safe where the
              section's would not be: this is a few hundred pixels tall and
              always shorter than a viewport, so the ratio is reachable. */}
          <motion.div
            className={styles.readingBlock}
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.4 }}
          >
            <motion.p className={styles.para} variants={pick(PARA)}>
              {PARA_LEAD}
            </motion.p>

            <ul className={styles.doors}>
              {DOORS.map((d, i) => (
                <motion.li key={d.slug} variants={pick(DOOR_IN)} custom={i}>
                  <Link
                    href={`/restaurants/${d.slug}`}
                    className={styles.door}
                    aria-label={`${d.label} — see the restaurant`}
                  >
                    <span className={styles.doorFrame}>
                      <motion.span
                        className={styles.doorClip}
                        variants={pick(DOOR_WIPE)}
                        custom={i}
                      >
                        <Image
                          className={styles.doorImg}
                          src={d.src}
                          alt=""
                          fill
                          sizes="150px"
                        />
                      </motion.span>
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <motion.p className={styles.paraFine} variants={pick(PARA_FINE_V)}>
              {PARA_FINE}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
