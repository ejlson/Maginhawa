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

  // the hero is pinned (position: sticky) while the cream page slides up
  // over it — the recede itself is free. This adds the missing depth cue:
  // over the first viewport of scroll the wordmark drifts down 60px, so
  // the type falls behind at a different rate than the page above it.
  // The drift lives on .titleWrap (the mask), NOT .titleInner — the inner
  // span's transform belongs to the intro rise-in, and moving the mask
  // with the glyph means nothing ever clips mid-drift; .hero's own
  // overflow: hidden does the receding crop.
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // viewport height in state so the transform range tracks real screens;
  // 800 is only the SSR placeholder before the first client measure
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const y = useTransform(scrollY, [0, vh], [0, 60]);

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

      {/* scroll parallax rides the wrap; reduced motion keeps it planted */}
      <motion.div className={styles.titleWrap} style={reduce ? undefined : { y }}>
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
    </section>
  );
}
