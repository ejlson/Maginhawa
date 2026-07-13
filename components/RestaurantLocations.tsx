"use client";

import {
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
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

  // Scrollytelling: the section is intentionally taller than the viewport,
  // and the video sits inside a sticky viewport-height wrapper. Three-act
  // arc, asymmetric: the video OPENS as a small horizontal card centred
  // on the CREAM page (under the hiring ticker), EXPANDS to full screen
  // as the user scrolls the pin, holds the scene, then SETTLES to the
  // page container's width — matching the dark section's content — as it
  // hands off into Contact.
  //
  // Pin range [start start → end end]: 0 at pin, 1 when the sticky releases.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // two independent phases (entry and exit rest states differ, so one
  // expand value can't describe both): --grow takes the card to full
  // bleed over the first 40%; --settle brings full bleed down to the
  // container plate from 62%, running nearly to the release so the plate
  // never sits frozen and then lurches when normal scrolling resumes
  const grow = useTransform(scrollYProgress, [0.05, 0.4], [0, 1]);
  const settle = useTransform(scrollYProgress, [0.62, 0.95], [0, 1]);
  // Parallax: as the user scrolls through the pin range, the footage
  // drifts upward inside its frame. Combined with the `scale(1.2)` on
  // `.bg` in CSS, this gives ±10% of vertical travel without exposing the
  // edges of the video. Depth without moving the pinned card itself.
  const parallax = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  // Push the current phase values straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(grow, "change", (v) => {
    ref.current?.style.setProperty("--grow", String(v));
  });
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });

  return (
    <section
      ref={ref}
      className={styles.section}
      id="locations"
      data-nav-theme="blend"
    >
      {/* sticky viewport-height wrapper — pins to the top of the viewport
          while the section scrolls past, so the video reads as one held
          "scene" that only starts shrinking once the user has committed */}
      <div className={styles.stage}>
        <div className={styles.reveal}>
          <div className={styles.bg}>
            <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
          </div>
          <div className={styles.locScrim} aria-hidden />
        </div>

        <div className={styles.cta}>
          <ViewAllButton />
        </div>
      </div>
    </section>
  );
}
