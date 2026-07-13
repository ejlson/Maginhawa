"use client";

import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./WhoWeAre.module.css";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import Parallax from "./Parallax";
import MagneticButton from "./MagneticButton";
import { useRouteTransition } from "./PageTransition";
import { FEATURED_OUTLETS, HIGHLIGHT_QUOTES } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";

// Two-row marquee — alternating outlets across the rows so the strip reads
// fully even when one of the two scrolls past.
const MARQUEE_TOP = FEATURED_OUTLETS.filter((_, i) => i % 2 === 0);
const MARQUEE_BOTTOM = FEATURED_OUTLETS.filter((_, i) => i % 2 === 1);

type MarqueeItem = (typeof FEATURED_OUTLETS)[number];

// One marquee row. Items render as a logo `<img>` when an outlet has `logo`
// set in lib/press.ts; otherwise the outlet name renders as a wordmark.
function renderMarqueeRow(items: MarqueeItem[], direction: "forward" | "reverse") {
  return (
    <ul
      className={`${styles.marqueeTrack} ${direction === "forward" ? styles.trackForward : styles.trackReverse}`}
      aria-hidden={direction === "reverse" ? true : undefined}
    >
      {[...items, ...items].map((o, i) => {
        const isDuplicate = i >= items.length;
        return (
          <Fragment key={`${direction}-${i}`}>
            <li
              className={`${styles.outlet} ${o.tier === "headline" ? styles.outletHeadline : ""}`}
              aria-hidden={isDuplicate || undefined}
            >
              {o.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.logo} alt={o.name} className={styles.outletLogo} />
              ) : (
                o.name
              )}
            </li>
            <span className={styles.sep} aria-hidden />
          </Fragment>
        );
      })}
    </ul>
  );
}

// Photography — currently restaurant interiors stand in for portrait /
// lifestyle shots; swap when proper editorial photography lands.
const HERO_IMAGE = "/images/cafemama.jpg";
const CHEF_IMAGE = "/images/bintang.jpg";
const CHEF_SMALL_A = "/images/ramo.jpg";
const CHEF_SMALL_B = "/images/guanabana.jpg";
const PRESS_IMAGE = "/images/belly.jpg";

const QUOTE_INTERVAL_MS = 6400;

export default function WhoWeAre() {
  const navigate = useRouteTransition();

  // rotate through the standout press pull-quotes (shared with Press section)
  const [q, setQ] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setQ((i) => (i + 1) % HIGHLIGHT_QUOTES.length),
      QUOTE_INTERVAL_MS
    );
    return () => window.clearInterval(id);
  }, []);
  const currentQuote = HIGHLIGHT_QUOTES[q];
  const currentRestaurant = currentQuote.restaurant
    ? getRestaurant(currentQuote.restaurant)
    : undefined;

  return (
    <section className={styles.section} id="about-us">
      <div className="container">
        <div className={styles.grid}>
          {/* ---- Header row: eyebrow + stacked headline (left) / intro (right) ---- */}
          <div className={styles.headerLeft}>
            <Reveal as="span" className={styles.eyebrow}>
              (Who are We?)
            </Reveal>
            <h2 className={styles.headline}>
              <span className={styles.headlineLine}>
                <RevealText text="Who is" stagger={0.025} />
              </span>
              <span className={styles.headlineLine}>
                <RevealText text="Maginhawa Group?" stagger={0.025} delay={0.1} />
              </span>
            </h2>
          </div>
          <Reveal className={styles.intro} delay={0.12}>
            <p>
              A vibrant Filipino/pan-Asian company in the heart of London.
              Explore our diverse range of stores that embody the essence of
              tradition with a modern twist.
            </p>
          </Reveal>

          {/* ---- Wide editorial photograph ---- */}
          <Reveal className={styles.hero} delay={0.18}>
            <Parallax inset speed={0.14} ratio="10 / 3" className={styles.heroFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_IMAGE} alt="" aria-hidden />
            </Parallax>
          </Reveal>

          {/* ---- Two short body columns ---- */}
          <Reveal className={styles.body1}>
            <p>
              Born in Camden from a single family kitchen, the Maginhawa Group
              has grown into a family of restaurants bound by one idea — food
              that feels like home, wherever home is for you.
            </p>
          </Reveal>
          <Reveal className={styles.body2} delay={0.06}>
            <p>
              From Filipino fusion to Caribbean fire, each kitchen reworks
              tradition with techniques borrowed from France, Japan and the
              street stalls of Manila.
            </p>
          </Reveal>

          {/* ---- Founder block: portrait, name + copy, paired portraits ---- */}
          <Reveal className={styles.chefImage} delay={0.08}>
            <Parallax inset speed={0.18} ratio="3 / 4" className={styles.imgFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHEF_IMAGE} alt="Chef Omar at Bintang in Camden" />
            </Parallax>
          </Reveal>

          <div className={styles.chefRight}>
            <Reveal as="span" className={styles.chefEyebrow}>
              (The Chef)
            </Reveal>
            <h3 className={styles.chefName}>
              <RevealText text="Chef Omar" stagger={0.05} />
            </h3>
            <Reveal className={styles.chefBody} delay={0.08}>
              <p>
                Chef Omar grew up in his parents&apos; Camden kitchen, learning
                to cook the way most Filipino kids do — at the elbow of someone
                older, tasting as you go. He took the helm of Bintang in his
                twenties, then turned one restaurant into a family.
              </p>
              <p>
                Filipino-Japanese ramen at Ramo. Caribbean Sunday roasts at
                Guanabana. Filipino dirty ice cream at Mamasons. French-trained Filipino
                bistro plates at Belly — added to the Michelin Guide in 2026.
              </p>
              <p>
                Seven dining rooms, four cuisines, one idea — food that feels
                like home, wherever home is for you.
              </p>
            </Reveal>
          </div>

          {/* ---- Pull quote — sits beneath the chef portrait ---- */}
          <Reveal className={styles.pullQuote} delay={0.1}>
            <blockquote className={styles.pullQuoteText}>
              &ldquo;We&apos;re cooking from where we&apos;re from — and where
              we landed.&rdquo;
            </blockquote>
            <figcaption className={styles.pullQuoteCaption}>
              Chef Omar, Maginhawa Group
            </figcaption>
          </Reveal>

          {/* ---- Paired small portraits, beside the pull quote ---- */}
          <Reveal className={styles.chefSmall} delay={0.14}>
            <div className={styles.chefSmallFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHEF_SMALL_A} alt="Ramo Ramen dining room" />
            </div>
            <div className={styles.chefSmallFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHEF_SMALL_B} alt="Guanabana, Kentish Town" />
              <span className={styles.chefSmallScrim} aria-hidden />
              <div className={styles.chefSmallCta}>
                <MagneticButton
                  label="About Us"
                  theme="dark"
                  small
                  onClick={() => navigate("/about")}
                />
              </div>
            </div>
          </Reveal>

          {/* ---- Closing press credit ---- */}
          <Reveal className={styles.pressImage} delay={0.06}>
            <Parallax inset speed={0.14} ratio="1 / 1" className={styles.imgFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PRESS_IMAGE} alt="Belly in Kentish Town" />
            </Parallax>
          </Reveal>

          <figure className={styles.pressQuote}>
            <AnimatePresence mode="wait">
              <motion.div
                key={q}
                className={styles.pressQuoteRotator}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <blockquote className={styles.pressQuoteText}>
                  &ldquo;{currentQuote.quote}&rdquo;
                </blockquote>
                <figcaption className={styles.pressAttribution}>
                  <span>{currentQuote.source}</span>
                  {currentRestaurant && (
                    <>
                      <span className={styles.pressDot} aria-hidden />
                      <span>{currentRestaurant.name}</span>
                    </>
                  )}
                </figcaption>
              </motion.div>
            </AnimatePresence>

            <Reveal
              className={styles.marqueeStack}
              delay={0.12}
              aria-label="Publications that have covered Maginhawa Group"
            >
              {renderMarqueeRow(MARQUEE_TOP, "forward")}
              <span className={styles.midRule} aria-hidden />
              {renderMarqueeRow(MARQUEE_BOTTOM, "reverse")}
            </Reveal>
          </figure>
        </div>
      </div>
    </section>
  );
}
