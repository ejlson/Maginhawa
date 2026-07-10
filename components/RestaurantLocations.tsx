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
  // and the video sits inside a sticky viewport-height wrapper. The scroll
  // story is symmetric — the video ENTERS as an inset card on the maroon
  // surface, blooms to full bleed as it pins, holds as one held "scene",
  // then shrinks back to the same card before the sticky releases. Card →
  // scene → card, so both boundaries (Careers above, Contact below) hand
  // off against maroon instead of a hard cream-to-footage cut.
  //
  // Approach range [start end → start start]: 0 when the section's top
  // enters at the viewport bottom, 1 the moment it pins to the top.
  const { scrollYProgress: approach } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  // Pin range [start start → end end]: 0 at pin, 1 when the sticky releases.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Bloom to full bleed over the approach, landing a touch early (0.9) so
  // the last pixels of inset never snap shut right at the pin boundary.
  const enter = useTransform(approach, [0.05, 0.9], [0, 1]);
  // Hold the full-bleed landing moment for the first ~18% of the pin, then
  // shrink until ~85% — motion runs nearly to the sticky release so the
  // card doesn't sit frozen and then lurch when normal scrolling resumes.
  const shrink = useTransform(scrollYProgress, [0.18, 0.85], [1, 0]);
  // The video is fully bled only while it is pinned and not yet shrinking —
  // multiplying the two ramps gives one continuous in-and-out signal.
  const expand = useTransform([enter, shrink], ([e, s]: number[]) => e * s);
  // Parallax: as the user scrolls through the pin range, the footage
  // drifts upward inside its frame. Combined with the `scale(1.2)` on
  // `.bg` in CSS, this gives ±10% of vertical travel without exposing the
  // edges of the video. Depth without moving the pinned card itself.
  const parallax = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  // Push the current --expand value straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(expand, "change", (v) => {
    ref.current?.style.setProperty("--expand", String(v));
  });
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });

  return (
    <section ref={ref} className={styles.section} id="locations">
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
