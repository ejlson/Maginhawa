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

  // scroll-driven width expansion:
  // 0 → video inset to match the page container (same as the rest of the content)
  // 1 → video stretched edge to edge of the viewport
  // CSS does the interpolation via the --expand custom property.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const expand = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.section
      ref={ref}
      className={styles.section}
      id="locations"
      style={{ "--expand": expand } as unknown as React.CSSProperties}
    >
      <div className={styles.reveal}>
        <div className={styles.bg}>
          <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
        </div>
        <div className={styles.locScrim} aria-hidden />
      </div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </motion.section>
  );
}
