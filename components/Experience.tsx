"use client";

import { useEffect, useMemo, useState } from "react";
import Loader from "./Loader";
import Nav from "./Nav";
import Menu from "./Menu";
import Hero from "./Hero";
import Manifesto from "./Manifesto";
import AboutSplit from "./AboutSplit";
import Passage from "./Passage";
import Discover from "./Discover";
import PressWall from "./PressWall";
import Reservations from "./Reservations";
import Blog from "./Blog";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import type { HeroInsets } from "./types";

// Full-screen hero: the video panel fills the viewport edge-to-edge, so the
// loader window also grows to fill the screen (square corners at full size).
/* ── FULL BLEED, and it went to a plate and back ──
   For one pass these were 12/12/12/2 — the hero inset on the page's gutter
   with the photography radius, so it read as the same object as every
   picture below it. Reverted at the user's instruction: the opening frame
   is the one place on the page that should not look like a card on a page.
   The mechanism stays wired for the next time it is wanted.

   THEY GO THROUGH THIS OBJECT rather than straight into Hero.module.css
   because the mechanism already existed for the retired entry animation,
   which scrubbed these four values from a rounded plate to full bleed. Only
   the values changed.

   ⚠️ THEY ARE NUMBERS, NOT `var(--grid-gutter)` / `var(--radius-tile)`, and
   that is forced rather than chosen: Loader.tsx reads the same object to
   size the hole its wordmark opens into (`vp.w - 2 * insets.side`), so these
   have to be arithmetic. 12 and 2 MIRROR those two tokens — if either moves,
   move these with it. The alternative (a second source of truth in CSS and a
   getComputedStyle read in the loader) is worse than one comment. */
const HERO_INSETS: HeroInsets = { top: 0, side: 0, bottom: 0, radius: 0 };

// the full-screen intro loader plays once per session — returning to the home
// page via a client navigation shouldn't replay it (the page-transition curtain
// covers the change instead)
let introPlayed = false;

export default function Experience() {
  const [intro, setIntro] = useState(() => !introPlayed);

  useEffect(() => {
    introPlayed = true;
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  // scroll stays locked through the loader AND while the Maginhawa wordmark
  // pops up, so the user can't scroll past the hero before it has landed
  const [locked, setLocked] = useState(true);
  const insets = HERO_INSETS;

  useEffect(() => {
    if (intro) {
      setLocked(true);
      return;
    }
    // hero wordmark animates up over ~1.1s once the intro ends — hold here
    const t = setTimeout(() => setLocked(false), 1300);
    return () => clearTimeout(t);
  }, [intro]);

  useEffect(() => {
    document.body.classList.toggle("is-loading", locked);
    return () => document.body.classList.remove("is-loading");
  }, [locked]);

  const started = !intro;

  return (
    <div
      style={
        {
          "--hero-top": `${insets.top}px`,
          "--hero-side": `${insets.side}px`,
          "--hero-bottom": `${insets.bottom}px`,
          "--hero-radius": `${insets.radius}px`,
        } as React.CSSProperties
      }
    >
      <Nav
        started={started}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main data-nav-theme="light">
        <Hero started={started} />

        {/* ── THE STATIC BODY RENDERS ONCE ──
            Nothing inside this div takes props or state from Experience, but
            written inline it was re-reconciled on EVERY state flip here — and
            the flip that ends the intro re-reconciled this entire subtree in
            the same frame that unmounts the loader's full-viewport layer and
            starts the hero's entrance. Measured (rAF probe on the handoff),
            that pile-up is the intro's one long frame: 25-55ms, landing at
            the exact instant the page appears; with this memo the same
            probe's handoff frames sit inside the normal budget. The useMemo
            keeps the element's identity stable so React bails out of the
            whole subtree on the intro flip (and on menu toggles and the
            scroll unlock, for free). The children's own state, effects and
            scroll listeners are untouched — this only skips re-RENDERING
            them from here, which was always a no-op re-render. */}
        {useMemo(() => (
        <div className="afterHero">
          {/* NOTHING ON THIS PAGE IS PINNED ANY MORE.
              Two chapters used to be held on their last screen while the
              next one climbed over them — the restaurants grid, then the
              statement. Both are gone at the user's instruction ("it looks
              weird"), and the mechanism went with them: ChapterPin.tsx and
              lib/chapter.ts had no other consumer, so they are deleted
              rather than left standing unused.

              What the pin bought, for the record, was a plane change: the
              held chapter drifted a few vh while an opaque sheet passed
              over it, which read as depth. What it cost was a reader whose
              scroll appeared to stop working for a viewport and a half —
              measured before this pass, the statement's top moved 1299px
              through the document while it was being held. The page now
              scrolls at one rate the whole way down.

              The one thing the pin still forced is gone with it: the
              statement no longer needs a full-viewport opaque ground to
              cover the chapter above (see Manifesto.module.css). */}
          <Discover />
          {/* The positioning statement — what Maginhawa IS. It used to open
              the page directly under the hero; it now answers the rooms
              rather than introducing them, and simply follows them. */}
          <Manifesto />
          {/* ── THE DARK BAND IS GONE, AND WITH IT MaroonZone.

              The page ran FOUR separate dark grounds — the manifesto band,
              this zone, the interlude, and the footer — which measured
              5267px of an 8769px page. SIXTY PER CENT of the home page was
              #411613, arranged as cream → dark → cream → dark → cream →
              dark. That is not a chaptered page, it is an alternating one,
              and a reader coming down it crosses the same boundary six
              times without any of the crossings meaning anything.

              It was survivable while --maroon was a desaturated green-black.
              It is not now: the same 60% in a saturated warm red is a much
              heavier page, and the inversion stopped being a device and
              started being the dominant impression.

              ONE DARK GROUND REMAINS, at the footer, where arriving at the
              dark is the point. Everything above it is plaster, and the
              rhythm that the ground changes used to carry is now carried by
              IMAGE SCALE and WHITESPACE — the full-bleed band, then a
              two-column spread, then a tight list, then air.

              WHAT MOVED WITH IT, none of it automatic: AboutIntro and
              PressWall both re-ink from cream to maroon and their pills
              invert back (a maroon fill with a cream label, which is what
              they were before the band existed); both `data-nav-theme`
              hosts go from `dark` to `light`; and the manifesto band and
              the interlude swap their maroon backing for --placeholder,
              the tone every other frame holds while its photograph decodes.
              Neither of those two was ever visible — a picture covers both
              completely — but both counted toward the dark share and both
              flashed dark for the length of a decode.

              MaroonZone.tsx is now unreferenced. It is left in the tree
              deliberately rather than deleted: it is the only component
              that knows how to seat two chapters on one continuous ground
              without a seam, and that is worth keeping if a dark register
              ever comes back. */}
          {/* ══════════ ABOUT US IS GONE FROM THE HOME PAGE ══════════
              AboutIntro sat here — an "About Us" title over a portrait, a
              scene, two paragraphs and a "Get to Know Us" pill to /about.
              Removed at the user's instruction.

              WHY IT WAS REDUNDANT, not merely surplus. The statement one
              chapter above already says what the group is, in the group's
              own voice. /about then tells the story properly — the 1987
              Camden kitchen, Chef Omar, the seven rooms — and this section
              was a compressed retelling of that same story sitting between
              them. The page asked the reader to learn who Maginhawa is
              three times before it had shown them a single dining room.

              WHAT REPLACES IT is the other half of the same idea: the
              statement's claim, then the rooms it is making the claim
              about, under a byline that dates the group and offers the
              long version. The way through to /about survives as the
              strip's "Learn more about us" — one link where there was a
              whole chapter.

              AboutIntro.tsx IS NOT DELETED. It is the only component that
              knows the two-frame portrait/scene spread with the clip-wipe
              entrance, and /about may want that layout. Nothing imports it
              now, so it is dead code until it is either reused or removed
              deliberately — do not treat this comment as a reason to keep
              it forever.

              THE BAND THAT REPLACED IT IS NOW GONE TOO, at the user's
              instruction. StoryStrip was rendered INSIDE <Manifesto> so the
              statement and the photographs could share one full-height
              screen — the claim centred, the evidence on the bottom edge —
              because two sections cannot divide one viewport between them
              without one knowing the other's height. The chapter is one
              half now: the statement, centred in the whole screen. Like the
              component above it, StoryStrip is in the tree and imported by
              nobody; the same warning applies.

              ══════════ "FEATURED IN" IS BACK ══════════
              PressWall was removed in the same pass and is RESTORED, at the
              user's instruction, in the Interlude's old slot lower down the
              page. See the note above <PressWall /> for what that move
              costs and what it buys back. */}
          {/* THE STORY, as a 50/50 split — picture left, text right.

              IT IS HERE RATHER THAN ON /about BECAUSE /about IS TAKEN. That
              page opens with a long scroll-scrubbed sequence of its own
              (the two words travelling apart, the film opening in the gap),
              which this would have replaced rather than joined.

              It also closes a hole this page had opened: AboutIntro went,
              then the story strip's "Learn more about us" went with the
              masthead rewrite, and the home page was left with no editorial
              route to the group's story at all. This is that route. */}
          <AboutSplit />
          {/* ══════ THE JOURNAL FOLLOWS THE STORY AGAIN ══════
              It no longer follows the handover: <Passage /> has moved down
              to sit above <Reservations />, so AboutSplit runs straight into
              the journal exactly as it did before the handover was
              introduced. This comment has now outlived two neighbours —
              press stood here first, then the handover — and the parts of it
              that were about THIS seam are what keep being kept.

              ⚠️ THE REGISTER JUMP THE HANDOVER WAS BUILT TO COVER IS BACK.
              The split above closes on who the group is, present tense with
              no date on it, and this section opens on "Stories, openings,
              and ideas", where everything happened on a particular day.
              Passage was inserted precisely because those two ran into each
              other with no transition. If the register jump reads badly
              again, that is the argument the handover was won on, not a new
              problem.

              ⚠️ AND THE SEAM HAS BEEN REWRITTEN TWICE, BOTH AT THE USER'S
              INSTRUCTION. It used to have to CLEAR A MOVING PLATE:
              AboutSplit's picture descended 150px on its way out — the
              handover absorbed that, and once the handover moved, this
              chapter had to hold it off on its own (`calc(var(
              --home-gap-tight) + 150px - var(--grid-gutter))`, 336px at
              1440×900, derived after a sweep measured the plate 102px OVER
              this chapter's label).
              The picture no longer moves at all, so that term is gone; and
              the seam is now HALF a tight chapter gap with a HAIRLINE
              CENTRED IN IT — 49.5px of cream, the line, 49.5px of cream at
              1440×900. The line is what separates the two chapters now, and
              the whitespace was halved because of it. Derivation and the
              rule itself are in Blog.module.css (`--about-seam`,
              `.section::before`); the picture's side of it is the note where
              `blockY` was, in AboutSplit.tsx.

              A PHOTOGRAPH IS STILL MISSING FROM THIS RUN. The full-screen
              photo interlude that once sat between About and the journal was
              replaced by press, and press has now moved on; the journal
              inherits the gap. About-split → journal is type-under-picture
              where it used to be broken by a second full-screen image, so
              the page's picture count is still down one at its quietest
              point. (Interlude.tsx is imported by nothing and remains dead
              code with a stay of execution — see the note under PressWall.)

              THE SEAM ABOVE IS NOT 12px, AND THAT IS DELIBERATE. AboutSplit
              contributes no vertical air and expects its neighbour to own
              the gap; the interlude owned it at 12px because two photographs
              12px apart read as one band. Type 12px off a photograph's edge
              reads as a caption stuck to it, so the chapter below it keeps a
              chapter's air instead — Blog's own clamp(64px, 9vh, 132px) top,
              which is the same value press was carrying when it held this
              slot. The requirement survived the swap unchanged.

              NOTHING ON THIS PAGE IS PINNED, and the wrapper that used to
              bound the last pin went with it: the interlude's photograph
              held on its screen while the journal's sheet climbed over it,
              and `.pinScope` existed only because `position: sticky` is
              bounded by its containing block. The page scrolls at one rate
              from the hero to the footer. */}
          <Blog />
          {/* ══════ PRESS SITS BELOW THE JOURNAL NOW ══════
              Moved from directly above <Blog /> to directly below it, at the
              user's instruction.

              ⚠️ THE COMMENT ABOVE USED TO ARGUE AGAINST THIS, AND IT WAS
              ARGUING FROM A FACT THAT HAD STOPPED BEING TRUE. It said the
              slot was worth having because the marquee's scroll-linked
              deceleration — a useScroll ramping the lane's `playbackRate`
              1 → 0 across the last 35% of the section's exit — "was tuned
              for the Featured-In → Journal seam", and that moving press
              here "gets it back unchanged".

              It did not get it back. PressWall.tsx's own header is explicit:
              "WHAT DID NOT COME BACK: the SCROLL-LINKED DECELERATION … It is
              not asked for here and it is the one piece of this section that
              was expensive; it is still in git if the seam ever wants it
              again." Two files disagreed and the one describing its own
              behaviour was right. There is no scroll coupling to this seam,
              so nothing about the order was load-bearing and this move costs
              no motion at all. The stale claim is corrected here rather than
              left for someone to plan around.

              WHAT THE MOVE DOES COST is seams, and both are paid in
              PressWall.module.css rather than here:
              — ABOVE. Blog's own bottom padding is clamp(64px, 9vh, 132px),
                the SAME value press carried on top, so leaving both would
                stack ~264px of empty cream between the journal and the
                mastheads — two correct numbers summing to a wrong one, the
                trap AboutSplit.module.css keeps flagging. Press now takes 0
                on top and lets the journal own that gap.
              — BELOW. Press used to close on --grid-gutter (12px) because
                Blog's 132px top followed it and owned the air. It then took
                the chapter air itself because <Reservations /> followed and
                owns nothing. ⚠️ NEITHER IS WHO IS UNDER IT NOW: <Passage />
                is. The VALUE is unchanged and still right — a chapter's air
                under the mastheads — but it is now the TOP HALF of Passage's
                seam rather than the whole of the film's, and Passage
                subtracts it by hand rather than stacking a second break on
                it. PressWall.module.css still names Reservations in its own
                note and wants correcting; see the note above <Passage />.

              AND THE SEAM ABOVE ABOUTSPLIT SURVIVES UNTOUCHED, which is the
              one that was genuinely tuned: AboutSplit contributes no
              vertical air and expects its neighbour to own the gap, and its
              new neighbour is Blog, whose top padding is clamp(64px, 9vh,
              132px) — byte-identical to the value press was carrying. The
              photograph still gets a chapter's air under it rather than
              type stuck to its edge.

              Interlude.tsx is still not deleted and still imported by
              nothing — it remains dead code with a stay of execution,
              alongside AboutIntro and MaroonZone. */}
          <PressWall />
          {/* ══════ THE HANDOVER, AND IT NO LONGER HANDS OVER TO THE JOURNAL ══════
              Two lines of display type on an empty screen. MOVED HERE from
              between <AboutSplit /> and <Blog />, at the user's instruction.

              ⚠️ WHAT IT WAS FOR IS NOT WHAT IT IS FOR NOW, and the old
              comment is not worth keeping because every clause of it named a
              neighbour that has gone. It existed to carry a change of
              REGISTER: the story split closed on who the group is, present
              tense with no date on it, and <Blog> opened on "Stories,
              openings, and ideas", where everything happened on a particular
              day. Those two ran into each other across 48px. They now run
              into each other directly again — see the note above <Blog />,
              which inherits that seam back.

              WHAT IT CARRIES HERE IS THE TURN OUT OF THE PAGE. Above it the
              mastheads are the page's last piece of evidence — other
              people's words about the group. Below it <Reservations /> is
              the page's only transaction. The handover now sits between
              being told about the group and being asked to book it, which
              is a bigger turn than the one it was built for and the copy
              already fits it: line A concedes the group is several
              different rooms, line B answers that they hold one standard.
              That is the last thing said before a booking form.

              ⚠️ IT OWNS ONE SEAM NOW, NOT TWO, AND THAT IS THE REVERSAL.
              Its stylesheet used to subtract Blog's 36px top from its own
              bottom and take the whole chapter break on top because
              AboutSplit contributed nothing. BOTH FACTS INVERT HERE:
              — ABOVE, <PressWall /> pays. Its bottom is
                clamp(64px, 9vh, 132px) and its own note says that value
                exists because "Reservations owns nothing" — which is no
                longer who is under it. That air is now the top of this
                seam, so Passage.module.css SUBTRACTS it rather than
                stacking a second chapter break on top of it.
              — BELOW, nothing pays. <Reservations /> declares
                `margin-top: 0` and no top padding at all; it is the film and
                it starts at its own first pixel. So the bottom pad here is
                the entire cream→film seam with nothing subtracted from it.
              Move this section again and both halves of that arithmetic move
              with it — the numbers are derived in Passage.module.css and
              each one names the neighbour it was measured against.

              ⚠️ AND PressWall.module.css NOW DESCRIBES THE WRONG NEIGHBOUR.
              Its bottom-padding note is headed "BOTTOM OWNS THE WHOLE GAP
              BECAUSE RESERVATIONS OWNS NOTHING". The value is still right —
              a chapter's air under the mastheads — but the reason named is
              not, because what follows it is this section. Left unfixed,
              the next person to move either one will derive from a
              neighbour that is not there. */}
          <Passage />
          {/* No open-roles index on the cream page: hiring lives behind the
              footer's Careers link, which is where someone looking for a job
              would go anyway. */}

          {/* The page closes on the booking index, set ON the film rather
              than in its own 200svh pinned section above it — which also
              retires the film's -100svh rise-and-cover coupling. Discover
              browses all eight venues; this one transacts the four that take
              reservations. */}
          <Reservations />

          {/* No Contact block here any more — the enquiry form lives on
              /contact, and the footer's own invitation ("Got any questions?")
              carries the ask at the end of the page. */}
          {/* FAQ lives on /contact (service-desk furniture, not an editorial
              close) — the home page ends film → footer, confident and short */}
          <DarkZone>
            <Footer />
          </DarkZone>
        </div>
        ), [])}
      </main>

      {intro && <Loader insets={insets} onDone={() => setIntro(false)} />}
    </div>
  );
}
