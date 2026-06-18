"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./RestaurantLocations.module.css";
import ViewAllButton from "./ViewAllButton";
import VideoBackdrop from "./VideoBackdrop";

// a few restaurant clips cycle behind the View-All button
const CLIPS = [
  "/videos/bintang.mp4",
  "/videos/cafemama.mp4",
  "/videos/ramo.mp4",
  "/videos/mamasons.mp4",
];

export default function RestaurantLocations() {
  const ref = useRef<HTMLElement>(null);
  const [clip, setClip] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setClip((c) => (c + 1) % CLIPS.length),
      7000
    );
    return () => window.clearInterval(id);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // a centre curtain opens as the section scrolls in
  const clipPath = useTransform(
    scrollYProgress,
    [0.05, 0.42],
    ["inset(48% 0% 48% 0%)", "inset(0% 0% 0% 0%)"]
  );
  // slow zoom-out + vertical drift behind it for parallax depth
  const scale = useTransform(scrollYProgress, [0, 1], [1.35, 1.05]);
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section ref={ref} className={styles.section}>
      <motion.div
        className={styles.reveal}
        style={{ clipPath, WebkitClipPath: clipPath }}
      >
        <motion.div className={styles.bg} style={{ scale, y }}>
          <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
        </motion.div>
        <div className={styles.locScrim} aria-hidden />
      </motion.div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </section>
  );
}
