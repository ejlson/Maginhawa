"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import styles from "./Blog.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import Reveal from "./Reveal";

// the track carries the eight newest stories, oldest trailing off-screen
const POOL = BLOG.slice(0, 8);

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

/* the one card anatomy every story shares — cover photo, bottom scrim,
   outlet · date micro-label above a clamped display title, hairline
   rule, then a one-line excerpt + Read More foot */
function StoryCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={`${styles.plate} ${styles.card}`}
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
      <span className={styles.cardText}>
        <span className={styles.microLabel}>
          {post.source} · {post.dateLabel}
        </span>
        <h3 className={styles.cardTitle}>{post.title}</h3>
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
 * Blog chapter on the cream page — an editorial rail: saffron-dot
 * eyebrow with a pale parenthetical standfirst at the far right (the
 * Discover head-row language), then one native scroll-snapped track of
 * the eight newest stories, all sharing a single card anatomy, with a
 * partial next card peeking past the content edge at every width. The
 * arrows ride the track edges on desktop and nudge it one card at a
 * time (they dim at the ends — no wrap-around); on touch the track
 * simply swipes. The track opts out of Lenis for horizontal gestures
 * only (data-lenis-prevent-horizontal) so sideways wheel/track-pad
 * swipes reach it natively while vertical scrolling keeps the app-wide
 * smooth glide. Blog CTA sits bottom-right.
 */
export default function Blog() {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  // edge state — each arrow dims (but stays in the tab order) once the
  // track can travel no further in its direction
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const n = POOL.length;

  // derive atStart/atEnd from the track's scroll position — scroll and
  // resize both funnel into one rAF-throttled measurement per frame
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      // 1px slack absorbs fractional scroll positions at either end
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft >= max - 1);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  // one arrow press travels one card — the first card's rendered width
  // plus the track gap; reduced motion swaps the glide for an instant
  // jump. scroll-snap settles the landing.
  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({
      left: dir * (card.offsetWidth + gap),
      behavior: reduce ? "auto" : "smooth",
    });
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
        {/* prev/next ride the track's edges, vertically centred over the
            cards (hidden on mobile, where the track swipes) */}
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev} ${styles.navEdgeLeft}${
            atStart ? ` ${styles.navDim}` : ""
          }`}
          aria-label="Previous posts"
          aria-disabled={atStart}
          onClick={() => {
            if (!atStart) nudge(-1);
          }}
        >
          <NavArrow />
        </button>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navEdgeRight}${
            atEnd ? ` ${styles.navDim}` : ""
          }`}
          aria-label="Next posts"
          aria-disabled={atEnd}
          onClick={() => {
            if (!atEnd) nudge(1);
          }}
        >
          <NavArrow />
        </button>

        {/* the track — one native scroll-snap rail of all eight stories
            at every breakpoint. data-lenis-prevent-horizontal is
            direction-aware: Lenis classifies each wheel event by its
            dominant axis, so sideways swipes bypass the smooth scroller
            and drive the rail natively, while vertical wheel over the
            track still flows through Lenis — the page glide feels
            identical here to everywhere else. Touch stays native either
            way (syncTouch is off in lib/SmoothScroll.tsx). */}
        <div
          ref={trackRef}
          className={styles.track}
          role="group"
          aria-label={`Latest stories, ${n} newest posts`}
          data-lenis-prevent-horizontal=""
        >
          {POOL.map((post) => (
            <StoryCard key={post.slug} post={post} />
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
