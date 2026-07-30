"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

// the kitchens take turns behind the wordmark — each clip plays through
// to its end, then the next one starts on a clean hard cut. BOTH videos
// stay mounted and preloaded the whole time; the swap only flips
// visibility, so there's no loading gap or flash between clips.
const CLIPS = ["/videos/belly-hero.mov", "/videos/mamasons.mov"];

export default function Hero({ started }: { started: boolean }) {
  const [clip, setClip] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // depth for the cover parallax: as the cream sheet rides up over the
  // pinned hero at 1×, the wordmark drifts up at a fraction of that —
  // scroll-linked transform on one element, clamped to the first viewport
  // of travel. Reduced motion pins it.
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const titleY = useTransform(scrollY, [0, vh], [0, -vh * 0.18], {
    clamp: true,
  });

  const advance = () => {
    const next = (clip + 1) % CLIPS.length;
    const el = videoRefs.current[next];
    if (el) {
      el.currentTime = 0;
      void el.play();
    }
    setClip(next);
  };

  return (
    <section
      className={styles.hero}
      id="top"
      data-nav-theme="blend"
      data-cursor="glass"
    >
      <div className={styles.panel}>
        {CLIPS.map((src, i) => (
          <video
            key={src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            className={styles.video}
            src={src}
            autoPlay={i === 0}
            muted
            playsInline
            preload="auto"
            onEnded={i === clip ? advance : undefined}
            style={{ visibility: i === clip ? "visible" : "hidden" }}
          />
        ))}
      </div>

      <motion.div
        className={styles.titleWrap}
        style={reduce ? undefined : { y: titleY }}
      >
        <motion.span
          className={styles.titleInner}
          initial={{ transform: "translateY(110%)" }}
          animate={{ transform: started ? "translateY(0%)" : "translateY(110%)" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <svg
            className={styles.titleSvg}
            viewBox="0 0 100 15.6"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Maginhawa"
          >
            <text
              className={styles.titleText}
              x="50"
              y="14.4"
              textAnchor="middle"
              fontSize="18.5"
              textLength="100"
              lengthAdjust="spacingAndGlyphs"
            >
              MAGINHAWA
            </text>
          </svg>
        </motion.span>
      </motion.div>

      {/* the SCROLL indicator — mono-caps chrome seated above the
          wordmark's right end, arriving a beat after it. Static once
          landed: the label is a signpost, not an animation. */}
      <motion.div
        className={styles.scrollHint}
        initial={{ opacity: 0 }}
        animate={{ opacity: started ? 0.85 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 1.3 }}
        aria-hidden
      >
        <span>Scroll</span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5 L6 8 L9.5 4.5" />
        </svg>
      </motion.div>
    </section>
  );
}
