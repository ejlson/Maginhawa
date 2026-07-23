"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./Blog.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import Reveal from "./Reveal";

// the strip carries the eight newest stories end to end
const POOL = BLOG.slice(0, 8);

/* the one card anatomy, every breakpoint — a portrait plate with the
   caption BELOW it on the cream (no overlay, no scrim, no chip): meta
   line, two-line clamped title, decorative Read More (the whole card is
   the link) */
function StoryCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={styles.card}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={styles.plate}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.cover}
          src={post.image}
          alt=""
          draggable={false}
          loading="lazy"
        />
      </div>
      <div className={styles.caption}>
        <span className={styles.microLabel}>{post.dateLabel}</span>
        <h3 className={styles.cardTitle}>{post.title}</h3>
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
      </div>
    </a>
  );
}

/**
 * Blog chapter on the cream page — one draggable portrait strip at every
 * breakpoint: a spare head row of just the saffron-dot eyebrow with the
 * position counter beside it (no display headline — the mockup lets the
 * photography lead), then the eight newest stories in a scroll-snap strip
 * (mouse-drag on desktop, native swipe on touch), and the blog CTA in the
 * foot row. No arrows — the strip itself is the control.
 */
export default function Blog() {
  const stripRef = useRef<HTMLDivElement>(null);
  // dragging is state (it drives the data-dragging attribute); everything
  // sampled per pointer-move lives in refs so a drag never re-renders
  const [dragging, setDragging] = useState(false);
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const travel = useRef(0);
  const suppressClick = useRef(false);
  const n = POOL.length;

  // counter feed — a passive, rAF-throttled scroll listener maps
  // scrollLeft to a card index (card width + gutter = one step); the
  // step is re-measured on resize since the card width is vw-derived
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let step = 0;
    let raf = 0;
    const measure = () => {
      const first = strip.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gutter = parseFloat(getComputedStyle(strip).columnGap) || 0;
      step = first.offsetWidth + gutter;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (step > 0) {
          const i = Math.round(strip.scrollLeft / step);
          setIndex(Math.min(Math.max(i, 0), n - 1));
        }
      });
    };
    measure();
    strip.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      strip.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  // mouse drag-to-scroll via pointer capture — touch keeps the native
  // scroll physics, so only pointerType "mouse" enters the drag path
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const strip = stripRef.current;
    if (!strip) return;
    startX.current = e.clientX;
    startScrollLeft.current = strip.scrollLeft;
    travel.current = 0;
    strip.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const strip = stripRef.current;
    if (!strip) return;
    const dx = e.clientX - startX.current;
    travel.current = Math.max(travel.current, Math.abs(dx));
    strip.scrollLeft = startScrollLeft.current - dx;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const strip = stripRef.current;
    if (strip?.hasPointerCapture(e.pointerId)) {
      strip.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    // a real drag must not fire the card link it happened to end over —
    // flag the next click for suppression (6px separates click wobble
    // from intent to drag)
    if (travel.current > 6) suppressClick.current = true;
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  return (
    <section className={styles.section} id="blog" data-nav-theme="light">
      {/* spare head row — just the eyebrow with the position counter
          beside it, seated on the binding grid's column 2 */}
      <div className={styles.head}>
        <span className={styles.headLeft}>
          <span className={styles.eyebrow}>Blog</span>
          {/* which story leads the strip — fed by the scroll listener;
              the slash belongs to the pale total: "01/08" */}
          <span className={styles.counter}>
            {String(index + 1).padStart(2, "0")}
            <span className={styles.counterTotal}>
              {"/" + String(n).padStart(2, "0")}
            </span>
          </span>
        </span>
      </div>

      <Reveal>
        {/* the strip — scroll-snap owns the resting positions, the
            pointer handlers add mouse drag; data-dragging lifts the snap
            (and the grab cursor) for the duration of a drag */}
        <div
          ref={stripRef}
          className={styles.strip}
          tabIndex={0}
          role="region"
          aria-label="Latest stories"
          data-dragging={dragging || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
        >
          {POOL.map((post) => (
            <StoryCard key={post.slug} post={post} />
          ))}
        </div>
      </Reveal>

      {/* foot row — the blog CTA holds the right edge */}
      <div className={styles.foot}>
        <Link
          href="/blog"
          className={styles.footCta}
          aria-label="Read all stories"
        >
          <span className={styles.ctaLabel}>Read all stories</span>
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
