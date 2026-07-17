"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./Blog.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import Reveal from "./Reveal";

// the carousel pages through the eight newest stories, one step at a time
const POOL = BLOG.slice(0, 8);
// one wide featured card + three portrait cards visible at once
const WINDOW = 4;

function NavArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/* featured anatomy — cover photo, bottom scrim, date + headline + one-line
   excerpt overlaid bottom-left, outlet chip bottom-right */
function FeaturedCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={`${styles.plate} ${styles.featured}`}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.cover}
        src={post.image}
        alt=""
        draggable={false}
        loading="lazy"
      />
      <span className={styles.scrim} aria-hidden />
      <span className={styles.featuredText}>
        <span className={styles.overlayMeta}>{post.dateLabel}</span>
        <h3 className={styles.featuredTitle}>{post.title}</h3>
        <span className={styles.titleRule} aria-hidden />
        <span className={styles.cardFoot}>
          <span className={styles.footExcerpt}>{post.excerpt}</span>
          <span className={styles.readMore}>
            Read More
            <svg
              viewBox="0 0 32 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M0 5 H26" />
              <path d="M22 1 L26 5 L22 9" />
            </svg>
          </span>
        </span>
      </span>
      <span className={styles.sourceChip}>{post.source}</span>
    </a>
  );
}

/* portrait anatomy — cover, scrim, saffron-dot outlet micro-label above a
   clamped title */
function PortraitCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={`${styles.plate} ${styles.portrait}`}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.cover}
        src={post.image}
        alt=""
        draggable={false}
        loading="lazy"
      />
      <span className={styles.scrim} aria-hidden />
      <span className={styles.portraitText}>
        <span className={styles.microLabel}>
          {post.source} · {post.dateLabel}
        </span>
        <h3 className={styles.portraitTitle}>{post.title}</h3>
        <span className={styles.titleRule} aria-hidden />
        <span className={styles.cardFoot}>
          <span className={styles.footExcerpt}>{post.excerpt}</span>
          <span className={styles.readMore}>
            Read More
            <svg
              viewBox="0 0 32 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M0 5 H26" />
              <path d="M22 1 L26 5 L22 9" />
            </svg>
          </span>
        </span>
      </span>
    </a>
  );
}

/**
 * Blog chapter on the cream page — an editorial carousel: saffron-dot
 * eyebrow with a pale parenthetical standfirst at the far right (the
 * Discover head-row language), then one wide featured story and three
 * portrait stories; hovering any story expands it. Below, the carousel
 * controls ride the carousel edges and the blog CTA sits bottom-right.
 * rotate the window by one through the eight newest posts (wrap-around).
 * On mobile the row becomes a swipeable scroll-snap strip of all eight.
 */
export default function Blog() {
  const [start, setStart] = useState(0);
  // which way the last arrow press moved the window — the cards slide
  // with the direction of travel (next slides in from the right,
  // previous from the left)
  const [dir, setDir] = useState(1);
  // which slot holds the wide share — the last story hovered stays
  // expanded (it does not snap back on mouse-leave)
  const [expanded, setExpanded] = useState(0);
  const reduce = useReducedMotion();
  const n = POOL.length;

  // per-layer slide + fade, staggered left→right; reduced motion swaps
  // the travel for an instant switch
  const slide = {
    enter: ({ d }: { d: number; i: number }) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: 64 * d },
    center: ({ i }: { d: number; i: number }) => ({
      opacity: 1,
      x: 0,
      transition: reduce
        ? { duration: 0 }
        : {
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1] as const,
            delay: i * 0.06,
          },
    }),
    exit: ({ d }: { d: number; i: number }) =>
      reduce
        ? { opacity: 0, transition: { duration: 0 } }
        : {
            opacity: 0,
            x: -64 * d,
            transition: { duration: 0.4, ease: [0.4, 0, 1, 1] as const },
          },
  };

  return (
    <section className={styles.section} id="blog" data-nav-theme="light">
      <div className={styles.head}>
        <span className={styles.eyebrow}>Blog</span>
        <span className={styles.hint}>
          (Stories, reviews and press from across the Maginhawa family of
          kitchens)
        </span>
      </div>

      <Reveal className={styles.carousel}>
        {/* prev/next ride the carousel's edges, vertically centred over
            the cards (hidden on mobile, where the strip swipes) */}
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev} ${styles.navEdgeLeft}`}
          aria-label="Previous posts"
          onClick={() => {
            setDir(-1);
            setStart((s) => (s - 1 + n) % n);
          }}
        >
          <NavArrow />
        </button>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navEdgeRight}`}
          aria-label="Next posts"
          onClick={() => {
            setDir(1);
            setStart((s) => (s + 1) % n);
          }}
        >
          <NavArrow />
        </button>

        {/* desktop — 4 fixed slots; each swap crossfades in place, and the
            hovered story expands via flex-grow */}
        <div
          className={styles.mediaRow}
          role="group"
          aria-label={`Latest stories, ${WINDOW} of ${n} shown`}
        >
          {Array.from({ length: WINDOW }, (_, i) => {
            const post = POOL[(start + i) % n];
            return (
              <div
                key={i}
                className={styles.slot}
                style={{ flexGrow: expanded === i ? 2.2 : 1 }}
                onMouseEnter={() => setExpanded(i)}
              >
                <AnimatePresence initial={false} custom={{ d: dir, i }}>
                  <motion.div
                    key={post.slug}
                    className={styles.slotLayer}
                    custom={{ d: dir, i }}
                    variants={slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {i === 0 ? (
                      <FeaturedCard post={post} />
                    ) : (
                      <PortraitCard post={post} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* mobile — all eight stories in a swipeable snap strip */}
        <div className={styles.strip}>
          {POOL.map((post, i) => (
            <div
              key={post.slug}
              className={i === 0 ? styles.stripFeatured : styles.stripCard}
            >
              {i === 0 ? (
                <FeaturedCard post={post} />
              ) : (
                <PortraitCard post={post} />
              )}
            </div>
          ))}
        </div>
      </Reveal>

      {/* foot row — the blog CTA, bottom-right */}
      <div className={styles.foot}>
        <Link
          href="/blog"
          className={styles.footCta}
          aria-label="See more of our blogs"
        >
          <span className={styles.ctaLabel}>Click to see more of our blogs</span>
          <svg
            className={styles.ctaArrow}
            viewBox="0 0 32 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H26" />
            <path d="M22 1 L26 5 L22 9" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
