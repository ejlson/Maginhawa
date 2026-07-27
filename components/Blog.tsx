"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./Blog.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import Reveal from "./Reveal";

// the strip carries the eight newest stories end to end
const POOL = BLOG.slice(0, 8);

/* the one card anatomy, every breakpoint — a 3:4 plate with the caption
   BELOW it on the cream (no overlay, no scrim): quiet date line, regular-
   weight title, then WHO WROTE IT (outlet / restaurant) as the pill tag.
   No Read More affordance — the whole card is the link. */
function StoryCard({ post }: { post: BlogEntry }) {
  return (
    <a
      className={styles.card}
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
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
        <span className={styles.date}>{post.dateLabel}</span>
        <h3 className={styles.cardTitle}>{post.title}</h3>
        <span className={styles.tag}>{post.source}</span>
      </div>
    </a>
  );
}

/**
 * Blog chapter on the cream page — one draggable card strip at every
 * breakpoint: a spare head row of just the saffron-dot eyebrow with the
 * position counter beside it (no display headline — the mockup lets the
 * photography lead), then the eight newest stories in a scroll-snap strip
 * (mouse-drag on desktop, native swipe on touch), and the blog CTA in the
 * foot row. No arrows — the strip itself is the control.
 */
export default function Blog() {
  const stripRef = useRef<HTMLDivElement>(null);
  // dragging = pointer held; gliding = coasting after release. Both drive
  // data-attrs that lift scroll-snap for the gesture; dragging also sets the
  // grabbing cursor. All the per-frame physics live in refs (no re-renders).
  const [dragging, setDragging] = useState(false);
  const [gliding, setGliding] = useState(false);
  const [index, setIndex] = useState(0);
  const n = POOL.length;

  const draggingRef = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const travel = useRef(0);
  const suppressClick = useRef(false);
  const pos = useRef(0); // eased scroll position (float)
  const targetPos = useRef(0); // where the held drag wants it
  const vel = useRef(0); // px/frame at release
  const lastX = useRef(0);
  const lastT = useRef(0);
  const stepRef = useRef(1); // card + gutter width (counter + settle snap)
  const rafRef = useRef(0);
  const activeRef = useRef(false);

  // stop the physics loop on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // counter feed — a passive, rAF-throttled scroll listener maps
  // scrollLeft to a card index (card width + gutter = one step); the
  // step is re-measured on resize since the card width is vw-derived
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let raf = 0;
    const measure = () => {
      const first = strip.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gutter = parseFloat(getComputedStyle(strip).columnGap) || 0;
      stepRef.current = first.offsetWidth + gutter || 1;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const step = stepRef.current;
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

  // One frame-synced physics loop drives the whole gesture — smooth throughout
  // (Emil): an eased FOLLOW while held, then a velocity COAST with FRICTION and
  // boundary DAMPING on release, settling onto the nearest card. Writing
  // scrollLeft once per frame (not per pointer event) is what makes it glide.
  const runLoop = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    const frame = () => {
      const strip = stripRef.current;
      if (!strip) {
        activeRef.current = false;
        return;
      }
      const max = Math.max(0, strip.scrollWidth - strip.clientWidth);

      if (draggingRef.current) {
        // eased follow — responsive, but glides instead of jittering
        pos.current += (targetPos.current - pos.current) * 0.3;
        strip.scrollLeft = pos.current;
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // released → a long, smooth inertial coast; gentle friction eases the
      // velocity toward zero so it slows continuously and never yanks to a
      // stop (no snap). It settles only once the drift is imperceptible.
      pos.current += vel.current;
      vel.current *= 0.95;
      // soft boundaries — ease back in rather than hitting a wall
      if (pos.current < 0) {
        pos.current += (0 - pos.current) * 0.12;
        vel.current *= 0.4;
      } else if (pos.current > max) {
        pos.current += (max - pos.current) * 0.12;
        vel.current *= 0.4;
      }
      strip.scrollLeft = pos.current;
      // asymptotic stop — end only when the motion is sub-pixel per frame
      if (
        Math.abs(vel.current) < 0.08 &&
        pos.current > -0.5 &&
        pos.current < max + 0.5
      ) {
        activeRef.current = false;
        setGliding(false);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  // mouse drag-to-scroll via pointer capture — touch keeps native scroll, so
  // only pointerType "mouse" enters the drag path
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const strip = stripRef.current;
    if (!strip) return;
    cancelAnimationFrame(rafRef.current); // interrupt any coast, then grab
    activeRef.current = false;
    pos.current = strip.scrollLeft;
    targetPos.current = strip.scrollLeft;
    startX.current = e.clientX;
    startScroll.current = strip.scrollLeft;
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
    vel.current = 0;
    travel.current = 0;
    draggingRef.current = true;
    strip.setPointerCapture(e.pointerId);
    setDragging(true);
    setGliding(false);
    runLoop();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const strip = stripRef.current;
    if (!strip) return;
    const dx = e.clientX - startX.current;
    travel.current = Math.max(travel.current, Math.abs(dx));
    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    let t = startScroll.current - dx;
    // rubber-band past the ends (damping, not a wall)
    if (t < 0) t *= 0.4;
    else if (t > max) t = max + (t - max) * 0.4;
    targetPos.current = t;
    // sample the fling velocity (px/frame; scroll moves opposite the drag)
    const dt = e.timeStamp - lastT.current;
    if (dt > 0) {
      const v = (-(e.clientX - lastX.current) / dt) * 16;
      vel.current = Math.max(-90, Math.min(90, v));
    }
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const strip = stripRef.current;
    if (strip?.hasPointerCapture(e.pointerId)) {
      strip.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    // a real drag must not fire the card link it happened to end over —
    // flag the next click for suppression (6px separates wobble from intent)
    if (travel.current > 6) suppressClick.current = true;
    // hand off to the coast (the loop is already running from pointerdown)
    setGliding(true);
    runLoop();
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

        {/* blog CTA — rides the head row's far-right edge, inline with the
            eyebrow, above the cards */}
        <Link href="/blog" className={styles.headCta} aria-label="Read all stories">
          {/* counted index link — same quiet-utility pattern as the Discover
              head's "All restaurants (n)" */}
          <span className={styles.ctaLabel}>All stories ({BLOG.length})</span>
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
          data-gliding={gliding || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDragStart={(e) => e.preventDefault()}
          onClickCapture={onClickCapture}
        >
          {POOL.map((post) => (
            <StoryCard key={post.slug} post={post} />
          ))}
        </div>
      </Reveal>

    </section>
  );
}
