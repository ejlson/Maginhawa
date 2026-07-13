"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "./AboutIntro.module.css";
import Reveal from "./Reveal";

// Cycled through the heritage-image frame on the right of the card —
// four kitchens from across the group, in the order they entered the family.
const HERITAGE_IMAGES: { src: string; alt: string }[] = [
  {
    src: "/images/bintang.jpg",
    alt: "Bintang, the original Maginhawa kitchen — Camden, 1987",
  },
  {
    src: "/images/belly.jpg",
    alt: "Belly, the group's Michelin-listed modern Filipino bistro",
  },
  {
    src: "/images/cafemama.jpg",
    alt: "Café Mama & Sons — Filipino × Japanese café",
  },
  {
    src: "/images/ramo.jpg",
    alt: "Ramo Ramen — Filipino × Japanese ramen counter",
  },
];

const CYCLE_MS = 5000;

/**
 * Portrait image frame on the right of the About Us card. Cycles through
 * the group's heritage kitchens with a clip-path wipe — the incoming photo
 * reveals top-to-bottom over the previous one, which sits underneath as a
 * base layer until the wipe lands, then updates to match. Same layered
 * technique the Discover gallery uses for its featured-tile morph.
 */
function CyclingHeritageImage() {
  const [active, setActive] = useState(0);
  const [base, setBase] = useState(0);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % HERITAGE_IMAGES.length);
      setSeq((s) => s + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <figure className={styles.anchorImage} aria-label={HERITAGE_IMAGES[active].alt}>
      {/* base layer — previous image sitting underneath while the new one wipes over */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.anchorImgLayer}
        src={HERITAGE_IMAGES[base].src}
        alt=""
        draggable={false}
      />
      {/* top layer — clip-path wipe reveals the new image right-to-left */}
      <motion.div
        key={seq}
        className={styles.anchorImgTopLayer}
        initial={{ clipPath: "inset(0% 0% 0% 100%)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{ duration: 0.9, ease: [0.77, 0, 0.175, 1] }}
        onAnimationComplete={() => setBase(active)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.anchorImgLayer}
          src={HERITAGE_IMAGES[active].src}
          alt=""
          draggable={false}
        />
      </motion.div>
    </figure>
  );
}

/**
 * Editorial "who we are" chapter that follows the Press strip.
 *
 * All content sits inside a maroon horizontal card. Cream copy carries the
 * statement; a cycling portrait image on the right hints at the family of
 * kitchens; a quiet CTA links into the full About page.
 */
export default function AboutIntro() {
  return (
    <section className={styles.section} data-nav-theme="dark">
      <Reveal className={styles.card}>
        {/* darkened video plays behind everything in the card, giving the
            maroon panel a subtle sense of motion; the scrim keeps the text
            highly legible */}
        <video
          className={styles.cardVideo}
          src="/videos/belly-hero.mov"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className={styles.cardScrim} aria-hidden />

        <div className={styles.head}>
          <span className={styles.eyebrow}>About Us</span>
          <span className={styles.headMeta}>Est. 1987 — London</span>
        </div>

        <h2 className={styles.statement}>
          <em className={styles.highlight}>Filipino at heart</em>, pan-Asian and
          Caribbean by kitchen — a family of London restaurants that carries
          deep culinary tradition with a distinctly{" "}
          <em className={styles.highlight}>modern voice</em>.
        </h2>

        <CyclingHeritageImage />

        <Link
          href="/about"
          className={styles.cta}
          aria-label="Read about Maginhawa Group"
        >
          <span className={styles.ctaLabel}>Read our story</span>
          <svg
            className={styles.ctaArrow}
            viewBox="0 0 48 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H42" />
            <path d="M38 1 L42 5 L38 9" />
          </svg>
        </Link>
      </Reveal>
    </section>
  );
}
