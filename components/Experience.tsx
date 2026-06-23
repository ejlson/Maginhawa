"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";
import Nav from "./Nav";
import Menu from "./Menu";
import Statement from "./Statement";
import Hero from "./Hero";
import Discover from "./Discover";
import RestaurantLocations from "./RestaurantLocations";
import WhoWeAre from "./WhoWeAre";
// import Timeline from "./Timeline";
// Press section content now lives inside WhoWeAre (rotating quote + masthead
// marquee sit alongside the "About us" press image).
// import Press from "./Press";
import Blog from "./Blog";
import Contact from "./Contact";
import FAQ from "./FAQ";
import ReviewUs from "./ReviewUs";
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
          <Statement />
          <Discover />
          <RestaurantLocations />
          <WhoWeAre />
          {/* <Timeline /> */}
          {/* Press content merged into <WhoWeAre /> */}
          <Blog />

          <DarkZone>
            <Contact />
            <FAQ />
            <ReviewUs />
            <Footer />
          </DarkZone>
        </div>
      </main>

      {intro && <Loader insets={insets} onDone={() => setIntro(false)} />}
    </div>
  );
}
