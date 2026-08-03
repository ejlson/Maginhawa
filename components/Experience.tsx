"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";
import Nav from "./Nav";
import Menu from "./Menu";
import Hero from "./Hero";
import Manifesto from "./Manifesto";
import Discover from "./Discover";
import ChapterPin from "./ChapterPin";
import MaroonZone from "./MaroonZone";
import Interlude from "./Interlude";
import PressWall from "./PressWall";
import AboutIntro from "./AboutIntro";
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
          {/* NOT PINNED. The restaurants chapter used to be held on its last
              screen while the sheet below climbed over it — but the sheet
              below is now the statement, and covering the grid with it
              buried the rooms the reader had just been shown. The grid
              simply scrolls away, and the statement follows it as its own
              section. The chapter change moved one section down: it is the
              statement that gets held now, under the maroon About band. */}
          <Discover />
          {/* The positioning statement — what Maginhawa IS. It used to open
              the page directly under the hero; it now answers the rooms
              rather than introducing them.

              PINNED IN ITS TURN, the same grammar the restaurants chapter
              uses: the reader scrub-sets the sentence, it is held once
              complete, and the maroon About band climbs over it. That is
              also why it carries a full-viewport cream ground — see
              .section — since it is itself the sheet covering the chapter
              above. */}
          <ChapterPin>
            <Manifesto />
          </ChapterPin>
          {/* ONE maroon band under the story and the press credential — it
              is its own ground, and its own arrival */}
          <MaroonZone>
            <AboutIntro />
            <PressWall />
          </MaroonZone>
          {/* The second chapter change, and the same grammar as the first:
              the photograph HOLDS on its screen (plain sticky) and the
              journal's cream sheet climbs over it. They have to share a
              wrapper — sticky is bounded by its containing block, so the
              scope is what gives the pin something to be held through. The
              interlude carries its own maroon now that it has left the zone
              above; .pinScope's ground covers the strip between them. */}
          <div className="pinScope">
            <Interlude />
            <Blog />
          </div>
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
