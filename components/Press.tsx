"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useState } from "react";
import Reveal from "./Reveal";
import styles from "./Press.module.css";
import { FEATURED_OUTLETS, HIGHLIGHT_QUOTES } from "@/lib/press";
import { getRestaurant, RESTAURANTS } from "@/lib/restaurants";

// Editorial press credit:
//  · rotating pull-quote, set character by character like a typewriter,
//    paired with the restaurant's photo on a layered wipe
//  · two scrolling masthead marquees beneath, drifting opposite directions

const CHAR_STAGGER = 0.03;
const TYPE_BASE_DELAY = 0.18;
const MARK_OPACITY = 0.1;

const charVariant = (delay: number) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.04, delay } },
  exit: { opacity: 0, transition: { duration: 0.22 } },
});

const markCharVariant = (delay: number) => ({
  hidden: { opacity: 0 },
  show: { opacity: MARK_OPACITY, transition: { duration: 0.04, delay } },
  exit: { opacity: 0, transition: { duration: 0.22 } },
});

const TOP_ROW = FEATURED_OUTLETS.filter((_, i) => i % 2 === 0);
const BOTTOM_ROW = FEATURED_OUTLETS.filter((_, i) => i % 2 === 1);

const INITIAL_IMAGE = (() => {
  const first = HIGHLIGHT_QUOTES[0];
  const r = first?.restaurant ? getRestaurant(first.restaurant) : undefined;
  return r?.image ?? "";
})();

export default function Press() {
  const [q, setQ] = useState(0);
  const [baseImage, setBaseImage] = useState<string>(INITIAL_IMAGE);

  useEffect(() => {
    const id = window.setInterval(
      () => setQ((i) => (i + 1) % HIGHLIGHT_QUOTES.length),
      6400
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    RESTAURANTS.forEach((r) => {
      const img = new window.Image();
      img.src = r.image;
    });
  }, []);

  const current = HIGHLIGHT_QUOTES[q];
  const restaurant = current.restaurant
    ? getRestaurant(current.restaurant)
    : undefined;
  const currentImage = restaurant?.image ?? baseImage;

  // walk the quote, assigning each character (and the surrounding marks)
  // a sequential index used to compute its reveal delay. Words are kept
  // together as wrap units so lines break at natural word boundaries.
  const typed = useMemo(() => {
    let idx = 1; // opening mark sits at idx 0
    const words = current.quote.split(/\s+/);
    const items = words.map((word, wi) => {
      const startIdx = idx;
      idx += word.length;
      if (wi < words.length - 1) idx += 1; // inter-word space
      return { word, startIdx };
    });
    return { words: items, closeIdx: idx, total: idx + 1 };
  }, [current.quote]);

  const captionDelay = TYPE_BASE_DELAY + (typed.total + 2) * CHAR_STAGGER;

  const renderRow = (
    items: typeof FEATURED_OUTLETS,
    direction: "forward" | "reverse"
  ) => (
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
              {o.name}
            </li>
            <span className={styles.sep} aria-hidden />
          </Fragment>
        );
      })}
    </ul>
  );

  return (
    <section className={styles.section} id="press" data-nav-theme="light">
      <div className="container">
        <Reveal className={styles.quoteWrap}>
          <figure className={styles.quote}>
            <div className={styles.quoteImage}>
              {baseImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.imgBase}
                  src={baseImage}
                  alt=""
                  aria-hidden
                  draggable={false}
                />
              )}
              {currentImage && (
                <motion.img
                  key={currentImage}
                  className={styles.imgTop}
                  src={currentImage}
                  alt={restaurant ? `${restaurant.name} interior` : ""}
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: "inset(0 0 0 0)" }}
                  transition={{
                    duration: 0.7,
                    delay: TYPE_BASE_DELAY,
                    ease: [0.76, 0, 0.24, 1],
                  }}
                  onAnimationComplete={() => {
                    if (currentImage !== baseImage) setBaseImage(currentImage);
                  }}
                  draggable={false}
                />
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={q}
                className={styles.quoteBody}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <blockquote className={styles.quoteText}>
                  <motion.span
                    className={styles.markInline}
                    aria-hidden
                    variants={markCharVariant(TYPE_BASE_DELAY)}
                  >
                    &ldquo;
                  </motion.span>
                  {typed.words.map((w, i) => (
                    <Fragment key={`${q}-${i}`}>
                      <span className={styles.word}>
                        {w.word.split("").map((ch, ci) => (
                          <motion.span
                            key={ci}
                            className={styles.char}
                            variants={charVariant(
                              TYPE_BASE_DELAY + (w.startIdx + ci) * CHAR_STAGGER
                            )}
                          >
                            {ch}
                          </motion.span>
                        ))}
                      </span>
                      {i < typed.words.length - 1 && " "}
                    </Fragment>
                  ))}
                  <motion.span
                    className={`${styles.markInline} ${styles.markInlineClose}`}
                    aria-hidden
                    variants={markCharVariant(
                      TYPE_BASE_DELAY + typed.closeIdx * CHAR_STAGGER
                    )}
                  >
                    &rdquo;
                  </motion.span>
                </blockquote>

                <motion.figcaption
                  className={styles.quoteSource}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: {
                      opacity: 0.78,
                      y: 0,
                      transition: {
                        duration: 0.5,
                        delay: captionDelay,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                    exit: { opacity: 0, y: -8, transition: { duration: 0.3 } },
                  }}
                >
                  <span>{current.source}</span>
                  {restaurant && (
                    <>
                      <span className={styles.restaurantPip} aria-hidden />
                      <span className={styles.restaurantName}>
                        {restaurant.name}
                      </span>
                    </>
                  )}
                </motion.figcaption>
              </motion.div>
            </AnimatePresence>
          </figure>
        </Reveal>

        <Reveal>
          <div
            className={styles.marqueeStack}
            aria-label="Publications that have covered Maginhawa Group"
          >
            {renderRow(TOP_ROW, "forward")}
            <span className={styles.midRule} aria-hidden />
            {renderRow(BOTTOM_ROW, "reverse")}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
