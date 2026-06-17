"use client";

import { motion } from "framer-motion";
import styles from "./Hero.module.css";

export default function Hero({ started }: { started: boolean }) {
  return (
    <section className={styles.hero} id="top" data-nav-theme="blend">
      <div className={styles.panel}>
        <video
          className={styles.video}
          src="/videos/hero-draft3.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className={styles.titleWrap}>
        <motion.span
          className={styles.titleInner}
          initial={{ y: "110%" }}
          animate={started ? { y: "0%" } : { y: "110%" }}
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
