"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import styles from "./Hero.module.css";

// the kitchens take turns behind the wordmark — each clip plays through
// to its end, then the next one starts on a clean hard cut. BOTH videos
// stay mounted and preloaded the whole time; the swap only flips
// visibility, so there's no loading gap or flash between clips.
const CLIPS = ["/videos/belly-hero.mov", "/videos/mamasons.mov"];

export default function Hero({ started }: { started: boolean }) {
  const [clip, setClip] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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

      <div className={styles.titleWrap}>
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
      </div>
    </section>
  );
}
