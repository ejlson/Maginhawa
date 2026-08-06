"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";
import Nav from "./Nav";
import Menu from "./Menu";
import Hero from "./Hero";
import Manifesto from "./Manifesto";
import AboutSplit from "./AboutSplit";
import Discover from "./Discover";
import PressWall from "./PressWall";
import Reservations from "./Reservations";
import Blog from "./Blog";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import type { HeroInsets } from "./types";

// Full-screen hero: the video panel fills the viewport edge-to-edge, so the
// loader window also grows to fill the screen (square corners at full size).
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

              THE BAND THAT REPLACED IT IS NOT A SIBLING HERE. StoryStrip is
              rendered INSIDE <Manifesto> so the statement and the
              photographs can share one full-height screen — the claim
              centred, the evidence on the bottom edge. Two sections cannot
              divide one viewport between them without one knowing the
              other's height, so the chapter owns both halves.

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
          {/* ══════ PRESS TAKES THE INTERLUDE'S SLOT ══════
              The full-screen photo interlude that sat here is replaced by
              the press wall, at the user's instruction. Interlude.tsx is
              NOT deleted; nothing imports it now, so it joins AboutIntro
              and MaroonZone as dead code with a stay of execution.

              WHAT THE SWAP BUYS. The marquee's scroll-linked deceleration —
              a useScroll ramping the lane animation's `playbackRate` 1 → 0
              across the last 35% of the section's exit — was tuned for the
              Featured-In → Journal seam, and this slot IS that seam: press
              sits directly above <Blog />, exactly where it used to. The
              one transition that lost its host in the removal pass gets it
              back unchanged. It also returns the home page's only display
              of third-party credibility (lib/press.ts kept feeding the
              other routes throughout, so the data never went anywhere).

              WHAT IT COSTS. A photograph. The interlude was a full-screen
              picture and press is a type chapter, so the run from the About
              split to the journal is now type → type where it used to be
              broken by an image. The page's picture count drops by one at
              its quietest point.

              THE SEAM ABOVE IS NOT 12px, AND THAT IS DELIBERATE — see
              PressWall.module.css's .section. AboutSplit contributes no
              vertical padding and expects its neighbour to own the gap; the
              interlude owned it at 12px because two photographs 12px apart
              read as one band. Type 12px off a photograph's edge reads as a
              caption stuck to it, so press keeps a chapter's air instead.

              NOTHING ON THIS PAGE IS PINNED, and the wrapper that used to
              bound the last pin went with it: the interlude's photograph
              held on its screen while the journal's sheet climbed over it,
              and `.pinScope` existed only because `position: sticky` is
              bounded by its containing block. The page scrolls at one rate
              from the hero to the footer. */}
          <PressWall />
          <Blog />
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
      </main>

      {intro && <Loader insets={insets} onDone={() => setIntro(false)} />}
    </div>
  );
}
