"use client";

import { useEffect, useState } from "react";
import SmoothScroll from "@/lib/SmoothScroll";
import Loader from "./Loader";
import Nav from "./Nav";
import Menu from "./Menu";
import Statement from "./Statement";
import ViewAllButton from "./ViewAllButton";
import Hero from "./Hero";
import Discover from "./Discover";
import RestaurantLocations from "./RestaurantLocations";
import WhoWeAre from "./WhoWeAre";
import News from "./News";
import Gallery from "./Gallery";
import Contact from "./Contact";
import CTAStatement from "./CTAStatement";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import type { HeroInsets } from "./types";

// Full-screen hero: the video panel fills the viewport edge-to-edge, so the
// loader window also grows to fill the screen (square corners at full size).
const HERO_INSETS: HeroInsets = { top: 0, side: 0, bottom: 0, radius: 0 };

export default function Experience() {
  const [intro, setIntro] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = HERO_INSETS;

  useEffect(() => {
    document.body.classList.toggle("is-loading", intro);
    return () => document.body.classList.remove("is-loading");
  }, [intro]);

  const started = !intro;

  return (
    <SmoothScroll>
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
            <ViewAllButton />
            <RestaurantLocations />
            <WhoWeAre />
            <News />
            <Gallery />

            <DarkZone>
              <Contact />
              <CTAStatement />
              <Footer />
            </DarkZone>
          </div>
        </main>

        {intro && <Loader insets={insets} onDone={() => setIntro(false)} />}
      </div>
    </SmoothScroll>
  );
}
