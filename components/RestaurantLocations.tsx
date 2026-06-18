"use client";

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

  return (
    <section ref={ref} className={styles.section}>
      <div className={styles.reveal}>
        <div className={styles.bg}>
          <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
        </div>
        <div className={styles.locScrim} aria-hidden />
      </div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </section>
  );
}
